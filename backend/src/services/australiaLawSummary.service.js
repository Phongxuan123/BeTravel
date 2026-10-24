import { z } from "zod";

import { isCuratedTitle } from "../core/auLawTopics.js";
import AiCache from "../models/AiCache.js";
import { completeWithRateLimitRetry } from "../rag/llm/rateLimitRetry.js";
import { createTtlCache } from "../utils/ttlCache.js";
import { getDeepSummaryState } from "./australiaLawDeepSummary.service.js";
import { lookupCachedTranslations } from "./australiaLawTranslation.service.js";
import { getTitleName, getTitleOutline } from "./australiaLegislation.service.js";

/*
 * Tóm lược luật Úc gồm hai tầng:
 *   1. CÓ NGUỒN, không qua AI: tiêu đề dài (mục đích) và dàn ý Chương/Phần rút thẳng từ văn bản chính thức.
 *   2. Diễn giải tiếng Việt do AI viết, CHỈ dựa trên tầng 1 (không đọc toàn văn), gắn cờ aiGenerated
 *      và hậu kiểm bằng code. Lỗi AI không làm hỏng tầng 1: chỉ trả summaryVi = null.
 * Chỉ luật đã tuyển chọn (auLawTopics.js) mới gọi AI; kết quả cache DB theo registerId (bất biến theo bản).
 */

export const SUMMARY_DISCLAIMER =
  "Phần tiếng Việt do AI diễn giải từ tiêu đề và dàn ý của luật, có thể chưa đầy đủ hoặc sai sót. " +
  "Đây là công cụ hỗ trợ thông tin, không thay thế tư vấn pháp lý chính thức; luôn đối chiếu bản gốc.";

const SUMMARY_CACHE_KEY_PREFIX = "au-law-summary:";
const SUMMARY_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_SUMMARY_LENGTH = 700;
const MAX_KEY_POINTS = 6;
const MAX_KEY_POINT_LENGTH = 220;
const NUMBER_PATTERN = /\d+/g;
// AI ở nhiệt độ > 0 đôi khi vi phạm guard hoặc trả JSON lỗi; thử lại một lần trước khi bỏ phần AI.
const MAX_GENERATION_ATTEMPTS = 2;

export const SummaryViStatus = Object.freeze({
  READY: "ready",
  NOT_ELIGIBLE: "not_eligible",
  UNAVAILABLE: "unavailable",
});

const outputSchema = z.object({
  summary: z.string().trim().min(1).max(MAX_SUMMARY_LENGTH),
  keyPoints: z.array(z.string().trim().min(1).max(MAX_KEY_POINT_LENGTH)).min(1).max(MAX_KEY_POINTS),
});

const SYSTEM_PROMPT = [
  "You write short Vietnamese overviews of Australian federal laws for Vietnamese travellers.",
  "Use ONLY the long title and the Part/Chapter headings given in the JSON input.",
  "Never add facts, numbers, dates, penalties, fees, rights or obligations that are not in the input.",
  "Write Part/Chapter numbers exactly as in the input (e.g. 'Part II', 'Part 4A'); never convert Roman numerals to digits or the reverse.",
  "Do not give legal advice. If the input is thin, write less rather than guess.",
  "Keep key English legal terms in parentheses when it helps understanding.",
  'Return only JSON: {"summary": string (2-3 sentences), "keyPoints": string[] (3-6 items, each describing what one Part or Chapter covers)}.',
].join("\n");

const buildUserPrompt = ({ title, purpose, outline }) =>
  JSON.stringify({
    title,
    longTitle: purpose?.text ?? null,
    headings: outline.map(({ level, text }) => ({ level, text })),
  });

// Hậu kiểm: mọi con số AI viết ra phải có trong dữ liệu đầu vào, nếu không bỏ cả bản AI.
export const hasOnlyGroundedNumbers = (generatedText, sourceText) => {
  const allowed = new Set(sourceText.match(NUMBER_PATTERN) ?? []);
  return (generatedText.match(NUMBER_PATTERN) ?? []).every((number) => allowed.has(number));
};

const flattenForGuard = (viSummary) => [viSummary.summary, ...viSummary.keyPoints].join("\n");

