import { z } from "zod";

import { AppError, ErrorCode } from "../core/errors.js";
import { isCuratedTitle } from "../core/auLawTopics.js";
import AiCache from "../models/AiCache.js";
import { completeWithRateLimitRetry } from "../rag/llm/rateLimitRetry.js";
import { extractNumbers } from "../utils/legislationSections.js";
import { createTtlCache } from "../utils/ttlCache.js";
import { SCOPE_NOTICE, citationIdOf, loadDisplayedBlocks } from "./australiaLegislation.service.js";

/*
 * Dịch luật Úc sang tiếng Việt THEO YÊU CẦU: chỉ dịch các đoạn người dùng đang xem rồi lưu cache DB
 * theo (registerId, cụm). Mỗi cụm TRANSLATION_CHUNK_SIZE đoạn là một lần gọi AI nên chi phí chỉ phát sinh
 * cho phần được đọc. Chỉ luật đã tuyển chọn mới dịch (giới hạn chi phí).
 * Hậu kiểm bằng code cho TỪNG đoạn: số lượng khớp, không thêm/bớt con số nào. Đoạn không qua kiểm tra
 * trả textVi = null (client hiện bản gốc), không bao giờ hiển thị bản dịch chưa kiểm tra.
 */

export const TRANSLATION_CHUNK_SIZE = 25;
export const TRANSLATION_NOTICE =
  "Bản dịch máy do AI thực hiện, không phải bản dịch chính thức và có thể sai sót. " +
  "Luôn lấy bản tiếng Anh gốc làm chuẩn; đây là công cụ hỗ trợ thông tin, không thay thế tư vấn pháp lý.";

const CACHE_KEY_PREFIX = "au-law-vi:";
const CACHE_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 2;
const MAX_TRANSLATED_BLOCK_LENGTH = 6000;

const outputSchema = z.object({
  translations: z.array(z.string().trim().max(MAX_TRANSLATED_BLOCK_LENGTH)),
});

const SYSTEM_PROMPT = [
  "You are a careful legal translator from English into Vietnamese for Australian federal legislation.",
  "The input is a JSON array of paragraphs. Translate EVERY paragraph faithfully and completely, in the same order.",
  "Never summarise, omit, merge, split, explain or add anything. Do not give legal advice.",
  "Keep all numbering and markers exactly as written: '(1)', '(a)', 'Part 2', 'section 189', dates, amounts and years.",
  "Do not convert numbers to words or the reverse. Keep defined legal terms with the English term in parentheses on first use in a paragraph.",
  'Return only JSON: {"translations": string[]} with EXACTLY the same number of items as the input, in the same order.',
].join("\n");

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const MONTH_PATTERN = new RegExp(MONTH_NAMES.join("|"), "gi");

// So theo TẬP số, không đếm lặp: AI hay nhắc lại tên luật tiếng Anh trong ngoặc nên một số có thể xuất hiện hai lần.
const sameNumberSet = (left, right) => {
  const a = new Set(left);
  const b = new Set(right);
  return a.size === b.size && [...a].every((value) => b.has(value));
};

// "19 April 2021" -> "19 tháng 4 năm 2021": tên tháng được phép thành số tháng, ngoài ra không thêm/bớt số nào.
const monthNumbersIn = (text) =>
  (text.match(MONTH_PATTERN) ?? []).map((name) =>
    String(MONTH_NAMES.indexOf(name.toLowerCase()) + 1),
  );

// Bản dịch hợp lệ khi KHÔNG thêm và KHÔNG bớt con số nào so với bản gốc (trừ số tháng thay tên tháng).
export const hasSameNumbers = (source, translated) => {
  const sourceNumbers = extractNumbers(source);
  const translatedNumbers = extractNumbers(translated);
  return (
    sameNumberSet(sourceNumbers, translatedNumbers) ||
    sameNumberSet([...sourceNumbers, ...monthNumbersIn(source)], translatedNumbers)
  );
};

const translateChunkOnce = async (texts) => {
  const raw = await completeWithRateLimitRetry({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: JSON.stringify(texts),
    task: "au_law_translate",
  });
  const { translations } = outputSchema.parse(JSON.parse(raw));
  if (translations.length !== texts.length) throw new Error("AU_LAW_TRANSLATION_COUNT_MISMATCH");
  return translations;
};

// Mỗi đoạn trả về bản dịch đã kiểm tra hoặc null; thử lại cả cụm một lần nếu còn đoạn lỗi.
const translateChunk = async (texts) => {
  let best = texts.map(() => null);
  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS && best.some((item) => item === null);
    attempt += 1
  ) {
    try {
      const translations = await translateChunkOnce(texts);
      best = best.map(
        (existing, position) =>
          existing ??
          (hasSameNumbers(texts[position], translations[position]) ? translations[position] : null),
      );
    } catch {
      // Lỗi cả cụm (JSON hỏng, lệch số lượng, AI lỗi): thử lại, hết lượt thì để null.
    }
  }
  return best;
};

