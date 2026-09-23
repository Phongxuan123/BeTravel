import { normalizeVi } from "../utils/textNormalize.js";

const MAX_SECTION_CHARS = 1200;
const MIN_SECTION_CHARS = 200;
const OVERLAP_RATIO = 0.15;

/*
 * Chunking van ban phap ly theo docs/00_BeTravel_MasterPlan_v2.md Phan C.5:
 * 1. Cat theo heading markdown.
 * 2. Section >1200 ky tu -> cat theo cau, overlap 15%.
 * 3. Section <200 ky tu -> gop voi section KE (khong dung mot minh de tranh
 *    chunk qua ngan lam giam chat luong retrieval).
 * 4. Moi penalty sinh THEM 1 chunk rieng "Hanh vi X -> muc phat Y" -- cau hoi
 *    ve muc phat la loai pho bien nhat.
 * 5. Dong ngu canh duoc PREPEND rieng luc embed (textForEmbedding), KHONG luu
 *    vao text hien thi (text) -- tranh lo dong ngu canh ra cho nguoi dung.
 */

function splitByHeading(bodyMd) {
  const lines = (bodyMd || "").split("\n");
  const sections = [];
  let current = { heading: "", lines: [] };

  for (const line of lines) {
    const match = line.match(/^#{1,6}\s+(.*)/);
    if (match) {
      if (current.lines.join("\n").trim() || current.heading) sections.push(current);
      current = { heading: match[1].trim(), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.join("\n").trim() || current.heading) sections.push(current);

  return sections
    .map((s) => ({ heading: s.heading, text: s.lines.join("\n").trim() }))
    .filter((s) => s.text || s.heading);
}

function mergeShortSections(sections) {
  const merged = [];
  let i = 0;

  while (i < sections.length) {
    let acc = sections[i];
    while (acc.text.length < MIN_SECTION_CHARS && i + 1 < sections.length) {
      i += 1;
      const next = sections[i];
      const nextBlock = next.heading ? `${next.heading}\n${next.text}` : next.text;
      acc = { heading: acc.heading || next.heading, text: `${acc.text}\n\n${nextBlock}`.trim() };
    }
    merged.push(acc);
    i += 1;
  }

  return merged;
}

// Tach cau tho: dau cham/hoi/than roi khoang trang. Du dung cho van ban phap
// ly tieng Viet (khong can thu vien NLP rieng, Rule 9 KISS).
function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
}

function splitLongSection(section) {
  if (section.text.length <= MAX_SECTION_CHARS) return [section];

  const sentences = splitSentences(section.text);
  const chunks = [];
  let current = [];
  let currentLen = 0;

  for (const sentence of sentences) {
    if (currentLen + sentence.length > MAX_SECTION_CHARS && current.length > 0) {
      chunks.push(current.join(" "));

      const overlapBudget = Math.floor(currentLen * OVERLAP_RATIO);
      const carry = [];
      let carryLen = 0;
      for (let j = current.length - 1; j >= 0 && carryLen < overlapBudget; j -= 1) {
        carry.unshift(current[j]);
        carryLen += current[j].length;
      }
      current = carry;
      currentLen = carryLen;
    }
    current.push(sentence);
    currentLen += sentence.length;
  }
  if (current.length) chunks.push(current.join(" "));

  return chunks.map((text) => ({ heading: section.heading, text }));
}

function formatDate(value) {
  if (!value) return "chưa rõ";
  return new Date(value).toISOString().slice(0, 10);
}

function buildContextLine(article, { countryName, topicName } = {}) {
  return (
    `[Quốc gia: ${countryName || article.countryCode}] ` +
    `[Chủ đề: ${topicName || article.topicSlug}] ` +
    `[Bài: ${article.title}] ` +
    `[Hiệu lực từ: ${formatDate(article.effectiveFrom)}]`
  );
}

function buildPenaltyChunks(penalties = []) {
  return penalties.map((p) => ({
    heading: "Mức phạt",
    kind: "penalty",
    text: p.note
      ? `Hành vi "${p.behavior}" → mức phạt: ${p.amountText} (${p.note})`
      : `Hành vi "${p.behavior}" → mức phạt: ${p.amountText}`,
  }));
}

/**
 * @param {object} article LegalArticle (đã lean/toObject)
 * @param {{countryName?:string, topicName?:string}} context tên hiển thị cho dòng ngữ cảnh
 * @returns {{heading:string, text:string, textNorm:string, textForEmbedding:string, order:number, kind:'body'|'penalty'}[]}
 */
export function chunkArticle(article, context = {}) {
  const sourceText = article.bodyMd?.trim() || article.summaryVi?.trim() || "";
  const sections = mergeShortSections(splitByHeading(sourceText));
  const bodySplit = sections.flatMap(splitLongSection).map((s) => ({ ...s, kind: "body" }));
  const penaltyChunks = buildPenaltyChunks(article.penalties);

  const contextLine = buildContextLine(article, context);

  return [...bodySplit, ...penaltyChunks]
    .filter((c) => c.text.trim())
    .map((c, index) => ({
      heading: c.heading || "",
      text: c.text.trim(),
      textNorm: normalizeVi(c.text),
      textForEmbedding: `${contextLine}\n${c.text.trim()}`,
      order: index,
      kind: c.kind,
    }));
}
