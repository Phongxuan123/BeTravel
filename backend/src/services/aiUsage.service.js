import User from "../models/User.js";
import AiQuota from "../models/AiQuota.js";
import AiEvent from "../models/AiEvent.js";
import { env } from "../core/env.js";

const DAY_MS = 24 * 60 * 60 * 1000;

async function reserveGlobalQuota(today) {
  if (!(await AiQuota.exists({ _id: today }))) {
    // Lần triển khai giữa ngày vẫn tính các lượt đã ghi ở phiên bản trước.
    const count = await AiEvent.countDocuments({ createdAt: { $gte: new Date(today) } });
    try {
      await AiQuota.updateOne(
        { _id: today },
        { $setOnInsert: { count, expiresAt: new Date(Date.now() + 2 * DAY_MS) } },
        { upsert: true },
      );
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }
  const reserved = await AiQuota.findOneAndUpdate(
    { _id: today, count: { $lt: env.AI_DAILY_QUOTA_GLOBAL } },
    { $inc: { count: 1 } },
  );
  if (!reserved) throw new Error("QUOTA_EXCEEDED_GLOBAL");
}

/*
 * Tra web có trần riêng (theo người + ngân sách ngày), đếm thẳng từ ai_events của ngày hôm nay.
 * Không nguyên tử như quota chat: hai câu cùng lúc có thể vượt trần một lượt, chấp nhận được vì
 * ngân sách chỉ là chốt mềm; trần cứng vẫn là AI_DAILY_QUOTA_* và số dư tài khoản nhà cung cấp.
 */
export async function hasWebSearchAllowance(userId) {
  const webToday = {
    webSearch: true,
    createdAt: { $gte: new Date(new Date().toISOString().slice(0, 10)) },
  };
  const [userCount, spent] = await Promise.all([
    AiEvent.countDocuments({ ...webToday, userId }),
    AiEvent.aggregate([
      { $match: webToday },
      { $group: { _id: null, total: { $sum: "$costEstimateVnd" } } },
    ]),
  ]);
  const withinUserLimit = userCount < env.WEB_SEARCH_DAILY_LIMIT_USER;
  const withinBudget = (spent[0]?.total ?? 0) < env.WEB_SEARCH_DAILY_BUDGET_VND;
  return withinUserLimit && withinBudget;
}

// Trả lại lượt đã cấp khi câu hỏi hoá ra được trả từ bộ nhớ câu hỏi lặp lại (không tốn tiền).
export async function releaseQuota(userId) {
  const today = new Date().toISOString().slice(0, 10);
  await Promise.all([
    AiQuota.updateOne({ _id: today, count: { $gt: 0 } }, { $inc: { count: -1 } }),
    User.updateOne(
      { _id: userId, "aiUsage.date": today, "aiUsage.count": { $gt: 0 } },
      { $inc: { "aiUsage.count": -1 } },
    ),
  ]);
}

// Cấp lượt nguyên tử tại DB. Lỗi provider vẫn tính lượt vì đã phát sinh chi phí.
export async function checkAndIncrementQuota(userId) {
  const today = new Date().toISOString().slice(0, 10);
  await reserveGlobalQuota(today);
  try {
    await User.updateOne(
      { _id: userId, "aiUsage.date": { $ne: today } },
      { $set: { aiUsage: { date: today, count: 0 } } },
    );
    const user = await User.findOneAndUpdate(
      { _id: userId, "aiUsage.date": today, "aiUsage.count": { $lt: env.AI_DAILY_QUOTA_USER } },
      { $inc: { "aiUsage.count": 1 } },
    );
    if (!user) throw new Error("QUOTA_EXCEEDED_USER");
  } catch (error) {
    await AiQuota.updateOne({ _id: today }, { $inc: { count: -1 } });
    throw error;
  }
}
