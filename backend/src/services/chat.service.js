import crypto from "node:crypto";

import ChatSession from "../models/ChatSession.js";
import ChatMessage from "../models/ChatMessage.js";
import AiCache from "../models/AiCache.js";
import AiEvent from "../models/AiEvent.js";
import Country from "../models/Country.js";
import { retrieve } from "../rag/retrieval.js";
import { buildSystemPrompt, buildUserPrompt, parseLlmJson } from "../rag/prompt.js";
import { guardAnswer, FALLBACK_MESSAGE, DEFAULT_DISCLAIMER } from "../rag/guard.js";
import { getLlmProvider } from "../rag/llm/index.js";
import { getEmbeddingProvider } from "../rag/embedding/index.js";
import { normalizeVi } from "../utils/textNormalize.js";
import { checkAndIncrementQuota } from "./aiUsage.service.js";
import { FallbackReason, ChatRole } from "../core/constants.js";
import { env } from "../core/env.js";
import { AppError, ErrorCode } from "../core/errors.js";

const CACHE_TTL_MS = env.AI_CACHE_TTL_HOURS * 60 * 60 * 1000;

export const createSession = async (userId, countryCode) => ChatSession.create({ userId, countryCode });

export const listSessions = async (userId) =>
  ChatSession.find({ userId }).sort({ updatedAt: -1 }).lean();

export const listMessages = async (userId, sessionId) => {
  const session = await ChatSession.findOne({ _id: sessionId, userId });
  if (!session) throw new Error("CHAT_SESSION_NOT_FOUND");
  return ChatMessage.find({ sessionId }).sort({ createdAt: 1 }).lean();
};

export const deleteSession = async (userId, sessionId) => {
  const session = await ChatSession.findOneAndDelete({ _id: sessionId, userId });
  if (!session) throw new Error("CHAT_SESSION_NOT_FOUND");
  await ChatMessage.deleteMany({ sessionId });
};

// Feedback (huu ich/khong huu ich) tren TUNG cau tra loi -- dung o B5 (nut
// ThumbsUp/ThumbsDown trong AnswerCard.tsx), gan o day de sẵn cho B5 noi vao.
export const setMessageFeedback = async (userId, sessionId, messageId, feedback) => {
  const session = await ChatSession.findOne({ _id: sessionId, userId });
  if (!session) throw new Error("CHAT_SESSION_NOT_FOUND");

  const message = await ChatMessage.findOneAndUpdate(
    { _id: messageId, sessionId, role: ChatRole.ASSISTANT },
    { $set: { feedback } },
    { new: true },
  );
  if (!message) throw new Error("CHAT_MESSAGE_NOT_FOUND");
  return message;
};

const buildCacheKey = (question, countryCode, chunkIds) => {
  const normalized = normalizeVi(question);
  const sortedIds = [...chunkIds].sort().join(",");
  return crypto.createHash("sha256").update(`${normalized}|${countryCode}|${sortedIds}`).digest("hex");
};

/*
 * Quy tac 5 cua system prompt: cau hoi nhac ten mot quoc gia KHAC voi quoc
 * gia dang chon phai duoc tu choi tra loi RO RANG, khong duoc de LLM tu quyet
 * dinh (an toan hon: khong phu thuoc chat luong provider, deterministic, ret
 * tien vi khong can goi LLM). "Nhac ten" duoc phat hien bang so khop chuoi da
 * chuan hoa (khong dau), khong phai suy luan ngu nghia.
 */
async function detectOtherCountryMention(question, currentCountry) {
  const otherCountries = await Country.find({ code: { $ne: currentCountry.code } }).select("code name").lean();
  const normalizedQuestion = normalizeVi(question);
  return otherCountries.find((c) => normalizedQuestion.includes(normalizeVi(c.name))) ?? null;
}

async function persistAssistantMessage({ sessionId, result, model, latencyMs }) {
  return ChatMessage.create({
    sessionId,
    role: ChatRole.ASSISTANT,
    text: result.answer,
    citations: result.citations ?? [],
    retrieval: result.retrieval ?? { topScore: 0, chunkIds: [], passed: false },
    fallbackReason: result.fallbackReason,
    confidence: result.confidence ?? null,
    needsOfficialHelp: result.needsOfficialHelp ?? false,
    model,
    latencyMs,
  });
}

async function logAiEvent({ userId, sessionId, countryCode, question, result, model, embeddingModel, latencyMs, cacheHit }) {
  await AiEvent.create({
    userId,
    sessionId,
    countryCode,
    questionHash: crypto.createHash("sha256").update(normalizeVi(question)).digest("hex"),
    chunkIds: result.retrieval?.chunkIds ?? [],
    topScore: result.retrieval?.topScore ?? 0,
    model,
    embeddingModel,
    latencyMs,
    fallbackReason: result.fallbackReason,
    cacheHit,
  });
}

