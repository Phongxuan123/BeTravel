import LegalTopic from "../models/LegalTopic.js";
import LegalArticle from "../models/LegalArticle.js";
import { AppError, ErrorCode } from "../core/errors.js";
import { parsePagination, buildPageMeta } from "../core/pagination.js";

export const listTopics = async (query) => {
  const pagination = parsePagination(query);
  const filter = query.countryCode ? { countryCode: query.countryCode } : {};

  const [items, total] = await Promise.all([
    LegalTopic.find(filter)
      .sort({ order: 1, label: 1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    LegalTopic.countDocuments(filter),
  ]);

  return { items, meta: buildPageMeta(pagination, total) };
};

export const getTopicById = async (id) => LegalTopic.findById(id);

export const createTopic = async (data, actorId) =>
  LegalTopic.create({ ...data, createdBy: actorId, updatedBy: actorId });

export const updateTopic = async (id, data, actorId) =>
  LegalTopic.findByIdAndUpdate(id, { ...data, updatedBy: actorId }, { returnDocument: "after" });

// Xoa chu de con bai tham chieu se de bai "mo coi" topicSlug -- admin phai
// chuyen bai sang chu de khac truoc (INV-04.10, docs/07_QA_BugHunt.md).
export const deleteTopic = async (id) => {
  const topic = await LegalTopic.findById(id);
  if (!topic) return null;

  const isReferenced = await LegalArticle.exists({
    countryCode: topic.countryCode,
    topicSlug: topic.slug,
  });
  if (isReferenced) {
    throw new AppError(ErrorCode.CONFLICT, "Chủ đề đang có bài luật, không thể xóa");
  }

  return LegalTopic.findByIdAndDelete(id);
};
