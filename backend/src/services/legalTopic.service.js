import LegalTopic from "../models/LegalTopic.js";
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

export const deleteTopic = async (id) => LegalTopic.findByIdAndDelete(id);
