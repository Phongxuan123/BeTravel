/*
 * Cắt một văn bản luật (mảng block đã rút chữ, mỗi block có className do nguồn đặt) thành các PHẦN
 * và dựng bản trích có nhãn [#chỉ số] để AI tóm tắt từng Phần mà vẫn trích dẫn được đúng đoạn.
 * Hàm thuần, không gọi mạng. Quy ước class của nguồn: ActHead1 Chương, ActHead2 Phần,
 * ActHead3/ActHead4 Mục con, ActHead5 Điều (section), ActHead6 Phụ lục (Schedule).
 */

const SEGMENT_CLASSES = Object.freeze(["ActHead1", "ActHead2", "ActHead6"]);
const FALLBACK_SEGMENT_CLASS = "ActHead3";
const SECTION_CLASS = "ActHead5";
const SUBDIVISION_CLASSES = Object.freeze(["ActHead3", "ActHead4"]);
const MIN_SEGMENTS_BEFORE_FALLBACK = 2;

export const MAX_SEGMENTS = 40;
export const MAX_DIGEST_CHARS = 30_000;
// Từ dài sang ngắn: chọn mức dài nhất mà bản trích vẫn nằm trong ngân sách ký tự.
const BODY_CHAR_LEVELS = Object.freeze([400, 200, 80, 0]);
const NUMBER_PATTERN = /\d+/g;

const isBodyBlock = (block) => block.kind === "text";

// Mỗi đoạn: { heading, headingIndex, startIndex, endIndex (không gồm) } trên mảng block gốc.
export const segmentIntoParts = (blocks) => {
  const indexed = blocks.map((block, index) => ({ ...block, index }));
  const countBoundaries = (classes) =>
    indexed.filter(({ className }) => classes.includes(className)).length;

  const boundaryClasses =
    countBoundaries(SEGMENT_CLASSES) >= MIN_SEGMENTS_BEFORE_FALLBACK
      ? SEGMENT_CLASSES
      : [...SEGMENT_CLASSES, FALLBACK_SEGMENT_CLASS];

  const segments = [];
  for (const block of indexed.filter(({ className }) => boundaryClasses.includes(className))) {
    const previous = segments.at(-1);
    // Tiêu đề lặp ở chỗ nối hai tệp HTML: coi như cùng một Phần, không tạo đoạn mới.
    if (previous && previous.heading === block.text) continue;
    segments.push({ heading: block.text, headingIndex: block.index, startIndex: block.index });
  }

  return segments.map((segment, position) => ({
    ...segment,
    endIndex: segments[position + 1]?.startIndex ?? blocks.length,
  }));
};

// Phần quá lớn (hàng trăm Điều) không vừa một bản trích: chia theo Mục con (ActHead3) để mỗi mảnh vừa ngân sách.
// Mảnh đầu giữ nguyên tiêu đề Phần cho các Điều đứng trước Mục con đầu tiên.
export const splitByDivisions = (blocks, segment) => {
  const divisions = [];
  for (let index = segment.startIndex; index < segment.endIndex; index += 1) {
    const block = blocks[index];
    if (block.className !== FALLBACK_SEGMENT_CLASS) continue;
    if (divisions.at(-1)?.text === block.text) continue;
    divisions.push({ text: block.text, startIndex: index });
  }
  if (divisions.length < MIN_SEGMENTS_BEFORE_FALLBACK) return [segment];

  const pieces = divisions.map((division, position) => ({
    heading: `${segment.heading} / ${division.text}`,
    headingIndex: division.startIndex,
    startIndex: division.startIndex,
    endIndex: divisions[position + 1]?.startIndex ?? segment.endIndex,
  }));
  // Khối đầu tiên của đoạn chính là tiêu đề Phần; có nội dung dẫn đầu khi giữa nó và Mục con đầu còn khối khác.
  const hasLeadingContent = divisions[0].startIndex > segment.startIndex + 1;
  return hasLeadingContent
    ? [{ ...segment, endIndex: divisions[0].startIndex }, ...pieces]
    : pieces;
};

// Gom các Điều (ActHead5) trong một đoạn: tiêu đề Điều + phần đầu nội dung.
const collectSections = (blocks, { startIndex, endIndex }) => {
  const entries = [];
  for (let index = startIndex; index < endIndex; index += 1) {
    const block = blocks[index];
    const isSection = block.className === SECTION_CLASS;
    const isSubdivision = SUBDIVISION_CLASSES.includes(block.className);
    if (isSection || isSubdivision) {
      entries.push({ index, heading: block.text, isSection, body: "" });
    } else if (isBodyBlock(block) && entries.length > 0) {
      const current = entries.at(-1);
      current.body = `${current.body} ${block.text}`.trim();
    }
  }
  return entries;
};

const formatEntry = ({ index, heading, isSection, body }, bodyChars) => {
  const label = isSection ? `[#${index}] ${heading}` : `-- ${heading}`;
  const excerpt = isSection && bodyChars > 0 && body ? ` :: ${body.slice(0, bodyChars)}` : "";
  return `${label}${excerpt}`;
};

// Trả { text, indices: Set<number> chỉ số các Điều có trong bản trích }.
export const buildPartDigest = (blocks, segment, maxChars = MAX_DIGEST_CHARS) => {
  const entries = collectSections(blocks, segment);
  const render = (bodyChars) => entries.map((entry) => formatEntry(entry, bodyChars));

  const fittingLevel = BODY_CHAR_LEVELS.find(
    (bodyChars) => render(bodyChars).join("\n").length <= maxChars,
  );
  const lines = render(fittingLevel ?? 0);

  // Ngay cả chỉ tiêu đề cũng quá dài: cắt bớt từ cuối, giữ phần đầu của Phần.
  const kept = [];
  let total = 0;
  const keptEntries = [];
  for (const [position, line] of lines.entries()) {
    if (total + line.length + 1 > maxChars) break;
    kept.push(line);
    keptEntries.push(entries[position]);
    total += line.length + 1;
  }

  return {
    text: kept.join("\n"),
    indices: new Set(keptEntries.filter((entry) => entry.isSection).map((entry) => entry.index)),
    truncated: kept.length < lines.length,
  };
};

export const extractNumbers = (text) => text.match(NUMBER_PATTERN) ?? [];
