import AiEvent from "../models/AiEvent.js";
import { countPendingFeedback } from "./feedback.service.js";

const DEFAULT_DAYS = 7;
const TOP_FALLBACK_LIMIT = 10;

/*
 * So lieu A01 Dashboard (B5) -- toan bo tu ai_events, KHONG mock. Day la nguon
 * su that ve moi lan RAG thuc su chay (ca khi fallback), khac voi ChatMessage
 * chi luu lich su hien thi cho user.
 */
export const getAnalyticsOverview = async ({ days = DEFAULT_DAYS } = {}) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const filter = { createdAt: { $gte: since } };

  const [totalChats, fallbackCount, latencyAgg, costAgg, topFallbackRaw, pendingFeedbackCount] =
    await Promise.all([
      AiEvent.countDocuments(filter),
      AiEvent.countDocuments({ ...filter, fallbackReason: { $ne: null } }),
      AiEvent.aggregate([{ $match: filter }, { $group: { _id: null, avgLatencyMs: { $avg: "$latencyMs" } } }]),
      AiEvent.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: "$costEstimateUsd" } } }]),
      AiEvent.aggregate([
        // $exists can $ne "" -- AiEvent tao TRUOC khi them field `question`
        // (du lieu that tu B4) khong co field nay, $ne "" khong loai duoc
        // truong hop thieu han field, se lam $first tra ve null.
        { $match: { ...filter, fallbackReason: { $ne: null }, question: { $exists: true, $ne: "" } } },
        { $group: { _id: "$questionHash", question: { $first: "$question" }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: TOP_FALLBACK_LIMIT },
      ]),
      countPendingFeedback(),
    ]);

  return {
    days,
    totalChats,
    fallbackCount,
    fallbackRate: totalChats > 0 ? fallbackCount / totalChats : 0,
    avgLatencyMs: Math.round(latencyAgg[0]?.avgLatencyMs ?? 0),
    costEstimateUsd: costAgg[0]?.total ?? 0,
    pendingFeedbackCount,
    topFallbackQuestions: topFallbackRaw.map((row) => ({ question: row.question, count: row.count })),
  };
};