const cacheKeyFor = (registerId, chunkStart) => `${CACHE_KEY_PREFIX}${registerId}:${chunkStart}`;

const readCachedChunk = async (key) => {
  const cached = await AiCache.findOne({ key, expiresAt: { $gt: new Date() } }).lean();
  return cached ? JSON.parse(cached.answer) : null;
};

const writeCachedChunk = (key, translations) =>
  AiCache.updateOne(
    { key },
    {
      $set: {
        answer: JSON.stringify(translations),
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      },
    },
    { upsert: true },
  );

// Gộp request đồng thời cùng một cụm thành một lần gọi AI.
const inFlight = createTtlCache({ ttlMs: 120_000, maxEntries: 200 });

const resolveChunk = async (registerId, chunkStart, texts) => {
  const key = cacheKeyFor(registerId, chunkStart);
  const cached = await readCachedChunk(key);
  if (cached && cached.length === texts.length) return cached;

  const translations = await inFlight.getOrLoad(key, () => translateChunk(texts));
  // Chỉ lưu khi có ít nhất một đoạn dịch được: tránh nhớ một cụm hỏng toàn bộ do AI lỗi tạm thời.
  if (translations.some((item) => item !== null)) await writeCachedChunk(key, translations);
  return translations;
};

const notTranslatable = () =>
  new AppError(ErrorCode.FORBIDDEN, "Văn bản này chưa hỗ trợ dịch sang tiếng Việt.", {
    reason: "NOT_TRANSLATABLE",
  });

export const getTitleContentVi = async (titleId, { offset, limit }) => {
  if (!isCuratedTitle(titleId)) throw notTranslatable();

  const { rawVersion, allBlocks } = await loadDisplayedBlocks(titleId);
  const end = Math.min(offset + limit, allBlocks.length);

  // Cụm căn theo bội số của TRANSLATION_CHUNK_SIZE để cache dùng lại được dù client đổi offset/limit.
  const firstChunkStart = Math.floor(offset / TRANSLATION_CHUNK_SIZE) * TRANSLATION_CHUNK_SIZE;
  const translationByIndex = new Map();
  for (let chunkStart = firstChunkStart; chunkStart < end; chunkStart += TRANSLATION_CHUNK_SIZE) {
    const chunkBlocks = allBlocks.slice(chunkStart, chunkStart + TRANSLATION_CHUNK_SIZE);
    const translations = await resolveChunk(
      rawVersion.registerId,
      chunkStart,
      chunkBlocks.map((block) => block.text),
    );
    translations.forEach((translated, position) =>
      translationByIndex.set(chunkStart + position, translated),
    );
  }

  const blocks = allBlocks.slice(offset, end).map(({ kind, text }, position) => ({
    citationId: citationIdOf(rawVersion, offset + position),
    kind,
    text,
    textVi: translationByIndex.get(offset + position) ?? null,
  }));

  return {
    titleId,
    registerId: rawVersion.registerId,
    totalBlocks: allBlocks.length,
    offset,
    limit,
    blocks,
    translationNotice: TRANSLATION_NOTICE,
    scopeNotice: SCOPE_NOTICE,
  };
};

/*
 * Dịch sẵn TOÀN BỘ một luật (chạy từ script, không phải từ request người dùng) và lưu cache theo cụm, nên chạy lại
 * chỉ dịch các cụm còn thiếu. Một cụm "hỏng" (không đoạn nào qua kiểm tra số) không được lưu, lần chạy sau thử lại.
 * @returns { chunks, cached, translated, failed }
 */
export const pretranslateTitle = async (titleId, { concurrency = 2, onProgress } = {}) => {
  if (!isCuratedTitle(titleId)) throw notTranslatable();
  const { rawVersion, allBlocks } = await loadDisplayedBlocks(titleId);
  const chunkStarts = [];
  for (let start = 0; start < allBlocks.length; start += TRANSLATION_CHUNK_SIZE) chunkStarts.push(start);

  const stats = { chunks: chunkStarts.length, cached: 0, translated: 0, failed: 0 };
  let next = 0;
  const worker = async () => {
    while (next < chunkStarts.length) {
      const chunkStart = chunkStarts[next];
      next += 1;
      const texts = allBlocks.slice(chunkStart, chunkStart + TRANSLATION_CHUNK_SIZE).map((block) => block.text);
      const wasCached = Boolean(await readCachedChunk(cacheKeyFor(rawVersion.registerId, chunkStart)));
      const translations = await resolveChunk(rawVersion.registerId, chunkStart, texts);
      if (wasCached) stats.cached += 1;
      else if (translations.some((item) => item !== null)) stats.translated += 1;
      else stats.failed += 1;
      onProgress?.(stats);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return stats;
};
