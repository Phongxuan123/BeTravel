import User from "../models/User.js";
import AiEvent from "../models/AiEvent.js";
import { env } from "../core/env.js";

const todayStr = () => new Date().toISOString().slice(0, 10);
const startOfDayUtc = (dateStr) => new Date(`${dateStr}T00:00:00.000Z`);

/*
 * Bao ve chi phi 2 lop (CLAUDE.md muc 4.1 "Ngân sách"):
 * 1. express-rate-limit (RAM, middleware/rateLimit.middleware.js) -- chong spam.
 * 2. ★ Quota LUU DB o day -- rate limit RAM reset khi server restart nen
 *    KHONG du de bao ve vi tien that su.
 *
 * Van toan he thong dem qua AiEvent (khong can field rieng) vi day la nguon
 * su that ve so cau da thuc su goi retrieval, kem theo van luon dung du lieu
 * hien tai thay vi mot bo dem co the lech.
 */
export async function checkAndIncrementQuota(userId) {
  const today = todayStr();

  const globalCountToday = await AiEvent.countDocuments({ createdAt: { $gte: startOfDayUtc(today) } });
  if (globalCountToday >= env.AI_DAILY_QUOTA_GLOBAL) {
    throw new Error("QUOTA_EXCEEDED_GLOBAL");
  }

  const user = await User.findById(userId).select("aiUsage");
  const isNewDay = user.aiUsage?.date !== today;

  if (!isNewDay && user.aiUsage.count >= env.AI_DAILY_QUOTA_USER) {
    throw new Error("QUOTA_EXCEEDED_USER");
  }

  user.aiUsage = isNewDay ? { date: today, count: 1 } : { date: today, count: user.aiUsage.count + 1 };
  await user.save();
}
