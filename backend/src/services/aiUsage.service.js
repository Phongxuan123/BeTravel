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
