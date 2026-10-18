/*
 * Rút văn bản từ file XHTML trong EPUB của Federal Register of Legislation.
 * Mỗi đoạn luật là một thẻ <p class="..."> (class do nguồn đặt: paragraph,
 * subsection, SubsectionHead, TOC5, notetext, ...). Không dùng thư viện parse
 * HTML vì cấu trúc phẳng và file có thể 3-4 MB; regex tuyến tính là đủ và nhẹ.
 */

const NAMED_ENTITIES = Object.freeze({
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
});

const BLOCK_PATTERN = /<p\b([^>]*)>([\s\S]*?)<\/p>/g;
const CLASS_PATTERN = /\bclass="([^"]*)"/;
const TAG_PATTERN = /<[^>]+>/g;
const ENTITY_PATTERN = /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi;

const decodeEntity = (match, body) => {
  const lower = body.toLowerCase();
  if (lower.startsWith("#x")) return safeFromCodePoint(Number.parseInt(lower.slice(2), 16), match);
  if (lower.startsWith("#")) return safeFromCodePoint(Number.parseInt(lower.slice(1), 10), match);
  return NAMED_ENTITIES[lower] ?? match;
};

const safeFromCodePoint = (codePoint, fallback) => {
  const isValid = Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff;
  return isValid ? String.fromCodePoint(codePoint) : fallback;
};

const toPlainText = (innerHtml) =>
  innerHtml
    .replace(TAG_PATTERN, "")
    .replace(ENTITY_PATTERN, decodeEntity)
    // Ký tự \s trong JS đã gồm cả nbsp (&#xa0;) mà nguồn dùng làm khoảng đệm thụt lề.
    .replace(/\s+/g, " ")
    .trim();

// Phân loại theo tên class do nguồn đặt. Mục lục (TOC*) trùng lặp với nội dung nên bỏ qua.
export const classifyBlock = (className) => {
  if (/^TOC/i.test(className)) return "toc";
  if (/head/i.test(className)) return "heading";
  if (/^note/i.test(className)) return "note";
  return "text";
};

export const extractBlocks = (html) => {
  const blocks = [];
  for (const [, attributes, innerHtml] of html.matchAll(BLOCK_PATTERN)) {
    const className = CLASS_PATTERN.exec(attributes)?.[1] ?? "";
    const kind = classifyBlock(className);
    const text = toPlainText(innerHtml);
    // className giữ lại để tầng tóm lược nhận ra tiêu đề dài (LongT) và Chương/Phần (ActHead1/2).
    if (kind !== "toc" && text) blocks.push({ kind, text, className });
  }
  return blocks;
};
