import LegalArticle from "../models/LegalArticle.js";
import { enqueueJob } from "./job.service.js";
import { JobName, ContentStatus } from "../core/constants.js";

// Xep lai job reindex cho TOAN BO bai dang published+isCurrent cua 1 quoc gia
// -- dung khi doi embedding model hoac nghi ngo index lech du lieu (man hinh
// admin A04 RAG Index).
export const reindexCountry = async (countryCode) => {
  const articles = await LegalArticle.find({
    countryCode,
    status: ContentStatus.PUBLISHED,
    isCurrent: true,
  }).select("_id");

  await Promise.all(
    articles.map((a) => enqueueJob(JobName.REINDEX_ARTICLE, { articleId: a._id.toString() })),
  );

  return { queued: articles.length };
};

export const getStatus = async (countryCode) => {
  const filter = {
    status: ContentStatus.PUBLISHED,
    isCurrent: true,
    ...(countryCode ? { countryCode } : {}),
  };

  return LegalArticle.find(filter)
    .select("title slug countryCode topicSlug indexState updatedAt")
    .sort({ countryCode: 1, slug: 1 })
    .lean();
};