/*
 * Pipeline chat day du -- day la noi DUY NHAT lap rap retrieval + prompt +
 * guard + cache + quota. Controller chi goi ham nay, khong biet chi tiet ben trong.
 */
export const sendMessage = async ({ userId, sessionId, question }) => {
  const session = await ChatSession.findOne({ _id: sessionId, userId });
  if (!session) throw new Error("CHAT_SESSION_NOT_FOUND");

  await checkAndIncrementQuota(userId);

  const startedAt = Date.now();
  const countryCode = session.countryCode;
  const currentCountry = await Country.findOne({ code: countryCode }).lean();
  if (!currentCountry) throw new AppError(ErrorCode.VALIDATION_ERROR, "Quốc gia không tồn tại");

  if (!session.title) {
    session.title = question.slice(0, 80);
  }
  await ChatMessage.create({ sessionId: session._id, role: ChatRole.USER, text: question });
  await session.save();

  const otherCountry = await detectOtherCountryMention(question, currentCountry);
  if (otherCountry) {
    const result = {
      answer:
        `Dữ liệu hiện có trong Be.Travel chỉ dành cho ${currentCountry.name} (quốc gia bạn đang chọn). ` +
        `Để xem thông tin về ${otherCountry.name}, hãy đổi quốc gia đang chọn trong ứng dụng rồi hỏi lại.\n\n---\n${DEFAULT_DISCLAIMER}`,
      citations: [],
      confidence: "high",
      needsOfficialHelp: false,
      fallbackReason: null,
      retrieval: { topScore: 0, chunkIds: [], passed: false },
    };
    const message = await persistAssistantMessage({ sessionId: session._id, result, model: "none", latencyMs: Date.now() - startedAt });
    await logAiEvent({ userId, sessionId: session._id, countryCode, question, result, model: "none", embeddingModel: "none", latencyMs: Date.now() - startedAt, cacheHit: false });
    return { session, message };
  }

  const retrieval = await retrieve({ question, countryCode });

  if (!retrieval.passed) {
    const result = {
      answer: FALLBACK_MESSAGE,
      citations: [],
      confidence: "low",
      needsOfficialHelp: false,
      fallbackReason: FallbackReason.INSUFFICIENT_EVIDENCE,
      retrieval: { topScore: retrieval.topScore, chunkIds: [], passed: false },
    };
    const message = await persistAssistantMessage({ sessionId: session._id, result, model: "none", latencyMs: Date.now() - startedAt });
    await logAiEvent({ userId, sessionId: session._id, countryCode, question, result, model: "none", embeddingModel: getEmbeddingProvider().model, latencyMs: Date.now() - startedAt, cacheHit: false });
    return { session, message };
  }

  const chunkIds = retrieval.chunks.map((c) => c.articleId + ":" + c.marker);
  const cacheKey = buildCacheKey(question, countryCode, chunkIds);
  const cached = await AiCache.findOne({ key: cacheKey }).lean();

  const llm = getLlmProvider();
  let guarded;
  const cacheHit = Boolean(cached);

  if (cached) {
    guarded = {
      answer: cached.answer,
      citations: cached.citations,
      fallbackReason: cached.fallbackReason,
      violations: [],
    };
  } else {
    const systemPrompt = buildSystemPrompt({
      countryName: currentCountry.name,
      countryCode: currentCountry.code,
      today: new Date().toISOString().slice(0, 10),
    });
    const userPrompt = buildUserPrompt({ chunks: retrieval.chunks, question });

    let rawJson;
    try {
      const rawText = await llm.complete({ systemPrompt, userPrompt, chunks: retrieval.chunks, question });
      rawJson = parseLlmJson(rawText);
    } catch {
      rawJson = null;
    }

    if (!rawJson) {
      guarded = { answer: FALLBACK_MESSAGE, citations: [], fallbackReason: FallbackReason.PROVIDER_ERROR, violations: [] };
    } else {
      guarded = guardAnswer(rawJson, retrieval.retrievedMap);
    }

    if (!guarded.fallbackReason) {
      await AiCache.create({
        key: cacheKey,
        answer: guarded.answer,
        citations: guarded.citations,
        confidence: cached?.confidence ?? "medium",
        needsOfficialHelp: false,
        fallbackReason: null,
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      });
    }
  }

  const latencyMs = Date.now() - startedAt;
  const result = {
    answer: guarded.answer,
    citations: guarded.citations,
    confidence: "medium",
    needsOfficialHelp: false,
    fallbackReason: guarded.fallbackReason,
    retrieval: { topScore: retrieval.topScore, chunkIds: retrieval.chunks.map((c) => c.articleId), passed: true },
  };

  const message = await persistAssistantMessage({ sessionId: session._id, result, model: llm.model, latencyMs });
  await logAiEvent({ userId, sessionId: session._id, countryCode, question, result, model: llm.model, embeddingModel: getEmbeddingProvider().model, latencyMs, cacheHit });

  return { session, message };
};
