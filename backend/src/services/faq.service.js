import ApprovedFaq, { FaqStatus } from "../models/ApprovedFaq.js";
import AiEvent from "../models/AiEvent.js";
import ChatMessage from "../models/ChatMessage.js";
import LegalChunk from "../models/LegalChunk.js";
import { ChatRole } from "../core/constants.js";
import { env } from "../core/env.js";
import { QuestionRoute } from "../rag/scope.js";
import { uniqueTerms } from "../rag/lexical.js";
import { areSourcesCurrent } from "../rag/retrieval.js";
import { scoreQuestionSimilarity } from "../rag/questionSimilarity.js";

/*
 * Câu trả lời đã duyệt cho câu hỏi lặp lại (G6, docs/AI_FEATURE_PLAN.md mục 6).
 * - Đề xuất: lọc sơ bộ ai_events 15 ngày theo từ khoá chung, rồi AI chấm mức trùng lặp nội dung;
 *   chỉ câu được AI chấm >= FAQ_AI_MIN_SIMILARITY mới vào nhóm, nhóm đủ số lần lặp mới hiện cho admin.
 * - Duyệt: lưu NGUYÊN VĂN một câu trả lời AI đã sinh kèm phiên bản từng nguồn được trích.
 * - Phát: câu hỏi mới giống FAQ đủ ngưỡng và nguồn còn hiệu lực thì trả FAQ, không gọi LLM.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
// Đủ cho 15 ngày ở quy mô hiện tại; gom nhóm chạy trong RAM khi admin mở trang.
const MAX_EVENTS_FOR_CANDIDATES = 3000;
const MAX_QUESTIONS_SHOWN = 5;
const MAX_ANSWERS_SHOWN = 3;
// Cảnh báo admin (không tự gỡ) khi FAQ bị chê nhiều: từ 3 lượt "Không hữu ích" và trên 30% lượt chấm.
const WARNING_MIN_DOWN = 3;
const WARNING_DOWN_RATIO = 0.3;
const SOURCES_CHANGED_REASON = "Nguồn luật đã đổi phiên bản hoặc bị gỡ, cần duyệt lại.";
const MARKER_PATTERN = /^S(\d+)$/;

// Test thay AI chấm trùng lặp bằng hàm giả (không gọi model).
let similarityScorer = scoreQuestionSimilarity;
export const __setSimilarityScorerForTest = (scorer) => {
  similarityScorer = scorer ?? scoreQuestionSimilarity;
};

// Từ khoá để so câu cùng ý: ưu tiên danh sách tiếng Anh (khái niệm pháp lý ổn định hơn cách
// diễn đạt tiếng Việt), không có thì dùng tiếng Việt, cuối cùng là chính câu hỏi.
export function faqTermsFor({ question, keywords }) {
  const englishTerms = uniqueTerms(keywords?.en ?? []);
  if (englishTerms.length > 0) return englishTerms;
  const vietnameseTerms = uniqueTerms(keywords?.vi ?? []);
  return vietnameseTerms.length > 0 ? vietnameseTerms : uniqueTerms([question]);
}

export function jaccardSimilarity(left, right) {
  if (left.length === 0 || right.length === 0) return 0;
  const rightSet = new Set(right);
  const shared = new Set(left.filter((term) => rightSet.has(term))).size;
  return shared / new Set([...left, ...right]).size;
}

// ── Phát FAQ khi người dùng hỏi ────────────────────────────────────────────

/**
 * FAQ active cùng quốc gia giống câu hỏi nhất (>= FAQ_MATCH_MIN_SIMILARITY) và nguồn còn hiệu lực.
 * FAQ khớp nhưng nguồn đã đổi bị chuyển needs_review ngay để lần sau không kiểm lại vô ích.
 */
export async function findServableFaq({ countryCode, terms }) {
  if (terms.length === 0) return null;
  const faqs = await ApprovedFaq.find({ countryCode, status: FaqStatus.ACTIVE }).lean();
  const ranked = faqs
    .map((faq) => ({ faq, similarity: jaccardSimilarity(faq.keywordTerms, terms) }))
    .filter(({ similarity }) => similarity >= env.FAQ_MATCH_MIN_SIMILARITY)
    .sort((a, b) => b.similarity - a.similarity);

  for (const { faq } of ranked) {
    if (await areSourcesCurrent(faq.sources)) return faq;
    await ApprovedFaq.updateOne(
      { _id: faq._id, status: FaqStatus.ACTIVE },
      { $set: { status: FaqStatus.NEEDS_REVIEW, statusReason: SOURCES_CHANGED_REASON } },
    );
  }
  return null;
}

