import crypto from "node:crypto";
import { mentionsCountry } from "../utils/countryAliases.js";

import ChatSession from "../models/ChatSession.js";
import ChatMessage from "../models/ChatMessage.js";
import AiCache from "../models/AiCache.js";
import AiEvent from "../models/AiEvent.js";
import Country from "../models/Country.js";
import { retrieve } from "../rag/retrieval.js";
import { buildSystemPrompt, buildUserPrompt, parseLlmJson } from "../rag/prompt.js";
import {
  guardAnswer,
  FALLBACK_MESSAGE,
  PROVIDER_BUSY_MESSAGE,
  DEFAULT_DISCLAIMER,
} from "../rag/guard.js";
import { completeWithRateLimitRetry } from "../rag/llm/rateLimitRetry.js";
import {
  classifyQuestion,
  QuestionRoute,
  buildEmergencyNotice,
  buildOutOfScopeAnswer,
  buildGreetingAnswer,
  PERSONAL_ADVICE_NOTICE,
  EMERGENCY_NO_EVIDENCE_NOTE,
} from "../rag/scope.js";
import { getLlmProvider } from "../rag/llm/index.js";
import { getEmbeddingProvider } from "../rag/embedding/index.js";
import { normalizeVi } from "../utils/textNormalize.js";
import { checkAndIncrementQuota } from "./aiUsage.service.js";
import { FallbackReason, ChatRole } from "../core/constants.js";
import { env } from "../core/env.js";
import { AppError, ErrorCode } from "../core/errors.js";

const CACHE_TTL_MS = env.AI_CACHE_TTL_HOURS * 60 * 60 * 1000;
// Tăng khi đổi prompt hoặc guard để câu trả lời cũ trong cache không còn được dùng.
const ANSWER_CACHE_VERSION = "answer-v4";
// Gói Gemini miễn phí giới hạn theo PHÚT trên cả dự án (flash-lite: 15, đã đo 20/10/2026), nên một
// lần chờ ngắn rồi thử lại cứu được phần lớn lỗi 429; chờ lâu hơn thì báo bận, không treo người dùng.
const CHAT_RATE_LIMIT_RETRIES = 1;
const CHAT_RATE_LIMIT_MAX_WAIT_MS = 20_000;

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
    .select("code name nameEn aliases majorCities")
    .lean();
  return otherCountries.find((c) => mentionsCountry(question, c)) ?? null;
}

const QUOTA_ERROR_MESSAGES = new Set(["QUOTA_EXCEEDED_USER", "QUOTA_EXCEEDED_GLOBAL"]);
const isQuotaError = (error) => QUOTA_ERROR_MESSAGES.has(error?.message);
// Luồng không cần AI và không tốn lượt quota: lời từ chối / chào do code soạn.
const NO_AI_ROUTES = new Set([QuestionRoute.OUT_OF_SCOPE, QuestionRoute.GREETING]);

async function persistAssistantMessage({ sessionId, result, model, latencyMs }) {
  return ChatMessage.create({
    sessionId,
    role: ChatRole.ASSISTANT,
    text: result.answer,
    route: result.route ?? QuestionRoute.LEGAL,
    sections: result.sections ?? null,
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
    // Ca khẩn cấp được trả lời bằng số khẩn cấp thì message không còn là fallback, nhưng thống kê
    // khoảng trống nguồn vẫn cần biết truy hồi đã thất bại.
    fallbackReason: result.eventFallbackReason ?? result.fallbackReason,
    route: result.route ?? QuestionRoute.LEGAL,
    cacheHit,
  });
}

async function recordUserTurn(session, question) {
  if (!session.title) {
    session.title = question.slice(0, 80);
  }
  await ChatMessage.create({ sessionId: session._id, role: ChatRole.USER, text: question });
  await session.save();
}

/*
 * Trả lời bằng nội dung do CODE soạn (không gọi LLM): từ chối ngoài phạm vi, chào hỏi,
 * khác quốc gia, thiếu bằng chứng, hết quota trong ca khẩn cấp. Lưu cả tin nhắn lẫn
 * ai_event để thống kê đầy đủ.
 */
async function replyWithoutLlm({ session, userId, question, startedAt, result, embeddingModel }) {
  const latencyMs = Date.now() - startedAt;
  const message = await persistAssistantMessage({
    sessionId: session._id,
    result,
    model: "none",
    latencyMs,
  });
  await logAiEvent({
    userId,
    sessionId: session._id,
    countryCode: session.countryCode,
    question,
    result,
    model: "none",
    embeddingModel,
    latencyMs,
    cacheHit: false,
  });
  return { session, message };
}

// Ca khẩn cấp không có nguồn pháp lý: trả số khẩn cấp + lời nhắn, không phải fallback "thiếu dữ liệu".
const emergencyOnlyResult = (emergency, eventFallbackReason) => ({
  answer: [emergency.text, EMERGENCY_NO_EVIDENCE_NOTE, `---\n${DEFAULT_DISCLAIMER}`].join("\n\n"),
  needsOfficialHelp: true,
  fallbackReason: null,
  eventFallbackReason,
});

