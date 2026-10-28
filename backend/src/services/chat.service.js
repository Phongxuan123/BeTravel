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
  DECEPTION_ADVICE_REASON,
  DECEPTION_ADVICE_ANSWER,
  EMERGENCY_HYPOTHETICAL_REASON,
  EMERGENCY_NO_EVIDENCE_NOTE,
} from "../rag/scope.js";
import { getLlmProvider, getWebSearchProvider } from "../rag/llm/index.js";
import { estimateCostVnd } from "../rag/llm/cost.js";
import { retrievalModelLabel, isLexicalMode } from "../rag/embedding/index.js";
import { getQuestionKeywords } from "../rag/queryRewrite.js";
import { buildNoEvidenceAnswer, findCoverageGap } from "../rag/noEvidence.js";
import { answerFromOfficialWeb } from "../rag/webAnswer.js";
import { isTravelLegalQuestion } from "../rag/webTopicGate.js";
import { faqTermsFor, findServableFaq } from "./faq.service.js";
import {
  findExactRepeat,
  findSimilarRepeat,
  rememberAnswer,
  repeatResult,
} from "./answerMemory.service.js";
import { normalizeVi } from "../utils/textNormalize.js";
import { checkAndIncrementQuota, hasWebSearchAllowance, releaseQuota } from "./aiUsage.service.js";
import { AnswerSource, FallbackReason, ChatRole } from "../core/constants.js";
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
    answerSource: result.answerSource ?? AnswerSource.AI,
    repeated: result.repeated ?? false,
    promptTokens: result.usage?.inputTokens ?? 0,
    completionTokens: result.usage?.outputTokens ?? 0,
    faqId: result.faqId ?? null,
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
  messageId,
  keywordTerms = [],
}) {
  await AiEvent.create({
    messageId,
    keywordTerms,
    answerSource: result.answerSource ?? AnswerSource.AI,
    promptTokens: result.usage?.inputTokens ?? 0,
    completionTokens: result.usage?.outputTokens ?? 0,
    costEstimateVnd: result.usage ? estimateCostVnd(result.usage) : 0,
    webSearch: result.webSearch ?? false,
    faqId: result.faqId ?? null,
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
async function replyWithoutLlmRaw({
  session,
  userId,
  question,
  startedAt,
  result,
  embeddingModel,
  model = "none",
  keywordTerms = [],
  cacheHit = false,
}) {
  const latencyMs = Date.now() - startedAt;
  const message = await persistAssistantMessage({
    sessionId: session._id,
    result,
    model,
    latencyMs,
  });
  await logAiEvent({
    userId,
    sessionId: session._id,
    countryCode: session.countryCode,
    question,
    result,
    model,
    embeddingModel,
    latencyMs,
    cacheHit,
    messageId: message._id,
    keywordTerms,
  });
  return { session, message };
}

// FAQ đã duyệt (G6): nguyên văn câu trả lời admin đã duyệt, không gọi LLM trả lời.
const faqResult = (faq, route) => ({
  route,
  answer: faq.answer,
  sections: faq.sections ?? null,
  citations: faq.citations,
  confidence: faq.confidence,
  needsOfficialHelp: faq.needsOfficialHelp,
  fallbackReason: null,
  retrieval: { topScore: 0, chunkIds: faq.sources.map((source) => source.chunkId), passed: true },
  answerSource: "approved_faq",
  faqId: faq._id,
});

// Lỗi khi tra FAQ không được chặn câu trả lời: rơi về luồng AI bình thường.
async function findFaqOrNull(countryCode, terms) {
  try {
    return await findServableFaq({ countryCode, terms });
  } catch (error) {
    console.error("[chat] tra FAQ thất bại:", error.message);
    return null;
  }
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

// Câu hỏi luật chứa từ khoá khẩn cấp (BUG-04): trả lời pháp lý bình thường, thêm khối số khẩn cấp ở CUỐI
// để người đang gặp nạn vẫn thấy số gọi mà người hỏi luật không bị đẩy vào luồng khẩn cấp.
const withHypotheticalNotice = (isHypothetical, emergency, text) =>
  isHypothetical && !text.includes(emergency.text) ? `${text}\n\n${emergency.text}` : text;

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

  let usage = null;
  const rawText = await completeOrNull(llm, {
    systemPrompt,
    userPrompt,
    chunks: retrieval.chunks,
    question,
    maxOutputTokens: env.LLM_MAX_OUTPUT_TOKENS,
    onUsage: (reported) => {
      usage = reported;
    },
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
      usage,
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
  return { guarded, confidence, needsOfficialHelp, cacheHit: false, usage };
}

const addUsage = (left, right) =>
  left || right
    ? {
        inputTokens: (left?.inputTokens ?? 0) + (right?.inputTokens ?? 0),
        outputTokens: (left?.outputTokens ?? 0) + (right?.outputTokens ?? 0),
      }
    : null;

const webTierConfigured = (country) =>
  env.WEB_SEARCH_ENABLED &&
  (country.officialWebDomains ?? []).length > 0 &&
  getWebSearchProvider() !== null;

/*
 * Kho không đủ bằng chứng: thử tra web trên trang chính phủ (rag/webAnswer.js) trước khi từ chối.
 * Thứ tự chặn trước khi tốn tiền: đã cấu hình --> còn trần tra web hôm nay --> model nhỏ xác nhận
 * câu hỏi thuộc chủ đề (rag/webTopicGate.js). Trả về kết quả chat; tra web không ra câu trả lời
 * dùng được thì vẫn là lời từ chối có hướng dẫn tra cứu chính thức như trước.
 */
async function noEvidenceOrWebResult({
  userId,
  question,
  currentCountry,
  allowedNumbers,
  baseResult,
}) {
  const refusal = {
    ...baseResult,
    answer: buildNoEvidenceAnswer({
      question,
      countryCode: currentCountry.code,
      countryName: currentCountry.name,
    }),
    confidence: "low",
    needsOfficialHelp: false,
    fallbackReason: FallbackReason.INSUFFICIENT_EVIDENCE,
  };
  const canSearch =
    webTierConfigured(currentCountry) &&
    (await hasWebSearchAllowance(userId)) &&
    (await isTravelLegalQuestion(question, currentCountry.name));
  if (!canSearch) return { result: refusal, model: "none" };

  const provider = getWebSearchProvider();
  const web = await answerFromOfficialWeb({
    provider,
    question,
    country: currentCountry,
    allowedNumbers,
  });
  if (!web) return { result: refusal, model: provider.model };

  const spent = { usage: web.usage, webSearch: true };
  // guarded=null: model trả JSON hỏng (đã tốn tiền) --> xử lý như lỗi provider.
  const fallbackReason = web.guarded ? web.guarded.fallbackReason : FallbackReason.PROVIDER_ERROR;
  if (fallbackReason) {
    const outOfScope = fallbackReason === FallbackReason.OUT_OF_SCOPE;
    const result = outOfScope
      ? {
          ...refusal,
          answer: web.guarded.answer,
          fallbackReason,
          route: QuestionRoute.OUT_OF_SCOPE,
        }
      : refusal;
    return { result: { ...result, ...spent }, model: web.model };
  }
  return {
    model: web.model,
    result: {
      ...baseResult,
      ...spent,
      answer: web.guarded.answer,
      sections: web.guarded.sections,
      citations: web.guarded.citations,
      confidence: web.confidence,
      needsOfficialHelp: web.needsOfficialHelp,
      fallbackReason: null,
      answerSource: AnswerSource.OFFICIAL_WEB,
    },
  };
}

// Chỉ câu pháp lý thường mới dùng lại/được ghi nhớ; "Tạo lại" và câu hỏi về một bài cụ thể luôn chạy AI.
const isRepeatable = ({ route, regenerate, focusArticleId }) =>
  route === QuestionRoute.LEGAL && !regenerate && !focusArticleId;

async function rememberIfReusable({
  canRepeat,
  countryCode,
  question,
  keywordTerms,
  result,
  model,
}) {
  const reusable =
    canRepeat && !result.fallbackReason && result.answerSource !== AnswerSource.APPROVED_FAQ;
  if (reusable) await rememberAnswer({ countryCode, question, keywordTerms, result, model });
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

  const { route, reason: routeReason } = classifyQuestion(question);
  const isHypotheticalEmergency = routeReason === EMERGENCY_HYPOTHETICAL_REASON;
  const emergency = buildEmergencyNotice(currentCountry);
  const baseResult = { route, citations: [], retrieval: emptyRetrieval() };
  // Câu hỏi luật chứa từ khoá khẩn cấp: mọi lời đáp do code soạn (thiếu nguồn, hết quota...) cũng kèm số khẩn cấp.
  const replyWithoutLlm = (args) =>
    replyWithoutLlmRaw({
      ...args,
      result: isHypotheticalEmergency
        ? {
            ...args.result,
            answer: withHypotheticalNotice(true, emergency, args.result.answer),
            needsOfficialHelp: true,
          }
        : args.result,
    });

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

  // Xin hướng dẫn gian dối: lời từ chối cố định do code soạn, không gọi AI (V-07).
  if (routeReason === DECEPTION_ADVICE_REASON) {
    await recordUserTurn(session, question);
    return replyWithoutLlm({
      session,
      userId,
      question,
      startedAt,
      embeddingModel: "none",
      result: {
        ...baseResult,
        answer: `${DECEPTION_ADVICE_ANSWER}\n\n---\n${DEFAULT_DISCLAIMER}`,
        confidence: "high",
        needsOfficialHelp: true,
        fallbackReason: FallbackReason.OUT_OF_SCOPE,
      },
    });
  }

  // Câu hỏi đã được trả lời trong AI_CACHE_TTL_HOURS: dùng lại ngay, không tốn lượt AI.
  const canRepeat = isRepeatable({ route, regenerate, focusArticleId });
  const exactRepeat = canRepeat ? await findExactRepeat({ countryCode, question }) : null;
  // FAQ admin đã duyệt sau lần trả lời trước thì ưu tiên FAQ (luồng bình thường sẽ phát nó).
  const approvedFaqExists =
    exactRepeat && (await findFaqOrNull(countryCode, exactRepeat.keywordTerms)) !== null;
  if (exactRepeat && !approvedFaqExists) {
    await recordUserTurn(session, question);
    return replyWithoutLlm({
      session,
      userId,
      question,
      startedAt,
      embeddingModel: "none",
      model: exactRepeat.model,
      cacheHit: true,
      keywordTerms: exactRepeat.keywordTerms,
      result: repeatResult(exactRepeat, route),
    });
  }

  // Chủ đề kho chắc chắn chưa có (vd luật giao thông bang ở Úc): không chạy truy hồi. Có tầng tra
  // web thì đi thẳng tới đó (sau quota); không có thì trả lời ngay lý do + nơi tra cứu chính thức,
  // không tốn lượt AI. Khẩn cấp không đi nhánh này: tai nạn giao thông vẫn phải nhận số khẩn cấp.
  const coverageGap =
    route === QuestionRoute.EMERGENCY
      ? null
      : findCoverageGap(question, countryCode, { beforeSearch: true });
  // Tra web chỉ cho câu pháp lý thường: prompt tra web không có quy tắc riêng của ca khẩn cấp
  // (số khẩn cấp đứng đầu) hay ca xin tư vấn cá nhân.
  const webAllowedRoute = route === QuestionRoute.LEGAL;
  const gapGoesToWeb =
    Boolean(coverageGap) &&
    webAllowedRoute &&
    webTierConfigured(currentCountry) &&
    (await hasWebSearchAllowance(userId));
  if (coverageGap && !gapGoesToWeb) {
    await recordUserTurn(session, question);
    return replyWithoutLlm({
      session,
      userId,
      question,
      startedAt,
      embeddingModel: "none",
      result: {
        ...baseResult,
        answer: buildNoEvidenceAnswer({
          question,
          countryCode,
          countryName: currentCountry.name,
        }),
        confidence: "low",
        needsOfficialHelp: false,
        fallbackReason: FallbackReason.INSUFFICIENT_EVIDENCE,
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

  // Tra web (thay cho truy hồi + LLM trên kho) rồi lưu tin nhắn; ghi nhớ nếu trả lời được.
  const replyFromWebOrRefusal = async ({
    keywordTerms = [],
    retrievalMeta,
    fallbackModel,
    priorUsage,
  }) => {
    const { result: webOrRefusal, model } = await noEvidenceOrWebResult({
      userId,
      question,
      currentCountry,
      allowedNumbers: emergency.numbers,
      baseResult: { ...baseResult, retrieval: retrievalMeta ?? baseResult.retrieval },
    });
    // Token của lượt AI đọc kho (nếu có) cộng với lượt tra web: cả hai đều đã tốn tiền.
    const result = { ...webOrRefusal, usage: addUsage(priorUsage, webOrRefusal.usage) };
    const usedModel = model === "none" ? (fallbackModel ?? "none") : model;
    await rememberIfReusable({
      canRepeat,
      countryCode,
      question,
      keywordTerms,
      result,
      model: usedModel,
    });
    return replyWithoutLlm({
      session,
      userId,
      question,
      startedAt,
      embeddingModel: retrievalModelLabel(),
      model: usedModel,
      keywordTerms,
      result,
    });
  };

  if (gapGoesToWeb) return replyFromWebOrRefusal({});

  // Từ khoá dùng chung cho FAQ, truy hồi lexical và gom nhóm đề xuất FAQ (ai_events.keywordTerms).
  const keywords = isLexicalMode() ? await getQuestionKeywords(question) : null;
  const keywordTerms = faqTermsFor({ question, keywords });

  // Chỉ câu pháp lý thông thường mới dùng FAQ; "Tạo lại" và câu hỏi về một bài cụ thể luôn chạy AI.
  const faq = canRepeat ? await findFaqOrNull(countryCode, keywordTerms) : null;
  if (faq) {
    return replyWithoutLlm({
      session,
      userId,
      question,
      startedAt,
      embeddingModel: retrievalModelLabel(),
      model: "approved_faq",
      keywordTerms,
      result: faqResult(faq, route),
    });
  }

  // Cùng ý nhưng khác chữ với câu đã trả lời: dùng lại và trả lượt quota vừa cấp (không tốn tiền).
  const similarRepeat = canRepeat
    ? await findSimilarRepeat({ countryCode, keywordTerms, question })
    : null;
  if (similarRepeat) {
    await releaseQuota(userId).catch((error) =>
      console.error("[chat] không trả lại được lượt quota:", error.message),
    );
    return replyWithoutLlm({
      session,
      userId,
      question,
      startedAt,
      embeddingModel: retrievalModelLabel(),
      model: similarRepeat.model,
      cacheHit: true,
      keywordTerms,
      result: repeatResult(similarRepeat, route),
    });
  }

  let retrieval;
  try {
    retrieval = await retrieve({ question, countryCode, focusArticleId, keywords });
  } catch (error) {
    console.error("[chat] Truy hồi thất bại:", error.name);
    retrieval = { passed: false, reason: FallbackReason.PROVIDER_ERROR, topScore: 0, chunks: [] };
  }

  const isEmergency = route === QuestionRoute.EMERGENCY;
  if (!retrieval.passed) {
    const noEvidenceReason = retrieval.reason ?? FallbackReason.INSUFFICIENT_EVIDENCE;
    if (webAllowedRoute && noEvidenceReason === FallbackReason.INSUFFICIENT_EVIDENCE) {
      return replyFromWebOrRefusal({
        keywordTerms,
        retrievalMeta: emptyRetrieval(retrieval.topScore),
      });
    }
    return replyWithoutLlm({
      session,
      userId,
      question,
      startedAt,
      embeddingModel: retrievalModelLabel(),
      keywordTerms,
      result: {
        ...baseResult,
        ...(isEmergency
          ? emergencyOnlyResult(emergency, noEvidenceReason)
          : {
              answer:
                noEvidenceReason === FallbackReason.INSUFFICIENT_EVIDENCE
                  ? buildNoEvidenceAnswer({
                      question,
                      countryCode,
                      countryName: currentCountry.name,
                    })
                  : FALLBACK_MESSAGE,
              needsOfficialHelp: false,
              fallbackReason: noEvidenceReason,
            }),
        confidence: isEmergency ? "high" : "low",
        retrieval: emptyRetrieval(retrieval.topScore),
      },
    });
  }

  const llm = getLlmProvider();
  const { guarded, confidence, needsOfficialHelp, cacheHit, usage } = await generateGuardedAnswer({
    llm,
    retrieval,
    question,
    currentCountry,
    route,
    allowedNumbers: emergency.numbers,
    regenerate,
  });

  const retrievalMeta = {
    topScore: retrieval.topScore,
    chunkIds: retrieval.chunks.map((c) => c.chunkId),
    passed: true,
  };
  // AI đọc các đoạn truy hồi rồi tự báo không đủ dữ liệu: thử tra web như nhánh truy hồi thất bại.
  const modelFoundNothing = guarded.fallbackReason === FallbackReason.INSUFFICIENT_EVIDENCE;
  if (webAllowedRoute && modelFoundNothing) {
    return replyFromWebOrRefusal({
      keywordTerms,
      retrievalMeta: { ...retrievalMeta, passed: false },
      fallbackModel: llm.model,
      priorUsage: usage,
    });
  }

  const latencyMs = Date.now() - startedAt;
  // Ca khẩn cấp mà AI/guard không cho ra câu trả lời dùng được: giữ số khẩn cấp, bỏ lời fallback.
  const result =
    route === QuestionRoute.EMERGENCY && guarded.fallbackReason
      ? {
          ...baseResult,
          ...emergencyOnlyResult(emergency, guarded.fallbackReason),
          confidence: "high",
          retrieval: retrievalMeta,
          usage,
        }
      : {
          route:
            guarded.fallbackReason === FallbackReason.OUT_OF_SCOPE
              ? QuestionRoute.OUT_OF_SCOPE
              : route,
          // AI tự báo không đủ dữ liệu: dùng lời từ chối có hướng dẫn như nhánh truy hồi thất bại.
          answer: withHypotheticalNotice(
            isHypotheticalEmergency,
            emergency,
            withEmergencyNotice(
              route,
              emergency,
              guarded.fallbackReason === FallbackReason.INSUFFICIENT_EVIDENCE
                ? buildNoEvidenceAnswer({ question, countryCode, countryName: currentCountry.name })
                : guarded.answer,
            ),
          ),
          sections: guarded.sections ?? null,
          citations: guarded.citations,
          confidence,
          needsOfficialHelp:
            needsOfficialHelp || route === QuestionRoute.EMERGENCY || isHypotheticalEmergency,
          fallbackReason: guarded.fallbackReason,
          retrieval: retrievalMeta,
          usage,
        };

  await rememberIfReusable({
    canRepeat,
    countryCode,
    question,
    keywordTerms,
    result,
    model: llm.model,
  });
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
    embeddingModel: retrievalModelLabel(),
    latencyMs,
    cacheHit,
    messageId: message._id,
    keywordTerms,
  });

  return { session, message };
};