// ── Đề xuất cho admin ──────────────────────────────────────────────────────

// Lọc sơ bộ RẺ (không gọi AI): câu có từ khoá chung với BẤT KỲ câu nào trong nhóm thì vào nhóm (gộp các
// nhóm cùng được nối), để cách hỏi khác nhau không bị tách sớm. Chỉ quyết định câu nào cần AI chấm.
function prefilterByKeywords(events) {
  let buckets = [];
  for (const event of events) {
    const overlaps = (member) =>
      member.countryCode === event.countryCode &&
      jaccardSimilarity(member.keywordTerms, event.keywordTerms) >= env.FAQ_PREFILTER_MIN_OVERLAP;
    const linked = buckets.filter((bucket) => bucket.events.some(overlaps));
    const merged = {
      countryCode: event.countryCode,
      events: [...linked.flatMap((bucket) => bucket.events), event],
    };
    buckets = [...buckets.filter((bucket) => !linked.includes(bucket)), merged];
  }
  return buckets;
}

const mostAskedQuestion = (events) => {
  const counts = new Map();
  for (const { question } of events) counts.set(question, (counts.get(question) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
};

/*
 * Tách một nhóm lọc sơ bộ thành các nhóm đã được AI xác nhận: lấy câu hỏi nhiều nhất làm câu gốc, AI chấm
 * mọi câu còn lại; câu đạt ngưỡng vào nhóm, phần còn lại lặp lại với câu gốc mới. AI lỗi --> dừng, không
 * đưa nhóm chưa kiểm lên cho admin.
 */
async function splitBySimilarity(bucket) {
  const groups = [];
  let remaining = bucket.events;
  while (remaining.length >= env.FAQ_MIN_REPEAT) {
    const representative = mostAskedQuestion(remaining);
    const scores = await similarityScorer(
      representative,
      remaining.map((event) => event.question),
    );
    if (!scores) break;
    const isSimilar = (event) => (scores.get(event.question) ?? 0) >= env.FAQ_AI_MIN_SIMILARITY;
    const similarEvents = remaining.filter(isSimilar);
    remaining = remaining.filter((event) => !isSimilar(event));
    if (similarEvents.length < env.FAQ_MIN_REPEAT) continue;
    groups.push({
      countryCode: bucket.countryCode,
      representative,
      keywordTerms: similarEvents.find((event) => event.question === representative).keywordTerms,
      minSimilarity: Math.min(...similarEvents.map((event) => scores.get(event.question))),
      events: similarEvents,
    });
  }
  return groups;
}

// Câu hỏi đã có FAQ (mọi trạng thái, kể cả bỏ qua/đã gỡ) có trùng nội dung với câu đang xét không, theo AI.
async function findSimilarFaq(question, countryCode, keywordTerms, faqs) {
  const nearby = faqs.filter(
    (faq) =>
      faq.countryCode === countryCode &&
      jaccardSimilarity(faq.keywordTerms, keywordTerms) >= env.FAQ_PREFILTER_MIN_OVERLAP,
  );
  if (nearby.length === 0) return { found: false };
  const scores = await similarityScorer(
    question,
    nearby.map((faq) => faq.question),
  );
  if (!scores) return { found: null };
  return {
    found: nearby.some((faq) => (scores.get(faq.question) ?? 0) >= env.FAQ_AI_MIN_SIMILARITY),
  };
}

const countFeedback = (messages) => ({
  up: messages.filter((message) => message.feedback === "up").length,
  down: messages.filter((message) => message.feedback === "down").length,
});

async function toCandidateView(group) {
  const messages = await ChatMessage.find({ _id: { $in: group.events.map((e) => e.messageId) } })
    .select("text sections citations feedback createdAt")
    .sort({ createdAt: -1 })
    .lean();
  const seenAnswers = new Set();
  const answers = messages
    .filter((message) => !seenAnswers.has(message.text) && seenAnswers.add(message.text))
    .slice(0, MAX_ANSWERS_SHOWN)
    .map((message) => ({
      messageId: message._id,
      text: message.text,
      sections: message.sections ?? null,
      citations: message.citations ?? [],
      createdAt: message.createdAt,
    }));
  const otherQuestions = [...new Set(group.events.map((event) => event.question))].filter(
    (question) => question !== group.representative,
  );
  return {
    countryCode: group.countryCode,
    count: group.events.length,
    // Câu gốc đứng đầu; minSimilarity = điểm trùng lặp thấp nhất AI chấm trong nhóm.
    questions: [group.representative, ...otherQuestions].slice(0, MAX_QUESTIONS_SHOWN),
    minSimilarity: group.minSimilarity,
    keywordTerms: group.keywordTerms,
    answers,
    feedback: countFeedback(messages),
  };
}

export async function listFaqCandidates({ countryCode } = {}) {
  const since = new Date(Date.now() - env.FAQ_WINDOW_DAYS * DAY_MS);
  const countryFilter = countryCode ? { countryCode } : {};
  const events = await AiEvent.find({
    ...countryFilter,
    createdAt: { $gte: since },
    route: QuestionRoute.LEGAL,
    fallbackReason: null,
    answerSource: { $ne: "approved_faq" },
    messageId: { $ne: null },
    "keywordTerms.0": { $exists: true },
  })
    .sort({ createdAt: -1 })
    .limit(MAX_EVENTS_FOR_CANDIDATES)
    .lean();
  // Mọi trạng thái (kể cả dismissed/retired): nhóm đã được admin xử lý không hiện lại.
  const faqs = await ApprovedFaq.find(countryFilter)
    .select("countryCode keywordTerms question")
    .lean();

  const repeatedBuckets = prefilterByKeywords(events).filter(
    (bucket) => bucket.events.length >= env.FAQ_MIN_REPEAT,
  );
  const groups = [];
  // Tuần tự: mỗi nhóm có thể gọi AI, tránh dồn nhiều lượt cùng lúc vào giới hạn theo phút của nhà cung cấp.
  for (const bucket of repeatedBuckets) {
    for (const group of await splitBySimilarity(bucket)) {
      const { found } = await findSimilarFaq(
        group.representative,
        group.countryCode,
        group.keywordTerms,
        faqs,
      );
      if (found === false) groups.push(group);
    }
  }
  const candidates = await Promise.all(groups.map(toCandidateView));
  // Câu trả lời có thể đã bị xoá cùng phiên chat: nhóm không còn câu trả lời nào thì bỏ.
  return candidates
    .filter((candidate) => candidate.answers.length > 0)
    .sort((a, b) => b.count - a.count);
}

// ── Danh sách FAQ đã xử lý ─────────────────────────────────────────────────

export async function listFaqs({ status } = {}) {
  const filter = status ? { status } : { status: { $ne: FaqStatus.DISMISSED } };
  const faqs = await ApprovedFaq.find(filter).sort({ updatedAt: -1 }).lean();
  const stats = await ChatMessage.aggregate([
    { $match: { faqId: { $in: faqs.map((faq) => faq._id) } } },
    {
      $group: {
        _id: "$faqId",
        served: { $sum: 1 },
        up: { $sum: { $cond: [{ $eq: ["$feedback", "up"] }, 1, 0] } },
        down: { $sum: { $cond: [{ $eq: ["$feedback", "down"] }, 1, 0] } },
      },
    },
  ]);
  const statsById = new Map(stats.map((row) => [String(row._id), row]));

  return faqs.map(({ sources: _sources, ...faq }) => {
    const { served = 0, up = 0, down = 0 } = statsById.get(String(faq._id)) ?? {};
    const isPoorlyRated = down >= WARNING_MIN_DOWN && down / (up + down) > WARNING_DOWN_RATIO;
    return { ...faq, servedCount: served, feedback: { up, down }, warning: isPoorlyRated };
  });
}

// ── Duyệt / bỏ qua / đổi trạng thái ────────────────────────────────────────

// Chunk của các marker [Sn] mà câu trả lời THỰC SỰ trích (retrieval.chunkIds giữ đúng thứ tự S1..Sn).
async function buildCitedSources(message) {
  const chunkIds = [
    ...new Set(
      (message.citations ?? [])
        .map((citation) => MARKER_PATTERN.exec(citation.marker)?.[1])
        .map((index) => message.retrieval?.chunkIds?.[Number(index) - 1])
        .filter(Boolean)
        .map(String),
    ),
  ];
  const chunks = await LegalChunk.find({ _id: { $in: chunkIds } })
    .select("sourceType articleId articleVersion titleId registerId")
    .lean();
  if (chunkIds.length === 0 || chunks.length !== chunkIds.length) {
    throw new Error("FAQ_SOURCES_CHANGED");
  }
  return chunks.map((chunk) => ({
    chunkId: chunk._id,
    sourceType: chunk.sourceType ?? "article",
    articleId: chunk.articleId ?? null,
    articleVersion: chunk.articleVersion ?? null,
    titleId: chunk.titleId ?? null,
    registerId: chunk.registerId ?? null,
  }));
}

async function assertNoActiveDuplicate({ countryCode, question, keywordTerms, excludeId }) {
  const openFaqs = await ApprovedFaq.find({
    countryCode,
    status: { $in: [FaqStatus.ACTIVE, FaqStatus.NEEDS_REVIEW] },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  })
    .select("countryCode keywordTerms question")
    .lean();
  const { found } = await findSimilarFaq(question, countryCode, keywordTerms, openFaqs);
  if (found === null) throw new Error("FAQ_SIMILARITY_UNAVAILABLE");
  if (found) throw new Error("FAQ_DUPLICATE");
}

async function loadEligibleAnswer(sourceMessageId) {
  const [message, event] = await Promise.all([
    ChatMessage.findOne({ _id: sourceMessageId, role: ChatRole.ASSISTANT }).lean(),
    AiEvent.findOne({ messageId: sourceMessageId }).lean(),
  ]);
  if (!message || !event) throw new Error("FAQ_MESSAGE_NOT_FOUND");
  const isEligible =
    message.answerSource !== "approved_faq" &&
    !message.fallbackReason &&
    (message.citations ?? []).length > 0 &&
    event.route === QuestionRoute.LEGAL &&
    event.keywordTerms.length > 0;
  if (!isEligible) throw new Error("FAQ_MESSAGE_NOT_ELIGIBLE");
  return { message, event };
}

/**
 * decision 'approve': kiểm nguồn còn hiệu lực + không trùng FAQ đang mở, rồi lưu nguyên văn.
 * decision 'dismiss': chỉ ghi nhận để nhóm đó không hiện lại trong đề xuất.
 */
export async function decideFaq({ sourceMessageId, decision, adminId }) {
  const { message, event } = await loadEligibleAnswer(sourceMessageId);
  const base = {
    countryCode: event.countryCode,
    question: event.question,
    keywordTerms: event.keywordTerms,
    sourceMessageId: message._id,
    decidedBy: adminId,
    decidedAt: new Date(),
  };
  if (decision === "dismiss") {
    return ApprovedFaq.create({ ...base, status: FaqStatus.DISMISSED });
  }

  await assertNoActiveDuplicate(base);
  const sources = await buildCitedSources(message);
  if (!(await areSourcesCurrent(sources))) throw new Error("FAQ_SOURCES_CHANGED");
  return ApprovedFaq.create({
    ...base,
    answer: message.text,
    sections: message.sections ?? null,
    citations: message.citations,
    confidence: message.confidence ?? "medium",
    needsOfficialHelp: message.needsOfficialHelp ?? false,
    sources,
    status: FaqStatus.ACTIVE,
  });
}

// Gỡ (retired) hoặc kích hoạt lại (active). Kích hoạt lại phải qua kiểm nguồn và kiểm trùng.
export async function setFaqStatus({ faqId, status, adminId }) {
  const faq = await ApprovedFaq.findById(faqId);
  if (!faq || faq.status === FaqStatus.DISMISSED) throw new Error("FAQ_NOT_FOUND");
  if (status === FaqStatus.ACTIVE) {
    await assertNoActiveDuplicate({
      countryCode: faq.countryCode,
      question: faq.question,
      keywordTerms: faq.keywordTerms,
      excludeId: faq._id,
    });
    if (!(await areSourcesCurrent(faq.sources))) throw new Error("FAQ_SOURCES_CHANGED");
  }
  faq.status = status;
  faq.statusReason = "";
  faq.decidedBy = adminId;
  faq.decidedAt = new Date();
  await faq.save();
  return faq;
}
