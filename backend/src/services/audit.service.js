import AuditLog from "../models/AuditLog.js";
import { parsePagination, buildPageMeta } from "../core/pagination.js";

export const listAuditLogs = async (query) => {
  const pagination = parsePagination(query);
  const filter = {};

  if (query.entityType) filter.entityType = query.entityType;
  if (query.actorId) filter.actorId = query.actorId;
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = query.from;
    if (query.to) filter.createdAt.$lte = query.to;
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(pagination.skip).limit(pagination.limit),
    AuditLog.countDocuments(filter),
  ]);

  return { items, meta: buildPageMeta(pagination, total) };
};
