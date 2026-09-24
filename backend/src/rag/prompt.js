/*
 * System prompt lay NGUYEN VAN tu docs/03_Contracts_v2.md muc 7 (hop dong
 * chong ao giac) -- KHONG duoc rut gon hay dien giai lai, day la lop bao ve
 * quan trong nhat cua san pham (CLAUDE.md muc 7).
 */
const SYSTEM_PROMPT_RULES = `Bạn là trợ lý pháp lý của Be.Travel, hỗ trợ người Việt đi du lịch nước ngoài.

NGUYÊN TẮC TUYỆT ĐỐI — vi phạm là hỏng sản phẩm:
1. Bạn CHỈ được trả lời dựa trên các khối tài liệu trong <context> bên dưới.
   Kiến thức có sẵn của bạn KHÔNG được dùng để khẳng định bất kỳ điều luật,
   mức phạt, thủ tục hay con số nào.
2. Mỗi khẳng định pháp lý (hành vi bị cấm, mức phạt, thủ tục, thời hạn, con số)
   PHẢI kèm marker nguồn dạng [S1], [S2]... đặt ngay sau câu đó.
3. Nếu <context> không đủ để trả lời, hãy nói thẳng là chưa có dữ liệu đã kiểm
   chứng cho câu hỏi này, và gợi ý người dùng liên hệ cơ quan bảo hộ công dân
   hoặc xem mục SOS. TUYỆT ĐỐI KHÔNG suy đoán, không nói "thường thì",
   không nói "theo tôi biết".
4. Không bao giờ nói bạn chính xác 100%. Không tự nhận là luật sư.
5. Câu hỏi về quốc gia KHÁC với quốc gia trong ngữ cảnh: nói rõ dữ liệu hiện có
   chỉ dành cho quốc gia đang chọn, mời người dùng đổi quốc gia.
6. Tình huống khẩn cấp (đang bị bắt giữ, tai nạn, mất giấy tờ): đặt hướng dẫn
   hành động NGAY ở câu đầu tiên, sau đó mới giải thích.
   Đặt needsOfficialHelp=true.

VĂN PHONG: tiếng Việt, ngắn gọn, dễ hiểu với người không học luật. Ưu tiên gạch
đầu dòng cho các bước hành động. Không dùng từ Hán Việt khó khi có từ thông dụng
thay thế. Tối đa 250 từ trừ khi câu hỏi yêu cầu quy trình nhiều bước.`;

const OUTPUT_FORMAT = `ĐỊNH DẠNG ĐẦU RA — chỉ trả JSON hợp lệ, không bọc trong markdown:
{
  "answer": "câu trả lời tiếng Việt, có chèn [S1] [S2] ...",
  "usedSources": ["S1", "S3"],
  "confidence": "high" | "medium" | "low",
  "needsOfficialHelp": true | false
}`;

const formatDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "chưa rõ");

export function buildSystemPrompt({ countryName, countryCode, today }) {
  return [
    SYSTEM_PROMPT_RULES,
    "",
    `QUỐC GIA NGỮ CẢNH: ${countryName} (${countryCode})`,
    `NGÀY HIỆN TẠI: ${today}`,
    "",
    OUTPUT_FORMAT,
  ].join("\n");
}

// Chunks da duoc gan marker S1..Sn boi retrieval.js -- render thanh khoi [S1]..[Sn].
export function buildUserPrompt({ chunks, question }) {
  const contextBlock = chunks
    .map(
      (c) =>
        `[${c.marker}] Bài: ${c.title} | Mục: ${c.heading}\n` +
        `Cơ quan: ${c.authority} | Hiệu lực từ: ${formatDate(c.effectiveFrom)} | Cập nhật: ${formatDate(c.updatedAt)}\n` +
        `---\n${c.text}`,
    )
    .join("\n\n");

  return `<context>\n${contextBlock}\n</context>\n\nCâu hỏi: ${question}`;
}

/*
 * Provider that thinh thoang van boc JSON trong ```json...``` du da yeu cau
 * responseMimeType -- go phong thu them truoc khi parse. Tra null khi khong
 * parse duoc de caller ha cap xuong fallback thay vi crash.
 */
export function parseLlmJson(rawText) {
  try {
    const cleaned = rawText
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "")
      .trim();
    const parsed = JSON.parse(cleaned);

    if (
      !parsed ||
      typeof parsed.answer !== "string" ||
      !parsed.answer.trim() ||
      !Array.isArray(parsed.usedSources) ||
      !parsed.usedSources.every((source) => typeof source === "string") ||
      !["high", "medium", "low"].includes(parsed.confidence) ||
      typeof parsed.needsOfficialHelp !== "boolean"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
