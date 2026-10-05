import LegalArticle from "../models/LegalArticle.js";
import LegalTopic from "../models/LegalTopic.js";
import { AppError, ErrorCode } from "../core/errors.js";
import { ContentStatus, JobName } from "../core/constants.js";
import { parsePagination, buildPageMeta } from "../core/pagination.js";
import { enqueueJob } from "./job.service.js";

// Cac field duoc phep sao chep khi tao version moi -- liet ke tuong minh thay
// vi spread toan bo document, de khong bao gio vo tinh chep _id/timestamps/__v.
const CLONABLE_FIELDS = [
  "countryCode",
  "topicSlug",
  "slug",
  "title",
  "summaryVi",
  "keyPoints",
  "penalties",
  "exceptions",
  "foreignerNotes",
  "bodyMd",
  "sources",
  "effectiveFrom",
  "effectiveTo",
  "riskLevel",
  "tags",
];

export const listArticles = async (query) => {
  const pagination = parsePagination(query);
  const filter = {};

  if (query.countryCode) filter.countryCode = query.countryCode;
  if (query.topicSlug) filter.topicSlug = query.topicSlug;
  if (query.status) filter.status = query.status;
  if (query.search) filter.$text = { $search: query.search };

  const [items, total] = await Promise.all([
    LegalArticle.find(filter).sort({ updatedAt: -1 }).skip(pagination.skip).limit(pagination.limit),
    LegalArticle.countDocuments(filter),
  ]);

  return { items, meta: buildPageMeta(pagination, total) };
};

export const getArticleById = async (id) => LegalArticle.findById(id);

export const createArticle = async (data, actorId) =>
  LegalArticle.create({
    ...data,
    version: 1,
    isCurrent: true,
    status: ContentStatus.DRAFT,
    createdBy: actorId,
    updatedBy: actorId,
  });

/*
 * [!] Chong ghi de: client gui kem `updatedAt` cua ban dang xem. Khac voi
 * updatedAt hien luu trong DB nghia la co nguoi khac da sua giua luc -- tra
 * CONFLICT kem thong tin ai sua, khong am tham ghi de (nhap lieu la cong suc
 * ton nhat du an, mat bai vi ghi de la thiet hai that -- xem CLAUDE.md B2).
 */
export const updateArticle = async (id, data, actorId) => {
  const { updatedAt: clientUpdatedAt, ...fields } = data;
  const article = await LegalArticle.findById(id);

  if (!article) {
    throw new AppError(ErrorCode.NOT_FOUND, "Không tìm thấy bài luật");
  }

  const isStale = article.updatedAt.getTime() !== new Date(clientUpdatedAt).getTime();

  if (isStale) {
    throw new AppError(
      ErrorCode.CONFLICT,
      "Bài đã bị người khác sửa trong lúc bạn đang chỉnh. Tải lại để lấy bản mới nhất.",
      { updatedBy: article.updatedBy, updatedAt: article.updatedAt },
    );
  }

  if (![ContentStatus.DRAFT, ContentStatus.PENDING_REVIEW].includes(article.status)) {
    throw new AppError(
      ErrorCode.CONFLICT,
      "Hãy tạo phiên bản nháp mới trước khi sửa bài đã xuất bản",
    );
  }
  if (
    (fields.countryCode && fields.countryCode !== article.countryCode) ||
    (fields.slug && fields.slug !== article.slug)
  ) {
    throw new AppError(
      ErrorCode.CONFLICT,
      "Không đổi quốc gia hoặc slug của một phiên bản bài luật",
    );
  }
  // Điều kiện đi cùng lệnh UPDATE, không chỉ so sánh bản đọc trước đó.
  article.$where = { updatedAt: new Date(clientUpdatedAt) };
  Object.assign(article, fields);
  article.updatedBy = actorId;
  await article.save();

  return article;
};

export const createNewVersion = async (id, actorId) => {
  const current = await LegalArticle.findById(id);

  if (!current) {
    throw new AppError(ErrorCode.NOT_FOUND, "Không tìm thấy bài luật");
  }

  const latest = await LegalArticle.findOne({
    countryCode: current.countryCode,
    slug: current.slug,
  })
    .sort({ version: -1 })
    .select("version");

  const nextVersion = (latest?.version ?? current.version) + 1;
  const clonedFields = Object.fromEntries(CLONABLE_FIELDS.map((field) => [field, current[field]]));

  return LegalArticle.create({
    ...clonedFields,
    version: nextVersion,
    // Ban nhap MOI KHONG duoc isCurrent ngay -- chi tro thanh current luc publish
    // (xem changeArticleStatus). Neu dat true ngay se dung partial unique index
    // vi ban dang published van con isCurrent:true.
    isCurrent: false,
    status: ContentStatus.DRAFT,
    supersedesId: current._id,
    createdBy: actorId,
    updatedBy: actorId,
  });
};