const emptyRetrieval = (topScore = 0) => ({ topScore, chunkIds: [], passed: false });

// Khối khẩn cấp (nếu có) luôn đứng ĐẦU câu trả lời, trước mọi nội dung do AI viết.
const withEmergencyNotice = (route, emergency, text) =>
  route === QuestionRoute.EMERGENCY ? `${emergency.text}\n\n${text}` : text;

// Lỗi provider (hết quota, mạng, timeout) không được nuốt im lặng: ghi log ngắn, không kèm key.
async function completeOrNull(llm, input) {
  try {
    return await completeWithRateLimitRetry(input, () => llm, {
      maxRetries: CHAT_RATE_LIMIT_RETRIES,
      maxWaitMs: CHAT_RATE_LIMIT_MAX_WAIT_MS,
    });
  } catch (error) {
    console.error("[chat] LLM thất bại:", String(error?.message ?? error).slice(0, 200));
    return null;
  }
}

/*
 * Gọi LLM + hậu kiểm + cache. Cache chỉ lưu câu trả lời ĐÃ QUA guard; `regenerate` bỏ
 * qua lần đọc cache (nút "Tạo lại") nhưng vẫn ghi đè kết quả mới.
 */
async function generateGuardedAnswer({
  llm,
  retrieval,
  question,
  currentCountry,
  route,
  allowedNumbers,
  regenerate,
}) {
  const cacheKey = buildCacheKey(
    question,
    currentCountry.code,
    retrieval.chunks,
    `${llm.model}:${ANSWER_CACHE_VERSION}${route === QuestionRoute.PERSONAL_ADVICE ? ":advice" : ""}`,
  );
  // TTL Mongo dọn theo chu kỳ, do đó phải tự lọc thời điểm hết hạn khi đọc.
  const cached = regenerate
    ? null
    : await AiCache.findOne({ key: cacheKey, expiresAt: { $gt: new Date() } }).lean();
  if (cached) {
    return {
      guarded: {
        answer: cached.answer,
        sections: cached.sections ?? null,
        citations: cached.citations,
        fallbackReason: cached.fallbackReason,
        violations: [],
      },
      confidence: cached.confidence ?? "low",
      needsOfficialHelp: cached.needsOfficialHelp ?? false,
      cacheHit: true,
    };
  }

  const systemPrompt = buildSystemPrompt({
    countryName: currentCountry.name,
    countryCode: currentCountry.code,
    today: new Date().toISOString().slice(0, 10),
    personalAdvice: route === QuestionRoute.PERSONAL_ADVICE,
  });
  const userPrompt = buildUserPrompt({ chunks: retrieval.chunks, question });

  const rawText = await completeOrNull(llm, {
    systemPrompt,
    userPrompt,
    chunks: retrieval.chunks,
    question,
  });
  const rawJson = rawText === null ? null : parseLlmJson(rawText);
  if (rawText !== null && rawJson === null) {
    console.error("[chat] LLM trả JSON không hợp lệ, độ dài:", rawText.length);
  }

  if (!rawJson) {
    return {
      guarded: {
        answer: PROVIDER_BUSY_MESSAGE,
        sections: null,
        citations: [],
        fallbackReason: FallbackReason.PROVIDER_ERROR,
        violations: [],
      },
      confidence: "low",
      needsOfficialHelp: false,
      cacheHit: false,
    };
  }

  const disclaimer =
    route === QuestionRoute.PERSONAL_ADVICE
      ? `${PERSONAL_ADVICE_NOTICE}\n\n${DEFAULT_DISCLAIMER}`
      : DEFAULT_DISCLAIMER;
  const guarded = guardAnswer(rawJson, retrieval.retrievedMap, disclaimer, {
    allowedNumbers,
    countryName: currentCountry.name,
  });
  if (guarded.violations.length > 0) {
    // Chỉ tên vi phạm (không kèm nội dung) để theo dõi chất lượng prompt/guard.
    console.warn("[chat] guard:", guarded.violations.join(","));
  }
  const confidence = guarded.fallbackReason ? "low" : rawJson.confidence;
  const needsOfficialHelp = rawJson.needsOfficialHelp;

  if (!guarded.fallbackReason) {
    const cacheValue = {
      answer: guarded.answer,
      sections: guarded.sections,
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
  return { guarded, confidence, needsOfficialHelp, cacheHit: false };
}

/*
 * Pipeline chat day du -- day la noi DUY NHAT lap rap phan luong + retrieval + prompt +
 * guard + cache + quota. Controller chi goi ham nay, khong biet chi tiet ben trong.
 * Thu tu: phan luong bang code --> (quota) --> khac quoc gia --> retrieval --> LLM --> guard.
 */
export const sendMessage = async ({
  userId,
  sessionId,
  question,
  focusArticleId,
  regenerate = false,
}) => {
  const session = await ChatSession.findOne({ _id: sessionId, userId });
  if (!session) throw new Error("CHAT_SESSION_NOT_FOUND");

  const startedAt = Date.now();
  const countryCode = session.countryCode;
  const currentCountry = await Country.findOne({ code: countryCode }).lean();
  if (!currentCountry) throw new AppError(ErrorCode.VALIDATION_ERROR, "Quốc gia không tồn tại");

  const { route } = classifyQuestion(question);
  const emergency = buildEmergencyNotice(currentCountry);
  const baseResult = { route, citations: [], retrieval: emptyRetrieval() };

  // Ngoài phạm vi / chào hỏi: không gọi AI, không tốn lượt quota.
  if (NO_AI_ROUTES.has(route)) {
    await recordUserTurn(session, question);
    const isGreeting = route === QuestionRoute.GREETING;
    return replyWithoutLlm({
      session,
      userId,
      question,
      startedAt,
      embeddingModel: "none",
      result: {
        ...baseResult,
        answer: isGreeting
          ? buildGreetingAnswer(currentCountry.name)
          : buildOutOfScopeAnswer(currentCountry.name),
        confidence: "high",
        needsOfficialHelp: false,
        fallbackReason: FallbackReason.OUT_OF_SCOPE,
      },
    });
  }

  // Ca khẩn cấp vẫn phải nhận được số khẩn cấp khi người dùng hết lượt AI.
  try {
    await checkAndIncrementQuota(userId);
  } catch (error) {
    if (route !== QuestionRoute.EMERGENCY || !isQuotaError(error)) throw error;
    await recordUserTurn(session, question);
    return replyWithoutLlm({
      session,
      userId,
      question,
      startedAt,
      embeddingModel: "none",
      result: {
        ...baseResult,
        answer: `${emergency.text}\n\n---\n${DEFAULT_DISCLAIMER}`,
        confidence: "high",
        needsOfficialHelp: true,
        fallbackReason: null,
      },
    });
  }

  await recordUserTurn(session, question);

  const otherCountry = await detectOtherCountryMention(question, currentCountry);
  if (otherCountry) {
    return replyWithoutLlm({
      session,
      userId,
      question,
      startedAt,
      embeddingModel: "none",
      result: {
        ...baseResult,
        answer:
          `Dữ liệu hiện có trong Be.Travel chỉ dành cho ${currentCountry.name} (quốc gia bạn đang chọn). ` +
          `Để xem thông tin về ${otherCountry.name}, hãy đổi quốc gia đang chọn trong ứng dụng rồi hỏi lại.\n\n---\n${DEFAULT_DISCLAIMER}`,
        confidence: "high",
        needsOfficialHelp: false,
        fallbackReason: FallbackReason.INSUFFICIENT_EVIDENCE,
      },
    });
  }

  let retrieval;
  try {
    retrieval = await retrieve({ question, countryCode, focusArticleId });
  } catch (error) {
    console.error("[chat] Truy hồi thất bại:", error.name);
    retrieval = { passed: false, reason: FallbackReason.PROVIDER_ERROR, topScore: 0, chunks: [] };
  }

  if (!retrieval.passed) {
    const isEmergency = route === QuestionRoute.EMERGENCY;
    const noEvidenceReason = retrieval.reason ?? FallbackReason.INSUFFICIENT_EVIDENCE;
    return replyWithoutLlm({
      session,
      userId,
      question,
      startedAt,
      embeddingModel: getEmbeddingProvider().model,
      result: {
        ...baseResult,
        ...(isEmergency
          ? emergencyOnlyResult(emergency, noEvidenceReason)
          : {
              answer: FALLBACK_MESSAGE,
              needsOfficialHelp: false,
              fallbackReason: noEvidenceReason,
            }),
        confidence: isEmergency ? "high" : "low",
        retrieval: emptyRetrieval(retrieval.topScore),
      },
    });
  }

  const llm = getLlmProvider();
  const { guarded, confidence, needsOfficialHelp, cacheHit } = await generateGuardedAnswer({
    llm,
    retrieval,
    question,
    currentCountry,
    route,
    allowedNumbers: emergency.numbers,
    regenerate,
  });

  const latencyMs = Date.now() - startedAt;
  const retrievalMeta = {
    topScore: retrieval.topScore,
    chunkIds: retrieval.chunks.map((c) => c.chunkId),
    passed: true,
  };
  // Ca khẩn cấp mà AI/guard không cho ra câu trả lời dùng được: giữ số khẩn cấp, bỏ lời fallback.
  const result =
    route === QuestionRoute.EMERGENCY && guarded.fallbackReason
      ? {
          ...baseResult,
          ...emergencyOnlyResult(emergency, guarded.fallbackReason),
          confidence: "high",
          retrieval: retrievalMeta,
        }
      : {
          route:
            guarded.fallbackReason === FallbackReason.OUT_OF_SCOPE
              ? QuestionRoute.OUT_OF_SCOPE
              : route,
          answer: withEmergencyNotice(route, emergency, guarded.answer),
          sections: guarded.sections ?? null,
          citations: guarded.citations,
          confidence,
          needsOfficialHelp: needsOfficialHelp || route === QuestionRoute.EMERGENCY,
          fallbackReason: guarded.fallbackReason,
          retrieval: retrievalMeta,
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
