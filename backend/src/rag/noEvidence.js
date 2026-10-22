import { AI_COVERAGE_GAPS } from "../core/aiCoverageGaps.js";
import { AU_LAW_TOPICS } from "../core/auLawTopics.js";
import { containsPhrase } from "../utils/textNormalize.js";
import { FALLBACK_MESSAGE } from "./guard.js";

/*
 * Lời từ chối khi không đủ bằng chứng (INSUFFICIENT_EVIDENCE) do CODE soạn, không gọi LLM, nên
 * không thể bịa nội dung pháp lý. Thay vì một câu chung chung, nói rõ:
 *   1. câu hỏi thuộc chủ đề kho CHƯA có (core/aiCoverageGaps.js): lý do + nơi tra cứu chính thức;
 *   2. còn lại: lời từ chối chuẩn + các chủ đề AI đang trả lời được, để người dùng hỏi lại đúng chỗ.
 */
const COVERED_TOPICS_BY_COUNTRY = Object.freeze({
  AU: AU_LAW_TOPICS.map((topic) =>
    topic.aiScopeHint ? `${topic.label} (${topic.aiScopeHint})` : topic.label,
  ),
});

// beforeSearch: chỉ xét các mục được phép trả lời ngay, trước khi tìm trong kho.
export const findCoverageGap = (question, countryCode, { beforeSearch = false } = {}) =>
  (AI_COVERAGE_GAPS[countryCode] ?? []).find(
    (gap) =>
      (!beforeSearch || gap.answerBeforeSearch) &&
      gap.triggers.some((trigger) => containsPhrase(question, trigger)),
  ) ?? null;

const bulletList = (items) => items.map((item) => `- ${item}`).join("\n");

const gapAnswer = (gap) =>
  [
    `**${gap.label}: chưa có trong dữ liệu của Be.Travel**`,
    gap.reason,
    gap.generalInfo.length ? `**Thông tin chung**\n${bulletList(gap.generalInfo)}` : null,
    `**Tra cứu chính thức**\n${bulletList(gap.officialLinks.map((link) => `${link.label}: ${link.url}`))}`,
  ]
    .filter(Boolean)
    .join("\n\n");

const coveredTopicsHint = (countryCode, countryName) => {
  const topics = COVERED_TOPICS_BY_COUNTRY[countryCode];
  if (!topics?.length) return null;
  return `**Be.Travel AI đang trả lời được luật ${countryName} về**\n${bulletList(topics)}`;
};

export const buildNoEvidenceAnswer = ({ question, countryCode, countryName }) => {
  const gap = findCoverageGap(question, countryCode);
  if (gap) return gapAnswer(gap);
  return [FALLBACK_MESSAGE, coveredTopicsHint(countryCode, countryName)]
    .filter(Boolean)
    .join("\n\n");
};