/*
 * Dieu kien cung de duoc 'published' (validate o BACKEND, khong chi an nut
 * phia admin UI) -- theo CLAUDE.md B.10: >=1 source du url+authority+publishedAt,
 * summaryVi khong rong, effectiveFrom co gia tri, topicSlug ton tai.
 */
const findMissingPublishFields = (article) => {
  const missing = [];

  const hasCompleteSource = (article.sources ?? []).some(
    (source) => source.url && source.authority && source.publishedAt,
  );
  if (!hasCompleteSource) {
    missing.push({
      path: "sources",
      message: "Cần ít nhất 1 nguồn đủ url, authority, publishedAt",
    });
  }

  if (!article.summaryVi || !article.summaryVi.trim()) {
    missing.push({ path: "summaryVi", message: "Tóm tắt (summaryVi) không được để trống" });
  }

  if (!article.effectiveFrom) {
    missing.push({ path: "effectiveFrom", message: "Cần có ngày hiệu lực (effectiveFrom)" });
  }

  return missing;
};

/*
 * [!] May trang thai noi dung: draft -> pending_review -> published -> superseded/archived.
 * Publish version N: isCurrent=true cho N; moi version khac cua cung
 * (countryCode,slug) dang isCurrent=true bi chuyen isCurrent=false +
 * status='superseded'. Publish --> enqueue 'reindex_article'.
 * Roi khoi 'published' (unpublish/supersede) --> enqueue 'purge_chunks' cho
 * CHINH bai do va cho moi ban bi supersede trong cung luot publish.
 */
const NEXT_STATUS = Object.freeze({
  draft: [ContentStatus.PENDING_REVIEW],
  pending_review: [ContentStatus.DRAFT, ContentStatus.PUBLISHED],
  published: [ContentStatus.ARCHIVED],
  superseded: [ContentStatus.ARCHIVED],
  archived: [ContentStatus.DRAFT],
});

export const changeArticleStatus = async (id, { status: nextStatus, note }, actorId) => {
  // Both the content changes and queue entries commit or roll back together.
  // Atlas replica sets support this; standalone Mongo must be upgraded first.
  await LegalArticle.init();
  return LegalArticle.db.transaction(async (session) => {
    const article = await LegalArticle.findById(id).session(session);
    if (!article) throw new AppError(ErrorCode.NOT_FOUND, "Không tìm thấy bài luật");
    const previousStatus = article.status;
    if (!NEXT_STATUS[previousStatus]?.includes(nextStatus)) {
      throw new AppError(
        ErrorCode.CONFLICT,
        "Bước chuyển trạng thái không hợp lệ; hãy gửi duyệt trước khi xuất bản",
      );
    }
    const isPublishing = nextStatus === ContentStatus.PUBLISHED;
    if (isPublishing) {
      const missingFields = findMissingPublishFields(article);
      const topicExists = await LegalTopic.exists({
        countryCode: article.countryCode,
        slug: article.topicSlug,
      }).session(session);
      if (!topicExists) missingFields.push({ path: "topicSlug", message: "Chủ đề không tồn tại" });
      if (missingFields.length)
        throw new AppError(ErrorCode.CONFLICT, "Bài chưa đủ điều kiện để xuất bản", missingFields);
      const siblings = await LegalArticle.find({
        countryCode: article.countryCode,
        slug: article.slug,
        isCurrent: true,
        _id: { $ne: article._id },
      })
        .select("_id")
        .session(session);
      await LegalArticle.updateMany(
        { _id: { $in: siblings.map((doc) => doc._id) } },
        { $set: { isCurrent: false, status: ContentStatus.SUPERSEDED } },
        { session },
      );
      for (const sibling of siblings)
        await enqueueJob(JobName.PURGE_CHUNKS, { articleId: sibling._id.toString() }, session);
    }
    article.isCurrent = isPublishing;
    article.status = nextStatus;
    article.reviewedBy = actorId;
    article.reviewedAt = new Date();
    if (note !== undefined) article.reviewNote = note;
    await article.save({ session });
    if (isPublishing || previousStatus === ContentStatus.PUBLISHED) {
      await enqueueJob(
        isPublishing ? JobName.REINDEX_ARTICLE : JobName.PURGE_CHUNKS,
        { articleId: article._id.toString() },
        session,
      );
    }
    return article;
  });
};
