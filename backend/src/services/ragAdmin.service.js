import LegalArticle from "../models/LegalArticle.js";
import Job from "../models/Job.js";
import { enqueueJob } from "./job.service.js";
import { JobName, JobStatus, ContentStatus } from "../core/constants.js";
import { AppError, ErrorCode } from "../core/errors.js";
import { AU_LAW_TOPICS, isCuratedTitle } from "../core/auLawTopics.js";
import { getTitleName } from "./australiaLegislation.service.js";
import { listIndexedAuLaws, purgeAuLaw } from "./auLawIndex.service.js";

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

// ── Luật liên bang Úc trong RAG ────────────────────────────────────────────

const ACTIVE_JOB_STATUSES = [JobStatus.PENDING, JobStatus.RUNNING];

// Tên luật tra từ nguồn (có cache); nguồn lỗi thì để null, màn hình vẫn hiện mã luật.
const lawNameOrNull = async (titleId) => {
  try {
    return await getTitleName(titleId);
  } catch {
    return null;
  }
};

const latestJobByTitle = async (titleIds) => {
  const jobs = await Job.find({ name: JobName.INDEX_AU_LAW, "payload.titleId": { $in: titleIds } })
    .sort({ createdAt: -1 })
    .select("status payload lastError createdAt")
    .lean();
  const latest = new Map();
  for (const job of jobs) {
    if (!latest.has(job.payload.titleId)) latest.set(job.payload.titleId, job);
  }
  return latest;
};

/*
 * Danh sách luật Úc tuyển chọn kèm trạng thái index (số chunk, mã bản biên soạn, model embedding)
 * và job index gần nhất, để Admin thấy luật nào đã vào RAG và job nào đang chạy hoặc lỗi.
 */
export const listAuLaws = async () => {
  const topicsByTitle = new Map();
  for (const topic of AU_LAW_TOPICS) {
    for (const titleId of topic.titleIds) {
      topicsByTitle.set(titleId, [...(topicsByTitle.get(titleId) ?? []), topic.slug]);
    }
  }
  const titleIds = [...topicsByTitle.keys()];
  const [indexed, jobs, names] = await Promise.all([
    listIndexedAuLaws(),
    latestJobByTitle(titleIds),
    Promise.all(titleIds.map(lawNameOrNull)),
  ]);
  const indexedById = new Map(indexed.map((row) => [row.titleId, row]));

  return titleIds.map((titleId, position) => {
    const row = indexedById.get(titleId);
    const job = jobs.get(titleId);
    return {
      titleId,
      name: names[position],
      topics: topicsByTitle.get(titleId),
      index: row
        ? { chunks: row.chunks, registerId: row.registerId, embeddingModel: row.embeddingModel }
        : null,
      job: job
        ? { status: job.status, lastError: job.lastError || null, createdAt: job.createdAt }
        : null,
    };
  });
};

// Xếp job index cho các luật đã tuyển chọn; bỏ qua luật đang có job chờ/chạy để không chạy trùng.
export const enqueueAuLawIndex = async (titleIds) => {
  const uniqueIds = [...new Set(titleIds)];
  const notCurated = uniqueIds.filter((titleId) => !isCuratedTitle(titleId));
  if (notCurated.length > 0) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      `Không thuộc danh sách tuyển chọn: ${notCurated.join(", ")}`,
    );
  }
  const active = await Job.find({
    name: JobName.INDEX_AU_LAW,
    status: { $in: ACTIVE_JOB_STATUSES },
    "payload.titleId": { $in: uniqueIds },
  })
    .select("payload")
    .lean();
  const activeIds = new Set(active.map((job) => job.payload.titleId));
  const toQueue = uniqueIds.filter((titleId) => !activeIds.has(titleId));
  await Promise.all(toQueue.map((titleId) => enqueueJob(JobName.INDEX_AU_LAW, { titleId })));
  return { queued: toQueue, skipped: [...activeIds] };
};

export const removeAuLaw = async (titleId) => {
  if (!isCuratedTitle(titleId)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Luật không thuộc danh sách tuyển chọn.");
  }
  return purgeAuLaw(titleId);
};
