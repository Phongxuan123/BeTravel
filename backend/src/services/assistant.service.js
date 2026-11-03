import crypto from "node:crypto";

import mongoose from "mongoose";

import AiEvent from "../models/AiEvent.js";
import AssistantConversation from "../models/AssistantConversation.js";
import AssistantMessage from "../models/AssistantMessage.js";
import Country from "../models/Country.js";
import { env } from "../core/env.js";
import { AssistantRole, CountryStatus } from "../core/constants.js";
import { answerQuestion } from "../rag/assistant/answer.js";
import { getAnswerProvider } from "../rag/assistant/providers.js";
import { checkAndIncrementQuota } from "./aiUsage.service.js";
import { isAssistantActive } from "./assistantSettings.service.js";

/*
 * Tro ly AI ban 2: luu hoi thoai, tru quota (luu DB), ghi ai_events. Logic tra loi nam o
 * rag/assistant/answer.js. Lich su tu xoa sau ASSISTANT_HISTORY_TTL_DAYS ngay (H2).
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const TITLE_LENGTH = 60;

const expiryDate = () => new Date(Date.now() + env.ASSISTANT_HISTORY_TTL_DAYS * DAY_MS);

const TOKENS_PER_PRICE_UNIT = 1_000_000;

// Khoa chinh env + cong tac Admin trong DB (H1), xem assistantSettings.service.js.
const ensureEnabled = async () => {
  if (!(await isAssistantActive())) throw new Error("ASSISTANT_DISABLED");
};

// Chi phi uoc tinh theo gia cau hinh (VND / 1 trieu token); 0 khi chua cau hinh gia.
const estimateCostVnd = ({ inputTokens, outputTokens }) =>
  (inputTokens * env.ASSISTANT_PRICE_INPUT_VND_PER_M +
    outputTokens * env.ASSISTANT_PRICE_OUTPUT_VND_PER_M) /
  TOKENS_PER_PRICE_UNIT;

export const serializeMessage = (message) => ({
  id: String(message._id),
  role: message.role,
  content: message.content,
  kind: message.kind,
  sourceTier: message.sourceTier,
  citations: message.citations,
  clarifyOptions: message.clarifyOptions,
  emergencyNumber: message.emergencyNumber,
  detailed: message.detailed,
  tripContext: message.tripContext,
  createdAt: message.createdAt,
});

const serializeConversation = (conversation) => ({
  id: String(conversation._id),
  title: conversation.title,
  countryCode: conversation.countryCode,
  updatedAt: conversation.updatedAt,
});

const toTripContext = (trip) => {
  if (!trip?.city) return null;
  const dates = [trip.startDate, trip.endDate].filter(Boolean).join(" - ");
  return dates ? `${trip.city}, ${dates}` : trip.city;
};

async function findActiveCountry(countryCode) {
  const country = await Country.findOne({ code: countryCode, status: CountryStatus.ACTIVE }).lean();
  if (!country) throw new Error("ASSISTANT_COUNTRY_UNAVAILABLE");
  return country;
}

async function findOwnedConversation(userId, conversationId) {
  const conversation = await AssistantConversation.findOne({ _id: conversationId, userId });
  if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");
  return conversation;
}

// Cac luot gan nhat TRUOC moc thoi gian `before` (de hieu cau hoi noi tiep, D1).
async function loadHistory(conversationId, before = new Date()) {
  const recent = await AssistantMessage.find({ conversationId, createdAt: { $lt: before } })
    .sort({ createdAt: -1 })
    .limit(env.ASSISTANT_HISTORY_TURNS)
    .select("role content")
    .lean();
  return recent.reverse().map(({ role, content }) => ({ role, content }));
}

// Loi mo hinh/mang khi soan cau tra loi: luot van bi tru (da phat sinh chi phi), bao loi ro rang.
async function runPipeline(params) {
  try {
    return await answerQuestion(params);
  } catch (error) {
    console.error(
      "[assistant] soan cau tra loi loi:",
      String(error?.message ?? error).slice(0, 200),
    );
    throw new Error("ASSISTANT_UPSTREAM_ERROR", { cause: error });
  }
}

function logAiEvent({ userId, countryCode, result, latencyMs, messageId }) {
  const { meta } = result;
  return AiEvent.create({
    userId,
    countryCode,
    questionHash: crypto.createHash("sha256").update(meta.question).digest("hex"),
    question: meta.question,
    chunkIds: meta.chunkIds,
    topScore: meta.topScore,
    model: getAnswerProvider().model ?? "",
    latencyMs,
    promptTokens: meta.usage.inputTokens,
    completionTokens: meta.usage.outputTokens,
    costEstimateVnd: estimateCostVnd(meta.usage),
    webSearch: meta.webSearch,
    fallbackReason: result.sourceTier,
    route: result.kind,
    messageId,
    kind: result.kind,
    sourceTier: result.sourceTier,
    guardViolations: meta.violations?.length ?? 0,
  }).catch((error) => console.error("[assistant] ghi ai_events loi:", error.message));
}

const answerFields = (result, { detailed, tripContext }) => ({
  content: result.content,
  kind: result.kind,
  sourceTier: result.sourceTier,
  citations: result.citations,
  clarifyOptions: result.clarifyOptions,
  emergencyNumber: result.emergencyNumber,
  detailed,
  tripContext,
});

async function answerAndLog({
  userId,
  country,
  message,
  history,
  tripContext,
  detailed,
  messageId,
}) {
  await checkAndIncrementQuota(userId);
  const startedAt = Date.now();
  const result = await runPipeline({ message, history, country, tripContext, detailed });
  await logAiEvent({
    userId,
    countryCode: country.code,
    result,
    latencyMs: Date.now() - startedAt,
    messageId,
  });
  return result;
}

export async function sendMessage(userId, { conversationId, countryCode, message, trip }) {
  await ensureEnabled();
  const country = await findActiveCountry(countryCode);
  const conversation = conversationId
    ? await findOwnedConversation(userId, conversationId)
    : new AssistantConversation({ userId, countryCode, title: message.slice(0, TITLE_LENGTH) });
  const history = conversationId ? await loadHistory(conversation._id) : [];
  const tripContext = toTripContext(trip);
  // Tao truoc id tin nhan tro ly de ai_event (ghi truoc khi luu tin nhan) tro dung ve no.
  const assistantMessageId = new mongoose.Types.ObjectId();

  const result = await answerAndLog({
    userId,
    country,
    message,
    history,
    tripContext,
    detailed: false,
    messageId: assistantMessageId,
  });

  const expireAt = expiryDate();
  conversation.expireAt = expireAt;
  await conversation.save();
  const userMessage = await AssistantMessage.create({
    conversationId: conversation._id,
    userId,
    role: AssistantRole.USER,
    content: message,
    expireAt,
  });
  const assistantMessage = await AssistantMessage.create({
    _id: assistantMessageId,
    conversationId: conversation._id,
    userId,
    role: AssistantRole.ASSISTANT,
    ...answerFields(result, { detailed: false, tripContext }),
    expireAt,
  });
  return {
    conversation: serializeConversation(conversation),
    userMessage: serializeMessage(userMessage),
    message: serializeMessage(assistantMessage),
  };
}

// Tra loi lai hoac "Giai thich chi tiet hon" (C2, E5): ghi de chinh tin nhan tro ly do.
export async function regenerateMessage(userId, messageId, { detailed }) {
  await ensureEnabled();
  const target = await AssistantMessage.findOne({
    _id: messageId,
    userId,
    role: AssistantRole.ASSISTANT,
  });
  if (!target) throw new Error("ASSISTANT_MESSAGE_NOT_FOUND");
  const conversation = await findOwnedConversation(userId, target.conversationId);
  const question = await AssistantMessage.findOne({
    conversationId: conversation._id,
    role: AssistantRole.USER,
    createdAt: { $lte: target.createdAt },
  }).sort({ createdAt: -1 });
  if (!question) throw new Error("ASSISTANT_MESSAGE_NOT_FOUND");
  const country = await findActiveCountry(conversation.countryCode);
  const history = await loadHistory(conversation._id, question.createdAt);

  const result = await answerAndLog({
    userId,
    country,
    message: question.content,
    history,
    tripContext: target.tripContext,
    detailed,
    messageId: target._id,
  });
  Object.assign(target, answerFields(result, { detailed, tripContext: target.tripContext }));
  await target.save();
  return { message: serializeMessage(target) };
}

export async function listConversations(userId) {
  const conversations = await AssistantConversation.find({ userId }).sort({ updatedAt: -1 }).lean();
  return conversations.map(serializeConversation);
}

export async function getConversation(userId, conversationId) {
  const conversation = await findOwnedConversation(userId, conversationId);
  const messages = await AssistantMessage.find({ conversationId }).sort({ createdAt: 1 });
  return { ...serializeConversation(conversation), messages: messages.map(serializeMessage) };
}

export async function deleteConversation(userId, conversationId) {
  const conversation = await findOwnedConversation(userId, conversationId);
  await AssistantMessage.deleteMany({ conversationId: conversation._id });
  await conversation.deleteOne();
}

export async function deleteAllConversations(userId) {
  await AssistantMessage.deleteMany({ userId });
  await AssistantConversation.deleteMany({ userId });
}
