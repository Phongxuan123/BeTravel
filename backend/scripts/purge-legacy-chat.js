/*
 * Xoa du lieu cua tang tra loi AI ban 1 (da go 01/11/2026), theo quyet dinh H3 trong
 * docs/AI_V2_PLAN.md. Mac dinh chi DEM (khong xoa); them --confirm de xoa that.
 * Dung: npm run purge-legacy-chat                     (dem)
 *       node scripts/purge-legacy-chat.js --confirm   (xoa, khong hoan tac duoc)
 * PowerShell nuot dau "--" cua "npm run x -- --confirm" nen goi thang node.
 * Da chay --confirm ngay 02/11/2026 (18 phien, 136 tin nhan, 1 feedback, 15 cache).
 */
import mongoose from "mongoose";

import { env } from "../src/core/env.js";

// Ten collection Mongoose tu sinh tu cac model da xoa: ChatSession, ChatMessage, ApprovedFaq,
// Feedback, AnswerMemory, QuestionSimilarityCache.
const LEGACY_COLLECTIONS = [
  "chatsessions",
  "chatmessages",
  "approvedfaqs",
  "feedbacks",
  "answermemories",
  "questionsimilaritycaches",
];

const run = async () => {
  const shouldDelete = process.argv.includes("--confirm");
  await mongoose.connect(env.MONGODB_URI);
  const db = mongoose.connection.db;
  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));

  for (const name of LEGACY_COLLECTIONS) {
    if (!existing.has(name)) {
      console.log(`[khong co] ${name}`);
      continue;
    }
    const total = await db.collection(name).countDocuments();
    if (shouldDelete) {
      await db.collection(name).drop();
      console.log(`[da xoa] ${name}: ${total} ban ghi`);
    } else {
      console.log(`[se xoa] ${name}: ${total} ban ghi`);
    }
  }

  if (!shouldDelete) console.log("Chua xoa gi. Chay lai voi --confirm de xoa.");
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
