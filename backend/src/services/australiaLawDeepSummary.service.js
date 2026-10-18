import { z } from "zod";

import { isCuratedTitle } from "../core/auLawTopics.js";
import { env } from "../core/env.js";
import AiCache from "../models/AiCache.js";
import { completeWithRateLimitRetry } from "../rag/llm/rateLimitRetry.js";
import {
  buildPartDigest,
  extractNumbers,
  MAX_SEGMENTS,
  segmentIntoParts,
  splitByDivisions,
} from "../utils/legislationSections.js";
import { citationIdOf, loadDisplayedBlocks } from "./australiaLegislation.service.js";

/*
 * Tóm tắt nội dung TỪNG PHẦN của luật Úc bằng AI, dựa trên văn bản thật:
 *   1. Cắt luật thành các Phần; mỗi Phần dựng bản trích (tiêu đề + phần đầu của từng Điều) có nhãn [#chỉ số].
 *   2. AI viết tóm tắt tiếng Việt và BẮT BUỘC gắn chỉ số Điều nguồn cho từng ý.
 *   3. HẬU KIỂM BẰNG CODE (không tin AI): chỉ số phải thuộc bản trích; số liệu trong ý phải có trong
 *      chính các Điều được trích dẫn. Sai thì thử lại một lần, vẫn sai thì BỎ Phần đó (không hiển thị).
 * Sinh trước (npm run summarize-au-laws) hoặc nền khi có người mở lần đầu; đọc từ cache DB theo registerId.
 */

export const DeepStatus = Object.freeze({
  READY: "ready",
  GENERATING: "generating",
  NOT_GENERATED: "not_generated",
  NOT_ELIGIBLE: "not_eligible",
  UNAVAILABLE: "unavailable",
});

const CACHE_KEY_PREFIX = "au-law-deep:";
const CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const FAILURE_COOLDOWN_MS = 10 * 60 * 1000;
// Tuần tự: bản trích mỗi Phần ~8k token, chạy song song dễ vượt hạn mức token/phút của Gemini (429).
const PART_CONCURRENCY = 1;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 2000;
const MAX_PART_SUMMARY_LENGTH = 600;
const MAX_KEY_POINTS = 5;
const MAX_KEY_POINT_LENGTH = 260;
const MAX_SOURCES_PER_POINT = 4;
const MIN_USABLE_SEGMENT_SECTIONS = 1;

const partOutputSchema = z.object({
  summary: z.string().trim().min(1).max(MAX_PART_SUMMARY_LENGTH),
  keyPoints: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(MAX_KEY_POINT_LENGTH),
        sources: z.array(z.number().int()).min(1).max(MAX_SOURCES_PER_POINT),
      }),
    )
    .min(1)
    .max(MAX_KEY_POINTS),
});

const SYSTEM_PROMPT = [
  "You summarise one Part of an Australian federal law in Vietnamese for Vietnamese travellers.",
  "The input is a digest: each line is '[#N] section heading :: opening words of that section'. Lines starting with '--' are sub-headings.",
  "Use ONLY the digest. Never add facts, numbers, dates, penalties, fees, rights or duties that are not in it.",
  "Every key point MUST list in 'sources' the N values of the sections it is based on (1-4 values, only N that appear in the digest).",
  "Write section/Part numbers exactly as in the digest; never convert Roman numerals to digits or the reverse.",
  "Keep important English legal terms in parentheses. Do not give legal advice; if the digest is thin, write less.",
  'Return only JSON: {"summary": string (1-2 sentences about what this Part covers), "keyPoints": [{"text": string, "sources": number[]}] (2-5 items)}.',
].join("\n");

const buildUserPrompt = (heading, digestText) =>
  JSON.stringify({ part: heading, digest: digestText });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Số liệu trong câu chữ AI phải có trong đúng các Điều được trích dẫn (hoặc tiêu đề Phần).
export const validatePartOutput = (output, { heading, digestLines, indices }) => {
  const lineByIndex = new Map(
    digestLines
      .map((line) => [Number(/^\[#(\d+)\]/.exec(line)?.[1]), line])
      .filter(([index]) => Number.isInteger(index)),
  );
  const allowedWhole = new Set(extractNumbers(`${heading}\n${digestLines.join("\n")}`));

  const summaryOk = extractNumbers(output.summary).every((number) => allowedWhole.has(number));
  const pointsOk = output.keyPoints.every((point) => {
    const sourcesExist = point.sources.every((source) => indices.has(source));
    const citedText = `${heading}\n${point.sources.map((source) => lineByIndex.get(source) ?? "").join("\n")}`;
    const allowedCited = new Set(extractNumbers(citedText));
    return sourcesExist && extractNumbers(point.text).every((number) => allowedCited.has(number));
  });
  return summaryOk && pointsOk;
};

const summarisePartOnce = async (segment, digest) => {
  const raw = await completeWithRateLimitRetry({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(segment.heading, digest.text),
    task: "au_law_part_summary",
  });
  const output = partOutputSchema.parse(JSON.parse(raw));
  const context = {
    heading: segment.heading,
    digestLines: digest.text.split("\n"),
    indices: digest.indices,
  };
  if (!validatePartOutput(output, context)) throw new Error("AU_LAW_PART_UNGROUNDED");
  return output;
};

// Trả null nếu hết lần thử: Phần đó bị bỏ, không hiển thị nội dung chưa qua hậu kiểm.
const summarisePart = async (segment, digest) => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await summarisePartOnce(segment, digest);
    } catch {
      if (attempt < MAX_ATTEMPTS) await wait(RETRY_DELAY_MS);
    }
  }
  return null;
};

// Chạy tối đa PART_CONCURRENCY lệnh gọi AI song song nhưng giữ nguyên thứ tự Phần.
const mapWithConcurrency = async (items, worker) => {
  const results = new Array(items.length);
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const current = next;
      next += 1;
      results[current] = await worker(items[current]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(PART_CONCURRENCY, items.length) }, run));
  return results;
};

