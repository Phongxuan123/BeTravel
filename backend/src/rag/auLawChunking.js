import { normalizeVi } from "../utils/textNormalize.js";

/*
 * Cắt văn bản luật liên bang Úc (mảng block đã rút chữ từ EPUB, mỗi block có className do nguồn
 * đặt) thành chunk THEO ĐIỀU (section) để đưa vào RAG. Hàm thuần, không gọi mạng.
 * Quy ước class của nguồn (xem utils/legislationSections.js): ActHead1 Chương, ActHead2 Phần,
 * ActHead3/4 Mục con, ActHead5 Điều, ActHead6 Phụ lục. Mỗi chunk giữ nguyên số điều (sectionRef)
 * để câu trả lời trích đúng "s 116" và guard đối chiếu được con số với nguồn.
 */
const PART_CLASSES = Object.freeze(["ActHead1", "ActHead2"]);
const SECTION_CLASSES = Object.freeze(["ActHead5", "ActHead6"]);
const MIN_SECTIONS_FOR_SECTION_MODE = 3;
const MAX_CHUNK_CHARS = 1200;
// Điều đã bị bãi bỏ chỉ còn "[Repealed]": không có gì để truy hồi.
const MIN_BODY_CHARS = 40;
const SECTION_NUMBER = /^(\d+[A-Z]{0,3})\b/;
const COUNTRY_LABEL = "Úc";

const isBodyBlock = (block) => block.kind === "text";

const sectionRefOf = (heading) => SECTION_NUMBER.exec(heading)?.[1] ?? null;

// Gom đoạn văn vào chunk không vượt MAX_CHUNK_CHARS; một đoạn đơn lẻ dài hơn vẫn giữ nguyên.
function packParagraphs(paragraphs) {
  const chunks = [];
  let current = [];
  let length = 0;
  for (const paragraph of paragraphs) {
    if (length + paragraph.length > MAX_CHUNK_CHARS && current.length > 0) {
      chunks.push(current.join("\n"));
      current = [];
      length = 0;
    }
    current.push(paragraph);
    length += paragraph.length + 1;
  }
  if (current.length > 0) chunks.push(current.join("\n"));
  return chunks;
}

/**
 * @param {{blocks: Array<{kind:string, text:string, className?:string}>, lawName: string,
 *   topicLabel?: string}} input
 * @returns {Array<{heading:string, text:string, order:number, sectionRef:string|null,
 *   partHeading:string, textForEmbedding:string, textNorm:string}>}
 */
export function chunkAuLaw({ blocks, lawName, topicLabel = "" }) {
  const sectionCount = blocks.filter(({ className }) => SECTION_CLASSES.includes(className)).length;
  // Văn bản không dùng ActHead5 (một số instrument): mọi tiêu đề đều mở một nhóm mới.
  const hasSectionStructure = sectionCount >= MIN_SECTIONS_FOR_SECTION_MODE;
  const startsGroup = (block) =>
    hasSectionStructure ? SECTION_CLASSES.includes(block.className) : block.kind === "heading";

  const groups = [];
  let partHeading = "";
  let current = null;
  const flush = () => {
    if (current) groups.push(current);
    current = null;
  };

  for (const block of blocks) {
    if (PART_CLASSES.includes(block.className)) {
      // Tiêu đề Phần lặp ở chỗ nối hai tệp HTML: không đổi gì.
      if (block.text !== partHeading) {
        flush();
        partHeading = block.text;
      }
      continue;
    }
    if (startsGroup(block)) {
      flush();
      current = { heading: block.text, partHeading, paragraphs: [] };
      continue;
    }
    if (current && isBodyBlock(block)) current.paragraphs.push(block.text);
  }
  flush();

  const pieces = [];
  for (const group of groups) {
    const body = group.paragraphs.join("\n");
    if (body.length < MIN_BODY_CHARS) continue;
    for (const text of packParagraphs(group.paragraphs)) {
      const context =
        `[Quốc gia: ${COUNTRY_LABEL}] [Luật: ${lawName}]` +
        `${topicLabel ? ` [Chủ đề: ${topicLabel}]` : ""}` +
        `${group.partHeading ? ` [${group.partHeading}]` : ""}`;
      pieces.push({
        heading: group.heading,
        text,
        order: pieces.length,
        sectionRef: sectionRefOf(group.heading),
        partHeading: group.partHeading,
        textForEmbedding: `${context}\n${group.heading}\n${text}`,
        textNorm: normalizeVi(`${group.heading} ${text}`),
      });
    }
  }
  return pieces;
}
