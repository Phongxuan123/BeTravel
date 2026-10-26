import crypto from "node:crypto";

import AnswerMemory from "../models/AnswerMemory.js";
import LegalArticle from "../models/LegalArticle.js";
import { AnswerSource } from "../core/constants.js";
import { env } from "../core/env.js";
import { areSourcesCurrent, snapshotChunkSources } from "../rag/retrieval.js";
import { foldDStroke, normalizeVi } from "../utils/textNormalize.js";
import { citedChunkIds, jaccardSimilarity } from "./faq.service.js";

/*
 * TRẢ LỜI LẶP LẠI: câu hỏi đã có câu trả lời (đã qua guard) trong AI_CACHE_TTL_HOURS thì dùng lại,
 * không tạo từ khoá, không tra kho, không gọi AI, không trừ lượt.
 *   1. Trùng chính xác (sau khi bỏ khác biệt hoa/thường, dấu tiếng Việt, dấu câu, khoảng trắng):
 *      tra NGAY khi nhận câu hỏi.
 *   2. Khác chữ nhưng cùng từ khoá: sau bước tạo từ khoá, Jaccard >= ANSWER_REPEAT_MIN_SIMILARITY.
 * [!] Câu trả lời từ kho chỉ được dùng lại khi MỌI nguồn còn đúng phiên bản (areSourcesCurrent):
 *     bài bị gỡ/có bản mới hoặc luật Úc đổi bản hiện hành --> xoá khỏi bộ nhớ, trả lời lại từ đầu.
 *     Câu trả lời tra web không có phiên bản để kiểm, chỉ sống theo TTL.
 */
const MEMORY_KEY_VERSION = "repeat-v1";
// Đủ cho quy mô hiện tại: chỉ đọc các câu cùng quốc gia có chung ít nhất một từ khoá.
const MAX_SIMILAR_CANDIDATES = 50;
const TTL_MS = () => env.AI_CACHE_TTL_HOURS * 60 * 60 * 1000;

export const normalizeQuestionForRepeat = (question) =>
  foldDStroke(normalizeVi(question))
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const memoryKey = (countryCode, question) =>
  crypto
    .createHash("sha256")
    .update(`${MEMORY_KEY_VERSION}|${countryCode}|${normalizeQuestionForRepeat(question)}`)
    .digest("hex");

const articleIdsOf = (sources) =>
  sources.filter((source) => source.articleId).map((source) => source.articleId);

const articleUpdatedAtById = async (sources) => {
  const articles = await LegalArticle.find({ _id: { $in: articleIdsOf(sources) } })
    .select("updatedAt")
    .lean();
  return new Map(articles.map((article) => [String(article._id), article.updatedAt?.getTime()]));
};

// Ngoài phiên bản (areSourcesCurrent), bài còn phải chưa bị sửa tại chỗ kể từ lúc ghi nhớ.
async function isStillValid(memory) {
  if (memory.answerSource === AnswerSource.OFFICIAL_WEB) return true;
  if (!(await areSourcesCurrent(memory.sources))) return false;
  const updatedAt = await articleUpdatedAtById(memory.sources);
  return memory.sources
    .filter((source) => source.articleId)
    .every(
      (source) => updatedAt.get(String(source.articleId)) === source.articleUpdatedAt?.getTime(),
    );
}

async function snapshotWithArticleDates(result) {
  const sources = await snapshotChunkSources(citedChunkIds(result));
  if (!sources) return null;
  const updatedAt = await articleUpdatedAtById(sources);
  return sources.map((source) => {
    const time = source.articleId ? updatedAt.get(String(source.articleId)) : undefined;
    return { ...source, articleUpdatedAt: time === undefined ? null : new Date(time) };
  });
}

// Bản ghi hết hiệu lực nguồn bị xoá ngay để lần sau không kiểm lại vô ích.
async function usableOrForget(memory) {
  if (!memory) return null;
  if (await isStillValid(memory)) return memory;
  await AnswerMemory.deleteOne({ _id: memory._id });
  return null;
}

// Lỗi bộ nhớ không được chặn câu trả lời: coi như không có, chạy luồng bình thường.
const orNull = (promise) =>
  promise.catch((error) => {
    console.error("[chat] bộ nhớ câu hỏi lặp lại lỗi:", error.message);
    return null;
  });

export const findExactRepeat = ({ countryCode, question }) =>
  orNull(
    AnswerMemory.findOne({ key: memoryKey(countryCode, question), expiresAt: { $gt: new Date() } })
      .lean()
      .then(usableOrForget),
  );

export const findSimilarRepeat = ({ countryCode, keywordTerms }) =>
  orNull(
    (async () => {
      if (keywordTerms.length === 0) return null;
      const candidates = await AnswerMemory.find({
        countryCode,
        keywordTerms: { $in: keywordTerms },
        expiresAt: { $gt: new Date() },
      })
        .limit(MAX_SIMILAR_CANDIDATES)
        .lean();
      const ranked = candidates
        .map((memory) => ({ memory, score: jaccardSimilarity(memory.keywordTerms, keywordTerms) }))
        .filter(({ score }) => score >= env.ANSWER_REPEAT_MIN_SIMILARITY)
        .sort((a, b) => b.score - a.score);
      for (const { memory } of ranked) {
        const usable = await usableOrForget(memory);
        if (usable) return usable;
      }
      return null;
    })(),
  );

/**
 * Lưu câu trả lời ĐÃ QUA guard để dùng lại. Câu trả lời từ kho mà không chụp được phiên bản nguồn
 * (chunk vừa bị reindex) thì không lưu: không kiểm được thì không được phát lại.
 */
export async function rememberAnswer({ countryCode, question, keywordTerms, result, model }) {
  const isWeb = result.answerSource === AnswerSource.OFFICIAL_WEB;
  const sources = isWeb ? [] : await orNull(snapshotWithArticleDates(result));
  if (!isWeb && !sources) return;
  await orNull(
    AnswerMemory.updateOne(
      { key: memoryKey(countryCode, question) },
      {
        $set: {
          countryCode,
          keywordTerms,
          answer: result.answer,
          sections: result.sections ?? null,
          citations: result.citations ?? [],
          retrieval: result.retrieval ?? null,
          confidence: result.confidence ?? "medium",
          needsOfficialHelp: result.needsOfficialHelp ?? false,
          answerSource: result.answerSource ?? AnswerSource.AI,
          model,
          sources,
          expiresAt: new Date(Date.now() + TTL_MS()),
        },
      },
      { upsert: true },
    ),
  );
}

// Bản ghi bộ nhớ --> kết quả chat (cùng hình dạng persistAssistantMessage nhận).
export const repeatResult = (memory, route) => ({
  route,
  answer: memory.answer,
  sections: memory.sections ?? null,
  citations: memory.citations ?? [],
  confidence: memory.confidence,
  needsOfficialHelp: memory.needsOfficialHelp,
  fallbackReason: null,
  retrieval: memory.retrieval ?? { topScore: 0, chunkIds: [], passed: true },
  answerSource: memory.answerSource,
  repeated: true,
});
