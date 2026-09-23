import { FallbackReason } from "../core/constants.js";

/*
 * ★ HAU KIEM BANG CODE -- PHAN QUAN TRONG NHAT CUA B4 (CLAUDE.md muc 7,
 * docs/03_Contracts_v2.md muc 8). KHONG BAO GIO tin LLM tu kiem duyet chinh
 * no. Day la pure function de test de dang, khong phu thuoc DB/network.
 */

// Bat tuyen bo phap ly dinh luong -- thu LLM hay bia nhat.
const QUANTITATIVE_CLAIM = new RegExp(
  [
    String.raw`\d[\d.,]*\s*(KRW|won|원|THB|baht|บาท|USD|\$|SGD|JPY|yen|円|VNĐ|VND|đồng|₫|triệu|nghìn)`,
    String.raw`điều\s+\d+`,
    String.raw`khoản\s+\d+`,
    String.raw`\d+\s*(năm|tháng|ngày)\s*(tù|giam|phạt)`,
    String.raw`(bị\s+)?phạt\s+(tiền|hành chính|từ|đến|tới)`,
    String.raw`(bị\s+)?(cấm|trục xuất|bắt giữ|khởi tố)`,
  ].join("|"),
  "iu",
);

const MARKER = /\[S(\d+)\]/g;

export const FALLBACK_MESSAGE =
  "Mình chưa có dữ liệu đã kiểm chứng đủ để trả lời chắc chắn câu hỏi này. " +
  "Để an toàn, mình không suy đoán về quy định pháp luật.\n\n" +
  "Bạn có thể: xem cẩm nang của quốc gia đang chọn, mở mục SOS để liên hệ " +
  "Đại sứ quán/Tổng lãnh sự quán Việt Nam, hoặc gọi đường dây bảo hộ công dân.";

export const DEFAULT_DISCLAIMER =
  "⚠️ Thông tin dựa trên nguồn đã kiểm chứng trong kho dữ liệu của Be.Travel " +
  "và chỉ mang tính hỗ trợ tham khảo. Đây không phải tư vấn pháp lý chính thức. " +
  "Với tình huống nghiêm trọng, hãy liên hệ cơ quan bảo hộ công dân Việt Nam " +
  "hoặc cơ quan chức năng sở tại.";

/**
 * @param {{answer:string, usedSources:string[], confidence:string}} raw JSON LLM đã trả (đã parse)
 * @param {Map<string, object>} retrieved  key 'S1'..'Sn' -> citation (từ retrieval.js)
 * @param {string} disclaimer
 * @returns {{answer:string, citations:object[], fallbackReason:string|null, violations:string[]}}
 */
export function guardAnswer(raw, retrieved, disclaimer = DEFAULT_DISCLAIMER) {
  const violations = [];
  const found = new Set();

  // (a) Loai marker bia -- marker khong nam trong tap da truy hoi.
  let answer = raw.answer.replace(MARKER, (m, n) => {
    const key = `S${n}`;
    if (retrieved.has(key)) {
      found.add(key);
      return m;
    }
    violations.push(`HALLUCINATED_MARKER:${key}`);
    return "";
  });

  // (b) ★ Tuyen bo dinh luong ma KHONG co nguon -> tu choi hien thi hoan toan
  // (khong phai chi xoa cau do -- neu LLM bia so lieu thi ca cau tra loi
  // khong con dang tin, ha cap xuong fallback an toan).
  if (QUANTITATIVE_CLAIM.test(answer) && found.size === 0) {
    violations.push("UNSOURCED_QUANTITATIVE_CLAIM");
    return { answer: FALLBACK_MESSAGE, citations: [], fallbackReason: FallbackReason.GUARD_REJECTED, violations };
  }

  // (c) Disclaimer LUON duoc gan, khong co ngoai le.
  answer = `${answer.trim()}\n\n---\n${disclaimer}`;

  return {
    answer,
    citations: [...found].map((k) => retrieved.get(k)),
    fallbackReason: null,
    violations,
  };
}