export const buildDeepSummary = async (titleId) => {
  const { rawVersion, allBlocks } = await loadDisplayedBlocks(titleId);
  const allSegments = segmentIntoParts(allBlocks);
  const segments = allSegments.slice(0, MAX_SEGMENTS);

  const prepared = segments
    .flatMap((segment) => {
      const whole = buildPartDigest(allBlocks, segment);
      // Phần vừa một bản trích thì giữ nguyên; quá lớn thì chia theo Mục con.
      if (!whole.truncated) return [{ segment, digest: whole }];
      return splitByDivisions(allBlocks, segment).map((piece) => ({
        segment: piece,
        digest: buildPartDigest(allBlocks, piece),
      }));
    })
    .filter(({ digest }) => digest.indices.size >= MIN_USABLE_SEGMENT_SECTIONS);

  const summaries = await mapWithConcurrency(prepared, ({ segment, digest }) =>
    summarisePart(segment, digest),
  );

  const parts = prepared.flatMap(({ segment, digest }, position) => {
    const output = summaries[position];
    if (!output) return [];
    return [
      {
        heading: segment.heading,
        citationId: citationIdOf(rawVersion, segment.headingIndex),
        summary: output.summary,
        // Mảnh vẫn quá dài sau khi chia: AI chỉ thấy các Điều đầu, UI phải nói rõ điều này.
        partial: digest.truncated,
        keyPoints: output.keyPoints.map((point) => ({
          text: point.text,
          citationIds: point.sources.map((source) => citationIdOf(rawVersion, source)),
        })),
      },
    ];
  });

  return {
    registerId: rawVersion.registerId,
    generatedAt: new Date().toISOString(),
    parts,
    skippedParts: prepared.length - parts.length,
    truncated: allSegments.length > MAX_SEGMENTS,
  };
};

// ------------------------------------------------------------------- cache và trạng thái

const cacheKeyFor = (registerId) => `${CACHE_KEY_PREFIX}${registerId}`;

const readCached = async (registerId) => {
  const cached = await AiCache.findOne({
    key: cacheKeyFor(registerId),
    expiresAt: { $gt: new Date() },
  }).lean();
  return cached ? JSON.parse(cached.answer) : null;
};

const writeCached = (registerId, deepSummary) =>
  AiCache.updateOne(
    { key: cacheKeyFor(registerId) },
    {
      $set: {
        answer: JSON.stringify(deepSummary),
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      },
    },
    { upsert: true },
  );

const generating = new Map(); // registerId -> Promise
const failedAt = new Map(); // registerId -> thời điểm thất bại gần nhất

export const generateAndCacheDeepSummary = async (titleId) => {
  const deepSummary = await buildDeepSummary(titleId);
  // Không lưu kết quả rỗng (AI lỗi hàng loạt): để lần sau thử lại thay vì nhớ một bản trống.
  if (deepSummary.parts.length === 0) throw new Error("AU_LAW_DEEP_EMPTY");
  await writeCached(deepSummary.registerId, deepSummary);
  return deepSummary;
};

const startBackgroundGeneration = (titleId, registerId) => {
  const promise = generateAndCacheDeepSummary(titleId)
    .catch((error) => {
      failedAt.set(registerId, Date.now());
      console.warn(`[au-law-deep] ${titleId} thất bại: ${error?.message?.slice(0, 80)}`);
    })
    .finally(() => generating.delete(registerId));
  generating.set(registerId, promise);
};

// Không chặn request: có cache thì trả luôn, chưa có thì khởi động sinh nền và báo "generating".
export const getDeepSummaryState = async (titleId, registerId) => {
  if (!isCuratedTitle(titleId)) return { status: DeepStatus.NOT_ELIGIBLE, deepSummary: null };

  const cached = await readCached(registerId);
  if (cached) return { status: DeepStatus.READY, deepSummary: cached };
  if (generating.has(registerId)) return { status: DeepStatus.GENERATING, deepSummary: null };
  // Chưa sinh và không bật tự sinh: báo "chưa có", không gọi AI (sinh bằng npm run summarize-au-laws).
  if (!env.AU_LAW_DEEP_SUMMARY_AUTOGEN)
    return { status: DeepStatus.NOT_GENERATED, deepSummary: null };

  const lastFailure = failedAt.get(registerId);
  if (lastFailure && Date.now() - lastFailure < FAILURE_COOLDOWN_MS) {
    return { status: DeepStatus.UNAVAILABLE, deepSummary: null };
  }
  startBackgroundGeneration(titleId, registerId);
  return { status: DeepStatus.GENERATING, deepSummary: null };
};
