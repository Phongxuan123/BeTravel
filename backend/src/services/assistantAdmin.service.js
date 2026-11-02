import AiEvent from "../models/AiEvent.js";
import AssistantConversation from "../models/AssistantConversation.js";
import AssistantMessage from "../models/AssistantMessage.js";
import { AssistantKind, AssistantRole } from "../core/constants.js";
import { buildPageMeta, parsePagination } from "../core/pagination.js";
import { maskPersonalData } from "../utils/maskPersonalData.js";

/*
 * So lieu tro ly AI ban 2 cho Admin (H1, F5): nhat ky hoi-dap da an thong tin ca nhan va bieu
 * do chi phi / luot hoi / do tre / ty le tu choi. Chi doc -- khong sua du lieu hoi thoai.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_METRICS_DAYS = 30;
const REFUSAL_KINDS = [AssistantKind.REFUSE_SCOPE, AssistantKind.REFUSE_HARM];
const COST_DECIMALS = 2;
const RATE_DECIMALS = 3;

const roundTo = (value, decimals) => Number(value.toFixed(decimals));

// ── Nhat ky hoi-dap ──────────────────────────────────────────────────────

// Cau hoi = tin nguoi dung gan nhat KHONG sau cau tra loi trong cung cuoc tro chuyen.
const questionLookup = {
  $lookup: {
    from: AssistantMessage.collection.name,
    localField: "conversationId",
    foreignField: "conversationId",
    let: { answeredAt: "$createdAt" },
    pipeline: [
      { $match: { role: AssistantRole.USER, $expr: { $lte: ["$createdAt", "$$answeredAt"] } } },
      { $sort: { createdAt: -1 } },
      { $limit: 1 },
      { $project: { content: 1 } },
    ],
    as: "question",
  },
};

// Telemetry cua lan sinh gan nhat (tra loi lai ghi them ai_event cho cung messageId).
const telemetryLookup = {
  $lookup: {
    from: AiEvent.collection.name,
    localField: "_id",
    foreignField: "messageId",
    pipeline: [
      { $sort: { createdAt: -1 } },
      { $limit: 1 },
      {
        $project: {
          _id: 0,
          latencyMs: 1,
          promptTokens: 1,
          completionTokens: 1,
          costEstimateVnd: 1,
          guardViolations: 1,
        },
      },
    ],
    as: "telemetry",
  },
};

const toTelemetry = (event) =>
  event
    ? {
        latencyMs: event.latencyMs ?? 0,
        promptTokens: event.promptTokens ?? 0,
        completionTokens: event.completionTokens ?? 0,
        costEstimateVnd: roundTo(event.costEstimateVnd ?? 0, COST_DECIMALS),
        guardViolations: event.guardViolations ?? 0,
      }
    : null;

// [!] Chi chon field duoc phep: KHONG tra userId/conversationId/ten/email nguoi hoi.
const toQaItem = (row) => ({
  id: String(row._id),
  question: maskPersonalData(row.question[0]?.content ?? ""),
  answer: maskPersonalData(row.content),
  countryCode: row.countryCode ?? null,
  kind: row.kind,
  sourceTier: row.sourceTier,
  detailed: Boolean(row.detailed),
  citations: (row.citations ?? []).map(({ n, title }) => ({ n, title })),
  telemetry: toTelemetry(row.telemetry[0]),
  createdAt: row.createdAt,
});

const conversationCountryLookup = {
  $lookup: {
    from: AssistantConversation.collection.name,
    localField: "conversationId",
    foreignField: "_id",
    pipeline: [{ $project: { _id: 0, countryCode: 1 } }],
    as: "conversation",
  },
};

export async function listQaLog({ sourceTier, kind, page, limit } = {}) {
  const pagination = parsePagination({ page, limit });
  const filter = {
    role: AssistantRole.ASSISTANT,
    ...(sourceTier ? { sourceTier } : {}),
    ...(kind ? { kind } : {}),
  };
  const [rows, total] = await Promise.all([
    AssistantMessage.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1, _id: -1 } },
      { $skip: pagination.skip },
      { $limit: pagination.limit },
      questionLookup,
      telemetryLookup,
      conversationCountryLookup,
      { $set: { countryCode: { $first: "$conversation.countryCode" } } },
    ]),
    AssistantMessage.countDocuments(filter),
  ]);
  return { items: rows.map(toQaItem), meta: buildPageMeta(pagination, total) };
}

// ── Bieu do (ngay theo UTC, giong han muc ngay o aiUsage.service.js) ─────

const toDateKey = (date) => date.toISOString().slice(0, 10);

const startOfUtcDay = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

// Phan vi theo hang gan nhat (nearest-rank); mang rong = 0.
const percentile = (sortedValues, ratio) => {
  if (sortedValues.length === 0) return 0;
  const rank = Math.max(1, Math.ceil(ratio * sortedValues.length));
  return sortedValues[rank - 1];
};

const summarize = ({ questions, costEstimateVnd, refusals, latencies }) => {
  const sorted = [...latencies].sort((a, b) => a - b);
  return {
    questions,
    costEstimateVnd: roundTo(costEstimateVnd, COST_DECIMALS),
    p50LatencyMs: percentile(sorted, 0.5),
    p90LatencyMs: percentile(sorted, 0.9),
    refusals,
    refusalRate: questions > 0 ? roundTo(refusals / questions, RATE_DECIMALS) : 0,
  };
};

const EMPTY_DAY = { questions: 0, costEstimateVnd: 0, refusals: 0, guardViolations: 0 };

function groupEventsByDay(since) {
  return AiEvent.aggregate([
    // kind chi co o ai_event cua tro ly ban 2 -- loai telemetry cua tang chat cu.
    { $match: { createdAt: { $gte: since }, kind: { $ne: null } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        questions: { $sum: 1 },
        costEstimateVnd: { $sum: "$costEstimateVnd" },
        refusals: { $sum: { $cond: [{ $in: ["$kind", REFUSAL_KINDS] }, 1, 0] } },
        guardViolations: { $sum: "$guardViolations" },
        latencies: { $push: "$latencyMs" },
      },
    },
  ]);
}

export async function getAssistantMetrics({ days = DEFAULT_METRICS_DAYS, now = new Date() } = {}) {
  const today = startOfUtcDay(now);
  const since = new Date(today.getTime() - (days - 1) * DAY_MS);
  const groups = new Map((await groupEventsByDay(since)).map((group) => [group._id, group]));

  const dayKeys = Array.from({ length: days }, (_, index) =>
    toDateKey(new Date(since.getTime() + index * DAY_MS)),
  );
  const dayGroups = dayKeys.map((date) => ({
    date,
    ...EMPTY_DAY,
    latencies: [],
    ...groups.get(date),
  }));
  const totals = dayGroups.reduce(
    (sum, day) => ({
      questions: sum.questions + day.questions,
      costEstimateVnd: sum.costEstimateVnd + day.costEstimateVnd,
      refusals: sum.refusals + day.refusals,
      guardViolations: sum.guardViolations + day.guardViolations,
      latencies: sum.latencies.concat(day.latencies),
    }),
    { ...EMPTY_DAY, latencies: [] },
  );

  return {
    days,
    from: dayKeys[0],
    to: dayKeys[dayKeys.length - 1],
    totals: { ...summarize(totals), guardViolations: totals.guardViolations },
    daily: dayGroups.map((day) => ({ date: day.date, ...summarize(day) })),
  };
}
