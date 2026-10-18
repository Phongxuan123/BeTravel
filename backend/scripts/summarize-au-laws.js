import mongoose from "mongoose";

import { env } from "../src/core/env.js";
import { AU_LAW_TOPICS } from "../src/core/auLawTopics.js";
import { generateAndCacheDeepSummary } from "../src/services/australiaLawDeepSummary.service.js";

/*
 * Sinh trước tóm tắt từng Phần (AI) cho các luật Úc đã tuyển chọn và lưu cache DB, để người dùng
 * không phải chờ lần đầu. Dùng: `npm run summarize-au-laws` (tất cả) hoặc
 * `npm run summarize-au-laws -- C1958A00062 C1901A00006` (chỉ các mã đã nêu).
 * Tốn lượt gọi LLM (mỗi Phần một lần); chạy lại an toàn, ghi đè bản cache cũ của cùng registerId.
 */
const requestedIds = process.argv.slice(2);
const curatedIds = [...new Set(AU_LAW_TOPICS.flatMap((topic) => topic.titleIds))];
const targetIds = requestedIds.length > 0 ? requestedIds : curatedIds;

await mongoose.connect(env.MONGODB_URI, { maxPoolSize: 2 });

let failed = 0;
for (const titleId of targetIds) {
  const startedAt = Date.now();
  try {
    const summary = await generateAndCacheDeepSummary(titleId);
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    console.log(
      `[v] ${titleId}: ${summary.parts.length} phần, bỏ ${summary.skippedParts} phần (${seconds}s)`,
    );
  } catch (error) {
    failed += 1;
    console.log(`[X] ${titleId}: ${error?.message?.slice(0, 100)}`);
  }
}

await mongoose.disconnect();
process.exit(failed > 0 ? 1 : 0);
