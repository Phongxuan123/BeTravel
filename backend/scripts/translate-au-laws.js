import mongoose from "mongoose";

import { env } from "../src/core/env.js";
import { AU_LAW_TOPICS } from "../src/core/auLawTopics.js";
import { pretranslateTitle } from "../src/services/australiaLawTranslation.service.js";

/*
 * Dịch sẵn sang tiếng Việt các luật Úc đã tuyển chọn và lưu cache DB (AiCache), để người dùng đọc ngay không phải chờ.
 * Dùng: `npm run translate-au-laws` (tất cả) hoặc `npm run translate-au-laws -- C1971A00003 C1946A00045` (chỉ các mã đã nêu).
 * Chạy lại an toàn và có thể ngắt giữa chừng: chỉ dịch các cụm còn thiếu. TỐN lượt gọi AI (mỗi cụm 25 đoạn một lần);
 * dừng sớm khi liên tiếp nhiều cụm lỗi (thường do hết hạn mức) để không đốt tiền vô ích.
 */
const CONCURRENCY = Number(process.env.TRANSLATE_CONCURRENCY ?? 2);
const MAX_CONSECUTIVE_FAILED_TITLES = 3;
const PROGRESS_EVERY_CHUNKS = 50;

const requestedIds = process.argv.slice(2);
const curatedIds = [...new Set(AU_LAW_TOPICS.flatMap((topic) => topic.titleIds))];
const targetIds = requestedIds.length > 0 ? requestedIds : curatedIds;

await mongoose.connect(env.MONGODB_URI, { maxPoolSize: 4 });

let failedTitles = 0;
let consecutiveFailed = 0;
for (const titleId of targetIds) {
  const startedAt = Date.now();
  let lastLogged = 0;
  try {
    const stats = await pretranslateTitle(titleId, {
      concurrency: CONCURRENCY,
      onProgress: (current) => {
        const done = current.cached + current.translated + current.failed;
        if (done - lastLogged >= PROGRESS_EVERY_CHUNKS) {
          lastLogged = done;
          console.log(`    ${titleId}: ${done}/${current.chunks} cum`);
        }
      },
    });
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    const isBroken = stats.failed > 0 && stats.translated === 0 && stats.cached === 0;
    consecutiveFailed = isBroken ? consecutiveFailed + 1 : 0;
    if (stats.failed > 0) failedTitles += 1;
    console.log(
      `[${stats.failed > 0 ? "!" : "v"}] ${titleId}: ${stats.chunks} cum, co san ${stats.cached}, dich moi ${stats.translated}, loi ${stats.failed} (${seconds}s)`,
    );
  } catch (error) {
    failedTitles += 1;
    consecutiveFailed += 1;
    console.log(`[X] ${titleId}: ${error?.message?.slice(0, 100)}`);
  }
  if (consecutiveFailed >= MAX_CONSECUTIVE_FAILED_TITLES) {
    console.log("[!] Dung som: nhieu luat lien tiep loi (co the het han muc). Chay lai sau, script se tiep tuc cho con thieu.");
    break;
  }
}

await mongoose.disconnect();
process.exit(failedTitles > 0 ? 1 : 0);
