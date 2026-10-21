import { z } from "zod";

import { AU_LAW_NAMES_VI } from "../core/auLawNames.js";
import { env } from "../core/env.js";
import AiCache from "../models/AiCache.js";
import { getTranslationProvider } from "../rag/llm/index.js";
import { createTtlCache } from "../utils/ttlCache.js";
import { hasSameNumbers } from "./australiaLawTranslation.service.js";

/*
 * Gắn tên tiếng Việt cho danh sách luật Úc:
 *   curated: 32 luật tuyển chọn, tên viết sẵn (core/auLawNames.js), không tốn AI;
 *   machine: luật khác được AI dịch tên theo lô (một lần gọi cho cả trang), cache DB theo mã văn bản.
 * Dịch tên KHÔNG được làm chậm hay làm hỏng danh sách: chờ tối đa TITLE_TRANSLATION_TIMEOUT_MS, quá hạn hoặc
 * lỗi thì trả nameVi = null (client hiện tên tiếng Anh) và việc dịch vẫn chạy nền để lần sau có sẵn.
 * Hậu kiểm: bản dịch không được thêm hoặc bớt con số (năm, số hiệu) so với tên gốc.
 */

export const NameViSource = Object.freeze({ CURATED: "curated", MACHINE: "machine" });

const CACHE_KEY_PREFIX = "au-law-title-vi:";
const CACHE_TTL_MS = 365 * 24 * 60 * 60 * 1000;
const TITLE_TRANSLATION_TIMEOUT_MS = 8000;
const MAX_NAME_LENGTH = 400;

const outputSchema = z.object({
  translations: z.array(z.string().trim().max(MAX_NAME_LENGTH)),
});

const SYSTEM_PROMPT = [
  "You translate titles of Australian federal legislation from English into Vietnamese.",
  "The input is a JSON array of titles. Return every title translated, in the same order.",
  "Use established Vietnamese legal terms: Act = Đạo luật, Regulations = Quy định, Amendment = Sửa đổi,",
  "Determination = Quyết định, Notice = Thông báo, Instrument = Văn bản, Order = Lệnh.",
  "Keep years, numbers, 'No. 1' style numbering and proper names exactly; never add, drop or explain anything.",
  'Return only JSON: {"translations": string[]} with EXACTLY the same number of items as the input.',
].join("\n");

const cacheKeyFor = (titleId) => `${CACHE_KEY_PREFIX}${titleId}`;

const readCachedNames = async (titleIds) => {
  if (titleIds.length === 0) return new Map();
  const rows = await AiCache.find({
    key: { $in: titleIds.map(cacheKeyFor) },
    expiresAt: { $gt: new Date() },
  }).lean();
  return new Map(rows.map((row) => [row.key.slice(CACHE_KEY_PREFIX.length), row.answer]));
};

const writeCachedName = (titleId, nameVi) =>
  AiCache.updateOne(
    { key: cacheKeyFor(titleId) },
    { $set: { answer: nameVi, expiresAt: new Date(Date.now() + CACHE_TTL_MS) } },
    { upsert: true },
  );

const translateTitles = async (items) => {
  const raw = await getTranslationProvider().complete({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: JSON.stringify(items.map((item) => item.name)),
    task: "au_law_title_translate",
  });
  const { translations } = outputSchema.parse(JSON.parse(raw));
  if (translations.length !== items.length) throw new Error("AU_LAW_TITLE_COUNT_MISMATCH");

  const accepted = new Map();
  for (const [position, item] of items.entries()) {
    const nameVi = translations[position];
    if (nameVi && hasSameNumbers(item.name, nameVi)) accepted.set(item.id, nameVi);
  }
  await Promise.all([...accepted].map(([titleId, nameVi]) => writeCachedName(titleId, nameVi)));
  return accepted;
};

// Gộp các request đồng thời cùng một lô tên thành một lần gọi AI.
const inFlight = createTtlCache({ ttlMs: 60_000, maxEntries: 100 });

const translateMissing = async (items) => {
  const batchKey = items
    .map((item) => item.id)
    .sort()
    .join(",");
  try {
    return await inFlight.getOrLoad(batchKey, () => translateTitles(items));
  } catch (error) {
    // Không log tên/đầu ra của AI; chỉ tên lỗi để vận hành biết.
    console.warn(`[au-law-title] bỏ dịch tên: ${error?.message?.slice(0, 80)}`);
    return new Map();
  }
};

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(new Map()), ms))]);

const isMachineTranslationEnabled = () => env.AU_LAW_TITLE_TRANSLATION;

// Trả bản sao từng item kèm nameVi và nameViSource (null nếu chưa có bản dịch).
export const attachNamesVi = async (items) => {
  const needsLookup = items.filter((item) => !AU_LAW_NAMES_VI[item.id]);
  const cached = isMachineTranslationEnabled()
    ? await readCachedNames(needsLookup.map((item) => item.id))
    : new Map();

  const missing = isMachineTranslationEnabled()
    ? needsLookup.filter((item) => !cached.has(item.id))
    : [];
  const fresh =
    missing.length > 0
      ? await withTimeout(translateMissing(missing), TITLE_TRANSLATION_TIMEOUT_MS)
      : new Map();

  return items.map((item) => {
    const curatedName = AU_LAW_NAMES_VI[item.id];
    if (curatedName) return { ...item, nameVi: curatedName, nameViSource: NameViSource.CURATED };
    const machineName = cached.get(item.id) ?? fresh.get(item.id) ?? null;
    return {
      ...item,
      nameVi: machineName,
      nameViSource: machineName ? NameViSource.MACHINE : null,
    };
  });
};
