import Country from "../models/Country.js";
import LegalTopic from "../models/LegalTopic.js";
import LegalArticle from "../models/LegalArticle.js";
import { ContentStatus } from "../core/constants.js";
import { parsePagination, buildPageMeta } from "../core/pagination.js";
import { normalizeVi } from "../utils/textNormalize.js";

/*
 * Tang truy van CONG KHAI cho noi dung phap ly (B3). Khac voi cac service o
 * legalArticle.service.js/country.service.js (dung cho Admin Portal, thay
 * MOI trang thai) -- moi ham o day BAT BUOC ep filter
 * { status:'published', isCurrent:true } cho legal_articles. Bai draft/
 * pending_review/superseded lot ra day la BUG NGHIEM TRONG (CLAUDE.md Phan 4.1).
 */
const PUBLISHED_CURRENT_FILTER = { status: ContentStatus.PUBLISHED, isCurrent: true };

// Khong loc theo status: mobile can biet ca quoc gia 'coming_soon' de hien
// trang thai ro rang thay vi 404 (DoD B3 muc 12).
export const listCountries = async () => {
  const countries = await Country.find({}).sort({ status: 1, name: 1 });

  const counts = await LegalArticle.aggregate([
    { $match: PUBLISHED_CURRENT_FILTER },
    { $group: { _id: "$countryCode", total: { $sum: 1 } } },
  ]);
  const countByCode = new Map(counts.map((row) => [row._id, row.total]));

  return countries.map((country) => ({
    ...country.toObject(),
    articleCount: countByCode.get(country.code) ?? 0,
  }));
};

export const getCountry = async (code) => Country.findOne({ code: code.toUpperCase() });

export const listTopics = async (countryCode) => {
  const code = countryCode.toUpperCase();
  const [topics, counts] = await Promise.all([
    LegalTopic.find({ countryCode: code }).sort({ order: 1, label: 1 }),
    LegalArticle.aggregate([
      { $match: { ...PUBLISHED_CURRENT_FILTER, countryCode: code } },
      { $group: { _id: "$topicSlug", total: { $sum: 1 } } },
    ]),
  ]);
  const countBySlug = new Map(counts.map((row) => [row._id, row.total]));

  return topics.map((topic) => ({
    ...topic.toObject(),
    articleCount: countBySlug.get(topic.slug) ?? 0,
  }));
};

export const listArticles = async (query) => {
  const pagination = parsePagination(query);
  const filter = { ...PUBLISHED_CURRENT_FILTER, countryCode: query.country.toUpperCase() };
  if (query.topic) filter.topicSlug = query.topic;

  const [items, total] = await Promise.all([
    LegalArticle.find(filter)
      .sort({ updatedAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    LegalArticle.countDocuments(filter),
  ]);

  return { items, meta: buildPageMeta(pagination, total) };
};

const RELATED_ARTICLES_LIMIT = 4;

export const getArticle = async (countryCode, slug) => {
  const article = await LegalArticle.findOne({
    ...PUBLISHED_CURRENT_FILTER,
    countryCode: countryCode.toUpperCase(),
    slug: slug.toLowerCase(),
  });

  if (!article) return null;

  const relatedArticles = await LegalArticle.find({
    ...PUBLISHED_CURRENT_FILTER,
    countryCode: article.countryCode,
    topicSlug: article.topicSlug,
    _id: { $ne: article._id },
  })
    .sort({ updatedAt: -1 })
    .limit(RELATED_ARTICLES_LIMIT)
    .select("countryCode slug title summaryVi topicSlug");

  return { article, relatedArticles };
};

/*
 * Tim khong dau bang $regex tren titleNorm/summaryNorm (xem
 * utils/textNormalize.js va LegalArticle.js#pre('save')). DIEM THAY THE cho
 * B4: khi legal_chunks + Atlas Search san sang, chi can doi PHAN THAN cua ham
 * nay sang goi AtlasSearchDriver -- chu ky ham va shape SearchHit tra ve GIU
 * NGUYEN, controller/route/mobile khong phai sua (CLAUDE.md Phan 4.1 muc 5).
 */
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const searchArticles = async (query) => {
  const pagination = parsePagination(query);
  // Tach theo tung tu, MOI tu phai xuat hien o titleNorm hoac summaryNorm
  // (khong nhat thiet lien tiep) -- "phat vape" van khop "Muc phat ... vape"
  // du hai tu cach nhau boi cac tu khac.
  const words = normalizeVi(query.q)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => new RegExp(escapeRegex(word), "i"));

  const filter = {
    ...PUBLISHED_CURRENT_FILTER,
    countryCode: query.country.toUpperCase(),
    $and: words.map((word) => ({ $or: [{ titleNorm: word }, { summaryNorm: word }] })),
  };
  if (query.topic) filter.topicSlug = query.topic;

  const [items, total, topics] = await Promise.all([
    LegalArticle.find(filter)
      .sort({ updatedAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .select("countryCode slug title summaryVi topicSlug sources"),
    LegalArticle.countDocuments(filter),
    LegalTopic.find({ countryCode: query.country.toUpperCase() }).select("slug label"),
  ]);

  const topicLabelBySlug = new Map(topics.map((t) => [t.slug, t.label]));

  const hits = items.map((article) => ({
    id: article._id.toString(),
    countryCode: article.countryCode,
    slug: article.slug,
    title: article.title,
    summaryVi: article.summaryVi,
    topicSlug: article.topicSlug,
    topicLabel: topicLabelBySlug.get(article.topicSlug) ?? "",
    sourceAgency: article.sources?.[0]?.authority ?? "",
  }));

  return { items: hits, meta: buildPageMeta(pagination, total) };
};
