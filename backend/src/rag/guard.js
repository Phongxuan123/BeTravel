import { FallbackReason } from "../core/constants.js";
import { buildOutOfScopeAnswer } from "./scope.js";

/*
 * HẬU KIỂM BẰNG CODE -- không tin LLM (CLAUDE.md mục 4.2, docs/03_Contracts_v2.md mục 8).
 * Câu trả lời gồm 3 phần do LLM sinh (answer / actions / avoid); phần "Nguồn" do code dựng từ
 * citations nên không nằm ở đây. Mỗi phần được kiểm riêng:
 *   - phần `answer` vi phạm  --> hạ cả câu trả lời xuống fallback an toàn;
 *   - một ý trong `actions` / `avoid` vi phạm --> chỉ bỏ ý đó, ghi vào `violations`.
 * Tầng này là ngoại lệ của Rule 9 (KISS) vì là lõi chống ảo giác của sản phẩm.
 */
const CURRENCY_UNIT = String.raw`KRW|won|원|THB|baht|บาท|USD|\$|SGD|S\$|AUD|A\$|MYR|RM|ringgit|JPY|yen|円|VNĐ|VND|đồng|₫|penalty\s+units?`;
// Ky hieu tien dat TRUOC so ("₩3,000,000", "$500", "RM 50") -- LLM hay viet kieu nay.
const CURRENCY_PREFIX = String.raw`[₩$฿¥€]\s*\d|\bRM\s*\d|\bA\$\s*\d|\bS\$\s*\d`;
const QUANTITATIVE_CLAIM = new RegExp(
  [
    String.raw`\d[\d.,]*\s*(${CURRENCY_UNIT}|triệu|nghìn)(?![\p{L}])`,
    CURRENCY_PREFIX,
    // So viet bang chu: "ba triệu won" -- bat qua cum "don vi lon + tien te".
    String.raw`(triệu|nghìn|ngàn|tỷ|trăm)\s*(${CURRENCY_UNIT})`,
    String.raw`điều\s+\d+`,
    String.raw`khoản\s+\d+`,
    // Luat tieng Anh: "section 116", "Migration Act 1958, s 116".
    String.raw`\bsections?\s+\d+`,
    String.raw`(?<=\d{4},\s)s\s?\d+`,
    String.raw`\d+\s*(năm|tháng|ngày)\s*(tù|giam|phạt)`,
    // "tù 1 năm", "tù đến 3 năm" -- dang pho bien trong nguon KR.
    String.raw`(^|\s)tù\s+((đến|tới|từ)\s+)?\d`,
    String.raw`\d+\s*(years?|months?)\s*(imprisonment|in\s+prison|in\s+jail)`,
    String.raw`(bị\s+)?phạt\s+(tiền|hành chính|tù|từ|đến|tới)`,
    String.raw`(bị\s+)?(cấm|trục xuất|bắt giữ|khởi tố)`,
  ].join("|"),
  "iu",
);

// Doi chieu so tien voi nguon dung CUNG don vi voi luc phat hien: danh sach
// rieng tung thieu "$", "₫", "円", "บาท" dat sau so --> "900.000₫ [S1]" duoc
// nhan la dinh luong nhung lot qua buoc doi chieu du nguon ghi so khac.
const AMOUNT = new RegExp(
  String.raw`\d[\d.,]*\s*(?:${CURRENCY_UNIT}|triệu|nghìn)|[₩$฿¥€]\s*\d[\d.,]*|\b(?:RM|A\$|S\$)\s*\d[\d.,]*`,
  "giu",
);

// So dien thoai/duong day nong di kem tu bao hieu ("goi 112", "hotline +82 2 720 5124").
const PHONE_AFTER_CUE =
  /(?:gọi|số|điện thoại|hotline|tổng đài|đường dây|liên hệ|call|tel|phone)[^\d+\n]{0,15}(\+?\d[\d\s().-]{1,18}\d)/giu;
const MIN_SUFFIX_MATCH_DIGITS = 3;

const MARKER = /\[S(\d+)\]/g;

export const FALLBACK_MESSAGE =
  "Mình chưa có dữ liệu đã kiểm chứng đủ để trả lời chắc chắn câu hỏi này. " +
  "Để an toàn, mình không suy đoán về quy định pháp luật.\n\n" +
  "Bạn có thể: xem cẩm nang của quốc gia đang chọn, mở mục SOS để liên hệ " +
  "Đại sứ quán/Tổng lãnh sự quán Việt Nam, hoặc gọi đường dây bảo hộ công dân.";

