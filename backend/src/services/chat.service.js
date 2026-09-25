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

export const createSession = async (userId, countryCode) => {
  if (!(await Country.exists({ code: countryCode, status: "active" }))) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Quốc gia chưa hỗ trợ trợ lý AI");
  }
  return ChatSession.create({ userId, countryCode });
};

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

// Doi ten phien chat (B8 muc 16) -- tieu de mac dinh lay tu cau hoi dau tien,
// nguoi dung co the dat lai ten de de tim trong "Lich su chat".
export const renameSession = async (userId, sessionId, title) => {
  const session = await ChatSession.findOneAndUpdate(
    { _id: sessionId, userId },
    { $set: { title } },
    { returnDocument: "after" },
  );
  if (!session) throw new Error("CHAT_SESSION_NOT_FOUND");
  return session;
};

// Feedback (huu ich/khong huu ich) tren TUNG cau tra loi -- dung o B5 (nut
// ThumbsUp/ThumbsDown trong AnswerCard.tsx), gan o day de sẵn cho B5 noi vao.
export const setMessageFeedback = async (userId, sessionId, messageId, feedback) => {
  const session = await ChatSession.findOne({ _id: sessionId, userId });
  if (!session) throw new Error("CHAT_SESSION_NOT_FOUND");

  const message = await ChatMessage.findOneAndUpdate(
    { _id: messageId, sessionId, role: ChatRole.ASSISTANT },
    { $set: { feedback } },
    { returnDocument: "after" },
  );
  if (!message) throw new Error("CHAT_MESSAGE_NOT_FOUND");
  return message;
};

const buildCacheKey = (question, countryCode, chunks, model) => {
  const normalized = normalizeVi(question);
  // Giữ thứ tự marker và nội dung thực tế: cùng bài nhưng chunk thay đổi
  // hoặc reindex phải có key khác. Không dùng articleId thay chunkId.
  const evidence = chunks.map(({ chunkId, marker, text, updatedAt }) => ({
    chunkId,
    marker,
    text,
    updatedAt,
  }));
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ normalized, countryCode, evidence, model }))
    .digest("hex");
};

/*
 * Quy tac 5 cua system prompt: cau hoi nhac ten mot quoc gia KHAC voi quoc
 * gia dang chon phai duoc tu choi tra loi RO RANG, khong duoc de LLM tu quyet
 * dinh (an toan hon: khong phu thuoc chat luong provider, deterministic, ret
 * tien vi khong can goi LLM). "Nhac ten" duoc phat hien bang so khop chuoi da
 * chuan hoa (khong dau), khong phai suy luan ngu nghia.
 */
async function detectOtherCountryMention(question, currentCountry) {
  const otherCountries = await Country.find({ code: { $ne: currentCountry.code } })
    .select("code name")
    .lean();
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

async function logAiEvent({
  userId,
  sessionId,
  countryCode,
  question,
  result,
  model,
  embeddingModel,
  latencyMs,
  cacheHit,
}) {
  await AiEvent.create({
    userId,
    sessionId,
    countryCode,
    questionHash: crypto.createHash("sha256").update(normalizeVi(question)).digest("hex"),
    question,
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
export const sendMessage = async ({ userId, sessionId, question, focusArticleId }) => {
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
    const message = await persistAssistantMessage({
      sessionId: session._id,
      result,
      model: "none",
      latencyMs: Date.now() - startedAt,
    });
    await logAiEvent({
      userId,
      sessionId: session._id,
      countryCode,
      question,
      result,
      model: "none",
      embeddingModel: "none",
      latencyMs: Date.now() - startedAt,
      cacheHit: false,
    });
    return { session, message };
  }

  let retrieval;
  try {
    retrieval = await retrieve({ question, countryCode, focusArticleId });
  } catch (error) {
    console.error("[chat] Truy hồi thất bại:", error.name);
    retrieval = { passed: false, reason: FallbackReason.PROVIDER_ERROR, topScore: 0, chunks: [] };
  }

  if (!retrieval.passed) {
    const result = {
      answer: FALLBACK_MESSAGE,
      citations: [],
      confidence: "low",
      needsOfficialHelp: false,
      fallbackReason: retrieval.reason ?? FallbackReason.INSUFFICIENT_EVIDENCE,
      retrieval: { topScore: retrieval.topScore, chunkIds: [], passed: false },
    };
    const message = await persistAssistantMessage({
      sessionId: session._id,
      result,
      model: "none",
      latencyMs: Date.now() - startedAt,
    });
    await logAiEvent({
      userId,
      sessionId: session._id,
      countryCode,
      question,
      result,
      model: "none",
      embeddingModel: getEmbeddingProvider().model,
      latencyMs: Date.now() - startedAt,
      cacheHit: false,
    });
    return { session, message };
  }

  const llm = getLlmProvider();
  const cacheKey = buildCacheKey(question, countryCode, retrieval.chunks, llm.model);
  // TTL Mongo dọn theo chu kỳ, do đó phải tự lọc thời điểm hết hạn khi đọc.
  const cached = await AiCache.findOne({ key: cacheKey, expiresAt: { $gt: new Date() } }).lean();
  let confidence = cached?.confidence ?? "low";
  let needsOfficialHelp = cached?.needsOfficialHelp ?? false;
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
      const rawText = await llm.complete({
        systemPrompt,
        userPrompt,
        chunks: retrieval.chunks,
        question,
      });
      rawJson = parseLlmJson(rawText);
    } catch {
      rawJson = null;
    }

    if (!rawJson) {
      guarded = {
        answer: FALLBACK_MESSAGE,
        citations: [],
        fallbackReason: FallbackReason.PROVIDER_ERROR,
        violations: [],
      };
    } else {
      guarded = guardAnswer(rawJson, retrieval.retrievedMap);
      confidence = guarded.fallbackReason ? "low" : rawJson.confidence;
      needsOfficialHelp = rawJson.needsOfficialHelp;
    }

    if (!guarded.fallbackReason) {
      const cacheValue = {
        answer: guarded.answer,
        citations: guarded.citations,
        confidence,
        needsOfficialHelp,
        fallbackReason: null,
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      };
      try {
        await AiCache.updateOne({ key: cacheKey }, { $set: cacheValue }, { upsert: true });
      } catch (error) {
        // Hai request cùng câu hỏi có thể cùng tạo cache; câu trả lời vẫn hợp lệ.
        if (error.code !== 11000) throw error;
      }
    }
  }

  const latencyMs = Date.now() - startedAt;
  const result = {
    answer: guarded.answer,
    citations: guarded.citations,
    confidence,
    needsOfficialHelp,
    fallbackReason: guarded.fallbackReason,
    retrieval: {
      topScore: retrieval.topScore,
      chunkIds: retrieval.chunks.map((c) => c.chunkId),
      passed: true,
    },
  };

  const message = await persistAssistantMessage({
    sessionId: session._id,
    result,
    model: llm.model,
    latencyMs,
  });
  await logAiEvent({
    userId,
    sessionId: session._id,
    countryCode,
    question,
    result,
    model: llm.model,
    embeddingModel: getEmbeddingProvider().model,
    latencyMs,
    cacheHit,
  });

  return { session, message };
};