const generateViSummaryOnce = async (input) => {
  const raw = await completeWithRateLimitRetry({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(input),
    task: "au_law_summary",
  });
  const parsed = outputSchema.parse(JSON.parse(raw));

  const sourceText = [
    input.title,
    input.purpose?.text ?? "",
    ...input.outline.map((item) => item.text),
  ].join("\n");
  if (!hasOnlyGroundedNumbers(flattenForGuard(parsed), sourceText)) {
    throw new Error("AU_LAW_SUMMARY_UNGROUNDED_NUMBER");
  }
  return parsed;
};

const generateViSummary = async (input) => {
  let lastError;
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    try {
      return await generateViSummaryOnce(input);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};

const readCachedViSummary = async (cacheKey) => {
  const cached = await AiCache.findOne({ key: cacheKey, expiresAt: { $gt: new Date() } }).lean();
  return cached ? outputSchema.parse(JSON.parse(cached.answer)) : null;
};

const writeCachedViSummary = (cacheKey, viSummary) =>
  AiCache.updateOne(
    { key: cacheKey },
    {
      $set: {
        answer: JSON.stringify(viSummary),
        expiresAt: new Date(Date.now() + SUMMARY_CACHE_TTL_MS),
      },
    },
    { upsert: true },
  );

// Gộp các request đồng thời cùng một bản luật thành một lần gọi AI.
const inFlight = createTtlCache({ ttlMs: 60_000, maxEntries: 50 });

const resolveViSummary = async ({ titleId, title, outlineResult }) => {
  const input = { title, purpose: outlineResult.purpose, outline: outlineResult.outline };
  const hasGroundingMaterial = Boolean(input.purpose) || input.outline.length > 0;
  if (!isCuratedTitle(titleId) || !hasGroundingMaterial) {
    return { status: SummaryViStatus.NOT_ELIGIBLE, viSummary: null };
  }

  const cacheKey = `${SUMMARY_CACHE_KEY_PREFIX}${outlineResult.source.registerId}`;
  try {
    const cached = await readCachedViSummary(cacheKey);
    if (cached) return { status: SummaryViStatus.READY, viSummary: cached };

    const generated = await inFlight.getOrLoad(cacheKey, () => generateViSummary(input));
    await writeCachedViSummary(cacheKey, generated);
    return { status: SummaryViStatus.READY, viSummary: generated };
  } catch (error) {
    // Không log đầu vào/đầu ra của AI; chỉ tên lỗi để vận hành biết.
    console.warn(`[au-law-summary] ${titleId} bỏ phần AI: ${error?.message?.slice(0, 80)}`);
    return { status: SummaryViStatus.UNAVAILABLE, viSummary: null };
  }
};

export const getTitleSummary = async (titleId) => {
  const [titleName, outlineResult] = await Promise.all([
    getTitleName(titleId),
    getTitleOutline(titleId),
  ]);
  const { status, viSummary } = await resolveViSummary({
    titleId,
    title: titleName,
    outlineResult,
  });

  // Tóm tắt từng Phần: đọc cache; chưa có thì kích hoạt sinh nền và báo "generating" (client hỏi lại sau).
  const deep = await getDeepSummaryState(titleId, outlineResult.source.registerId);

  // Tiêu đề, mục đích và dàn ý hiện bằng tiếng Việt khi toàn văn đã được dịch sẵn (chỉ đọc cache, không gọi AI).
  const parts = deep.deepSummary?.parts ?? [];
  const viByCitation = isCuratedTitle(titleId)
    ? await lookupCachedTranslations(outlineResult.source.registerId, [
        ...(outlineResult.purpose ? [outlineResult.purpose.citationId] : []),
        ...outlineResult.outline.map((item) => item.citationId),
        ...parts.map((part) => part.citationId),
      ])
    : new Map();
  const withVi = (item) => ({ ...item, textVi: viByCitation.get(item.citationId) ?? null });

  return {
    ...outlineResult,
    purpose: outlineResult.purpose ? withVi(outlineResult.purpose) : null,
    outline: outlineResult.outline.map(withVi),
    deepStatus: deep.status,
    deepSummary: deep.deepSummary
      ? {
          ...deep.deepSummary,
          parts: parts.map((part) => ({ ...part, headingVi: viByCitation.get(part.citationId) ?? null })),
        }
      : null,
    summaryViStatus: status,
    summaryVi: viSummary ? { ...viSummary, aiGenerated: true, basedOn: "longTitle+outline" } : null,
    disclaimer: SUMMARY_DISCLAIMER,
  };
};