export const DEFAULT_DISCLAIMER =
  "Thông tin dựa trên nguồn đã kiểm chứng trong kho dữ liệu của Be.Travel " +
  "và chỉ mang tính hỗ trợ tham khảo. Đây không phải tư vấn pháp lý chính thức. " +
  "Với tình huống nghiêm trọng, hãy liên hệ cơ quan bảo hộ công dân Việt Nam " +
  "hoặc cơ quan chức năng sở tại.";

const SECTION_HEADINGS = Object.freeze({
  answer: "Trả lời ngắn",
  actions: "Việc nên làm",
  avoid: "Điều cần tránh",
});

// Lỗi phía nhà cung cấp AI (quá tải, hết hạn mức phút/ngày): không phải thiếu dữ liệu, nên lời nhắn khác.
export const PROVIDER_BUSY_MESSAGE =
  "Trợ lý AI đang bận hoặc đã hết lượt trong lúc này. Bạn hãy thử lại sau ít phút. " +
  "Nếu việc gấp, mở mục SOS hoặc liên hệ Đại sứ quán Việt Nam.";

const rejected = (violations, fallbackReason = FallbackReason.GUARD_REJECTED) => ({
  answer: FALLBACK_MESSAGE,
  sections: null,
  citations: [],
  fallbackReason,
  violations,
});

const digitsOf = (value) => String(value).replace(/\D/g, "");

// "+82 2 720 5124" khop "02-720-5124": cho phep khac tien to quoc gia/so 0 dau, nhung phai du dai.
const numbersMatch = (a, b) =>
  a === b ||
  (Math.min(a.length, b.length) >= MIN_SUFFIX_MATCH_DIGITS && (a.endsWith(b) || b.endsWith(a)));

const phoneTokensOf = (text) =>
  [...text.matchAll(/\+?\d[\d\s().-]{1,18}\d/g)].map(([token]) => digitsOf(token));

/*
 * So dien thoai AI nhac phai xuat hien trong CHINH nguon duoc trich o khoi do, hoac nam
 * trong danh sach so khan cap cua quoc gia (du lieu Admin quan ly). Khong co --> bia so.
 */
function hasUnsupportedPhone(prose, sourceText, allowedDigits) {
  const known = [...phoneTokensOf(sourceText), ...allowedDigits];
  return [...prose.matchAll(PHONE_AFTER_CUE)].some(([, raw]) => {
    const digits = digitsOf(raw);
    return (
      digits.length >= MIN_SUFFIX_MATCH_DIGITS &&
      !known.some((candidate) => numbersMatch(digits, candidate))
    );
  });
}

/*
 * Kiem mot khoi van ban (tinh theo cum ket thuc bang citation): neu khoi co tuyen bo dinh
 * luong thi so tien phai nam trong CHINH nguon duoc viện dẫn, so dien thoai cung vay.
 * Marker hop le o dau cau tra loi khong bao chung cho con so o phan sau.
 */
function findBlockViolation(text, retrieved, allowedDigits) {
  const blocks = text.match(/[^]*?\[S\d+\](?:\s*\[S\d+\])*|[^]+$/g) ?? [];
  for (const block of blocks) {
    const prose = block.replace(MARKER, "");
    const markers = [...block.matchAll(/\[S(\d+)\]/g)].map((match) => `S${match[1]}`);
    const sourceText = markers.map((marker) => retrieved.get(marker)?.text ?? "").join(" ");

    if (QUANTITATIVE_CLAIM.test(prose)) {
      const amounts = [...prose.matchAll(AMOUNT)].map(([amount]) =>
        amount
          .match(/\d[\d.,]*/)[0]
          .replace(/[.,]+$/g, "")
          .replace(/[.,]/g, ""),
      );
      const sourceNumbers = new Set(
        [...sourceText.matchAll(/\d[\d.,]*/g)].map(([number]) => number.replace(/[.,]/g, "")),
      );
      if (!markers.length || amounts.some((amount) => !sourceNumbers.has(amount))) {
        return "UNSUPPORTED_QUANTITATIVE_CLAIM";
      }
    }
    if (hasUnsupportedPhone(prose, sourceText, allowedDigits)) return "UNSUPPORTED_PHONE_NUMBER";
  }
  return null;
}

/*
 * Kiem mot phan van ban sau khi da bo marker bia. Tra ve ma vi pham hoac null.
 * `markersInPart`: so marker hop le con lai -- tuyen bo dinh luong ma khong co marker nao
 * thi bo han (khong phai chi xoa), vi LLM da bia so lieu.
 */
function findPartViolation(text, markersInPart, retrieved, allowedDigits) {
  const prose = text.replace(MARKER, "");
  if (QUANTITATIVE_CLAIM.test(prose) && markersInPart === 0) return "UNSOURCED_QUANTITATIVE_CLAIM";
  return findBlockViolation(text, retrieved, allowedDigits);
}

