/*
 * HAU KIEM BANG CODE cho tro ly ban 2 (CLAUDE.md Phan 4.2 buoc 5) -- khong tin LLM:
 *  a. Marker [n] khong thuoc tap nguon da lay ve --> xoa + ghi vi pham.
 *  b. Cau co con so dinh luong (tien, muc phat, so gio, so lit, so nam tu, ty le, dieu luat)
 *     ma KHONG co marker hop le --> bo cau do, them mot dong nhac kiem tra nguon chinh thuc.
 *     Tang kien thuc chung khong co nguon nen MOI cau dinh luong deu bi bo.
 *  c. Danh lai so [n] lien tuc theo thu tu xuat hien; chi giu nguon thuc su duoc trich.
 * Day la tang duoc phep phuc tap hon binh thuong (ngoai le Rule 9).
 */
const MARKER_PATTERN = /\[(\d{1,2})\]/g;

// So dinh luong can nguon. So dien thoai (000, 131 444) va nam/ngay khong nam trong danh sach nay.
const QUANTITATIVE_PATTERNS = [
  /(?:AUD|USD|VND|A\$|\$)\s?\d/i,
  /\d[\d.,]*\s?(?:AUD|USD|VND|đô|đồng|triệu|nghìn|dollars?)\b/i,
  /\d[\d.,]*\s?(?:năm tù|tháng tù|years? (?:in )?(?:prison|jail)|penalty units?|điểm trừ|demerit)/i,
  /\d[\d.,]*\s?(?:lít|litres?|liters?|điếu|cigarettes?|gram|ml|mL|kg)\b/i,
  /\d[\d.,]*\s?(?:giờ|hours?)\s?(?:\/|mỗi|một|per|a)\s?(?:tuần|hai tuần|fortnight|week)/i,
  /\d+(?:[.,]\d+)?\s?%/,
  /(?:điều|khoản|section|rule)\s\d+/i,
];

const SENTENCE_SPLIT = /(?<=[.!?])\s+/;

export const VERIFY_NOTE = {
  vi: "Con số cụ thể: hãy kiểm tra tại trang chính thức của cơ quan nhà nước.",
  en: "For exact figures, please check the relevant official government website.",
};

const isQuantitative = (sentence) =>
  QUANTITATIVE_PATTERNS.some((pattern) => pattern.test(sentence));
const hasMarker = (sentence) => /\[\d{1,2}\]/.test(sentence);

// a. Bo marker khong co trong tap nguon hop le.
function stripUnknownMarkers(text, allowedNumbers, violations) {
  return text.replace(MARKER_PATTERN, (marker, number) => {
    if (allowedNumbers.has(Number(number))) return marker;
    violations.push({ type: "unknown_marker", marker });
    return "";
  });
}

// b. Bo cau dinh luong khong co nguon, giu nguyen tien to gach dau dong cua dong.
function stripUnsourcedNumbers(text, violations) {
  let stripped = false;
  const lines = text.split("\n").map((line) => {
    const bullet = line.match(/^\s*-\s+/)?.[0] ?? "";
    const kept = line
      .slice(bullet.length)
      .split(SENTENCE_SPLIT)
      .filter((sentence) => {
        const unsourced = isQuantitative(sentence) && !hasMarker(sentence);
        if (unsourced) violations.push({ type: "unsourced_number", sentence });
        stripped ||= unsourced;
        return !unsourced;
      })
      .join(" ")
      .trim();
    return kept ? `${bullet}${kept}` : null;
  });
  return { text: lines.filter((line) => line !== null).join("\n"), stripped };
}

// c. Danh so lai [n] -> 1..k theo thu tu xuat hien.
function renumberMarkers(text) {
  const order = new Map();
  const renumbered = text.replace(MARKER_PATTERN, (_, number) => {
    const original = Number(number);
    if (!order.has(original)) order.set(original, order.size + 1);
    return `[${order.get(original)}]`;
  });
  return { text: renumbered, usedOriginalNumbers: [...order.keys()] };
}

/**
 * @param {{answer:string, allowedNumbers:Set<number>, language?:string}} input
 * @returns {{text:string, usedOriginalNumbers:number[], violations:Array}}
 */
export function guardAnswer({ answer, allowedNumbers, language = "vi" }) {
  const violations = [];
  const withKnownMarkers = stripUnknownMarkers(answer, allowedNumbers, violations);
  const { text: withoutUnsourced, stripped } = stripUnsourcedNumbers(withKnownMarkers, violations);
  const note = VERIFY_NOTE[language] ?? VERIFY_NOTE.vi;
  const withNote = stripped ? `${withoutUnsourced}\n${note}`.trim() : withoutUnsourced;
  const { text, usedOriginalNumbers } = renumberMarkers(
    withNote.replace(/[ \t]+([.,;:])/g, "$1").replace(/[ \t]{2,}/g, " "),
  );
  return { text, usedOriginalNumbers, violations };
}