const asStringList = (value) =>
  Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()) : [];

const numbered = (items) => items.map((item, index) => `${index + 1}. ${item}`).join("\n");
const bulleted = (items) => items.map((item) => `- ${item}`).join("\n");

/**
 * Dung van ban markdown tu cac phan. Khong co `actions`/`avoid` thi giu nguyen dang van xuoi
 * cu (khong tieu de) de client cu va lich su chat khong vo.
 */
export function composeAnswerText({ answer, actions, avoid }) {
  if (!actions.length && !avoid.length) return answer;
  const parts = [`**${SECTION_HEADINGS.answer}**\n${answer}`];
  if (actions.length) parts.push(`**${SECTION_HEADINGS.actions}**\n${numbered(actions)}`);
  if (avoid.length) parts.push(`**${SECTION_HEADINGS.avoid}**\n${bulleted(avoid)}`);
  return parts.join("\n\n");
}

/**
 * @param {{answer:string, actions?:string[], avoid?:string[], usedSources:string[], confidence:string, inScope?:boolean}} raw JSON LLM đã trả (đã parse)
 * @param {Map<string, object>} retrieved  key 'S1'..'Sn' -> citation (từ retrieval.js)
 * @param {string} disclaimer
 * @param {{allowedNumbers?: string[]}} options so khẩn cấp hợp lệ của quốc gia (AI được nhắc lại)
 * @returns {{answer:string, sections:object|null, citations:object[], fallbackReason:string|null, violations:string[]}}
 */
export function guardAnswer(raw, retrieved, disclaimer = DEFAULT_DISCLAIMER, options = {}) {
  const violations = [];
  const allowedDigits = (options.allowedNumbers ?? []).map(digitsOf).filter(Boolean);

  // AI tu danh gia cau hoi nam ngoai pham vi: khong hien noi dung AI viet, dung loi tu choi cua code.
  if (raw.inScope === false) {
    return {
      ...rejected(["OUT_OF_SCOPE_BY_MODEL"], FallbackReason.OUT_OF_SCOPE),
      answer: buildOutOfScopeAnswer(options.countryName),
    };
  }

  // Model tu khai <context> khong du de tra loi truc tiep: khong hien noi dung nao do AI viet
  // (tranh viec chen marker cho co nguon roi hien mot cau tra loi rong tuech).
  if (raw.answerable === false) {
    return rejected(["MODEL_REPORTED_INSUFFICIENT"], FallbackReason.INSUFFICIENT_EVIDENCE);
  }

  const found = new Set();
  // (a) Loai marker bia -- marker khong nam trong tap da truy hoi. Tra ve {text, count}.
  const stripFakeMarkers = (text) => {
    let count = 0;
    const cleaned = text.replace(MARKER, (match, n) => {
      const key = `S${n}`;
      if (retrieved.has(key)) {
        found.add(key);
        count += 1;
        return match;
      }
      violations.push(`HALLUCINATED_MARKER:${key}`);
      return "";
    });
    return { text: cleaned.replace(/[ \t]{2,}/g, " ").trim(), count };
  };

  const answerPart = stripFakeMarkers(raw.answer);
  // (b) [!] Phan tra loi chinh co tuyen bo dinh luong khong nguon --> ha ca cau xuong fallback.
  const answerViolation = findPartViolation(
    answerPart.text,
    answerPart.count,
    retrieved,
    allowedDigits,
  );
  if (answerViolation) {
    violations.push(answerViolation);
    return rejected(violations);
  }
  if (found.size === 0) {
    violations.push("MISSING_CITATION");
    return rejected(violations);
  }

  // Cac y trong "Viec nen lam" / "Dieu can tranh": y nao vi pham thi bo y do.
  const keepValidItems = (items) =>
    asStringList(items).flatMap((item) => {
      const part = stripFakeMarkers(item);
      const violation = findPartViolation(part.text, part.count, retrieved, allowedDigits);
      if (violation) {
        violations.push(`DROPPED_ITEM:${violation}`);
        return [];
      }
      // Moi y can nguon rieng; y khong marker thi khong co can cu de hien thi.
      if (part.count === 0) {
        violations.push("DROPPED_ITEM:MISSING_CITATION");
        return [];
      }
      return [part.text];
    });

  const sections = {
    answer: answerPart.text,
    actions: keepValidItems(raw.actions),
    avoid: keepValidItems(raw.avoid),
  };

  // (c) Disclaimer LUON duoc gan, khong co ngoai le.
  const composed = composeAnswerText(sections);
  return {
    answer: `${composed.trim()}\n\n---\n${disclaimer}`,
    sections,
    citations: [...found].map((key) => retrieved.get(key)),
    fallbackReason: null,
    violations,
  };
}
