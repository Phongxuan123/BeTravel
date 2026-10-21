import { containsPhrase } from "../utils/textNormalize.js";

/*
 * Phân luồng câu hỏi bằng CODE, chạy TRƯỚC retrieval và TRƯỚC khi gọi LLM
 * (docs/AI_FEATURE_PLAN.md mục 2.2). Lý do không để LLM tự quyết: deterministic,
 * không tốn lượt gọi trên gói Gemini miễn phí, không phụ thuộc chất lượng provider.
 *
 * Đây là danh sách từ khoá đơn giản (Rule 9), nên CỐ Ý thiên về "cho đi tiếp":
 * câu mơ hồ vẫn vào retrieval và bị ngưỡng bằng chứng chặn nếu không liên quan.
 * Chỉ chặn sớm khi chắc chắn ngoài phạm vi. Thứ tự ưu tiên:
 *   injection > khẩn cấp > ngoài phạm vi > xin tư vấn cá nhân > pháp lý.
 * Khẩn cấp luôn thắng "ngoài phạm vi" vì bỏ sót một ca khẩn cấp tốn hơn nhiều
 * so với một lần trả lời thừa.
 */
export const QuestionRoute = Object.freeze({
  EMERGENCY: "emergency",
  OUT_OF_SCOPE: "out_of_scope",
  GREETING: "greeting",
  PERSONAL_ADVICE: "personal_advice",
  LEGAL: "legal",
});

// Cố ý chèn lệnh vào câu hỏi để đổi vai trò / lộ prompt -- không bao giờ chuyển cho LLM.
const INJECTION_PHRASES = [
  "bỏ qua hướng dẫn",
  "bỏ qua các hướng dẫn",
  "bỏ qua mọi hướng dẫn",
  "quên hết hướng dẫn",
  "ignore previous",
  "ignore all previous",
  "ignore the above",
  "disregard previous",
  "system prompt",
  "prompt hệ thống",
  "tiết lộ prompt",
  "đóng vai",
  "hãy đóng vai",
  "pretend you are",
  "act as",
  "jailbreak",
];

const EMERGENCY_PHRASES = [
  "tai nạn",
  "bị tấn công",
  "bị hành hung",
  "bị cướp",
  "bị bắt cóc",
  "bị đâm",
  "bị thương",
  "bị bắt",
  "bị giữ",
  "bị tạm giữ",
  "bị tạm giam",
  "bị bắt giữ",
  "cấp cứu",
  "đau tim",
  "ngộ độc",
  "hỏa hoạn",
  "đám cháy",
  "cháy nhà",
  "nguy hiểm tính mạng",
  "khẩn cấp",
  "cứu tôi",
  "cứu với",
  "mất tích",
  "bị lạc",
  "đi lạc",
  "lạc mất",
  "không tìm thấy con",
  "đuối nước",
  "chết đuối",
  "bất tỉnh",
  "khó thở",
  "bị rắn cắn",
  "cháy rừng",
  "help me",
  "emergency",
];

// Có một trong các cụm này thì KHÔNG coi là ngoài phạm vi dù trùng từ khoá ngoài phạm vi
// (ví dụ "nhà hàng chặt chém" là khiếu nại, thuộc phạm vi).
const IN_SCOPE_PHRASES = [
  "luật",
  "pháp luật",
  "pháp lý",
  "quy định",
  "quy tắc",
  "điều luật",
  "điều khoản",
  "phạt",
  "mức phạt",
  "bị cấm",
  "cấm",
  "vi phạm",
  "hình sự",
  "visa",
  "thị thực",
  "nhập cảnh",
  "xuất cảnh",
  "hộ chiếu",
  "thẻ khai báo",
  "tạm trú",
  "cư trú",
  "quốc tịch",
  "hải quan",
  "khai báo",
  "mang theo",
  "cảnh sát",
  "công an",
  "đại sứ quán",
  "lãnh sự",
  "bảo hộ công dân",
  "bằng lái",
  "lái xe",
  "flycam",
  "drone",
  "ma túy",
  "thuốc lá",
  "vape",
  "rượu",
  "khiếu nại",
  "tố cáo",
  "lừa đảo",
  "chặt chém",
  "móc túi",
  "trộm",
  "mất giấy tờ",
  "người lao động",
  "hợp đồng",
  "law",
];

const OUT_OF_SCOPE_PHRASES = [
  "thời tiết",
  "dự báo thời tiết",
  "nhà hàng",
  "quán ăn",
  "món ngon",
  "món ăn",
  "ăn gì",
  "quán cà phê",
  "đặt vé",
  "đặt phòng",
  "đặt khách sạn",
  "giá vé",
  "giá phòng",
  "khách sạn nào",
  "tỷ giá",
  "tỉ giá",
  "đổi tiền ở đâu",
  "lịch trình gợi ý",
  "gợi ý lịch trình",
  "đi chơi ở đâu",
  "địa điểm đẹp",
  "chụp ảnh đẹp",
  "tử vi",
  "xổ số",
  "bóng đá",
  "chứng khoán",
  "bitcoin",
  "viết code",
  "viết mã",
  "lập trình",
  "python",
  "javascript",
  "bài thơ",
  "làm thơ",
  "kể chuyện",
  "truyện cười",
  "giải toán",
  "phương trình",
  "dịch giúp",
  "dịch sang",
  "công thức nấu",
  "sức khỏe",
  "giảm cân",
  "chính trị",
  "tình yêu",
];

const GREETING_PHRASES = [
  "xin chào",
  "chào bạn",
  "chào",
  "hello",
  "hi",
  "bạn là ai",
  "bạn làm được gì",
  "bạn giúp được gì",
  "cảm ơn",
  "cám ơn",
  "thanks",
];
const GREETING_MAX_WORDS = 6;

// Xin đánh giá/tư vấn cá nhân: chỉ được trả lời phần thông tin, không phán đoán kết cục.
const PERSONAL_ADVICE_PHRASES = [
  "tôi có bị kết tội",
  "tôi có thắng",
  "tôi có vô tội",
  "tôi có bị phạt không",
  "có nên khai",
  "nên khai thế nào",
  "nên khai như thế nào",
  "có nên nhận tội",
  "nhận tội hay",
  "có nên thuê luật sư",
  "nên làm sao để thoát",
  "làm sao để thoát tội",
  "làm sao để không bị phạt",
  "né luật",
  "lách luật",
  "trốn thuế",
];

const hasAny = (question, phrases) => phrases.some((phrase) => containsPhrase(question, phrase));
const wordCount = (text) => text.trim().split(/\s+/).filter(Boolean).length;

/**
 * @param {string} question
 * @returns {{route: string, reason: string}} reason để ghi log và test, không hiển thị cho người dùng
 */
export function classifyQuestion(question) {
  if (hasAny(question, INJECTION_PHRASES)) {
    return { route: QuestionRoute.OUT_OF_SCOPE, reason: "PROMPT_INJECTION" };
  }
  if (hasAny(question, EMERGENCY_PHRASES)) {
    return { route: QuestionRoute.EMERGENCY, reason: "EMERGENCY_KEYWORD" };
  }

  const inScope = hasAny(question, IN_SCOPE_PHRASES);
  if (!inScope && hasAny(question, OUT_OF_SCOPE_PHRASES)) {
    return { route: QuestionRoute.OUT_OF_SCOPE, reason: "OFF_TOPIC_KEYWORD" };
  }
  if (!inScope && wordCount(question) <= GREETING_MAX_WORDS && hasAny(question, GREETING_PHRASES)) {
    return { route: QuestionRoute.GREETING, reason: "GREETING" };
  }
  if (hasAny(question, PERSONAL_ADVICE_PHRASES)) {
    return { route: QuestionRoute.PERSONAL_ADVICE, reason: "PERSONAL_ADVICE_KEYWORD" };
  }
  return { route: QuestionRoute.LEGAL, reason: "DEFAULT" };
}

const SCOPE_SUGGESTIONS =
  "Bạn có thể hỏi mình về luật và quy định du lịch (visa, nhập cảnh, hải quan, mức phạt, " +
  "ứng xử bị cấm) hoặc cách xử lý sự cố (mất hộ chiếu, bị bắt giữ, bị lừa đảo). " +
  "Với các việc khác, hãy dùng mục Dịch, SOS hoặc Cẩm nang trong ứng dụng.";

export const buildOutOfScopeAnswer = (countryName = "nước ngoài") =>
  `Mình chỉ hỗ trợ thông tin pháp lý và an toàn khi đi du lịch ${countryName}, nên chưa thể ` +
  `trả lời câu hỏi này.\n\n${SCOPE_SUGGESTIONS}`;

export const buildGreetingAnswer = (countryName) =>
  `Xin chào, mình là Be.Travel AI. Mình giúp bạn tra cứu luật và quy định khi đi ${countryName}, ` +
  `luôn kèm nguồn và nói rõ khi chưa đủ dữ liệu.\n\n${SCOPE_SUGGESTIONS}`;

// Câu ranh giới cố định do code chèn, không để model tự viết (Đạt đề xuất, đã đối chiếu).
export const PERSONAL_ADVICE_NOTICE =
  "Mình chỉ cung cấp thông tin từ nguồn đã có, không đánh giá tình huống cá nhân hay thay luật sư. " +
  "Với trường hợp cụ thể, hãy liên hệ Đại sứ quán/Lãnh sự quán Việt Nam hoặc luật sư địa phương.";

// Khi là ca khẩn cấp mà không có nguồn pháp lý phù hợp: số khẩn cấp đã là câu trả lời hữu ích nhất.
export const EMERGENCY_NO_EVIDENCE_NOTE =
  "Be.Travel chưa có thông tin pháp lý đã kiểm chứng cho tình huống cụ thể này, nên mình không " +
  "suy đoán. Hãy ưu tiên an toàn, làm theo hướng dẫn của cơ quan chức năng tại chỗ và liên hệ " +
  "Đại sứ quán Việt Nam.";

/**
 * Khối khẩn cấp dựng từ dữ liệu quốc gia do Admin quản lý, KHÔNG do AI sinh.
 * Trường nào trống thì bỏ qua; không bao giờ điền số tự nghĩ ra.
 * @param {{name:string, emergencyNumbers?:object, embassy?:{name?:string, phone?:string}}} country
 * @returns {{text:string, numbers:string[]}} numbers: các số hợp lệ để guard cho phép AI nhắc lại
 */
export function buildEmergencyNotice(country) {
  const numbers = country.emergencyNumbers ?? {};
  const labelled = [
    ["Công an", numbers.police],
    ["Cấp cứu", numbers.ambulance],
    ["Cứu hỏa", numbers.fire],
    ["Cứu hộ biển", numbers.marine],
  ].filter(([, value]) => value);
  const embassyPhone = country.embassy?.phone;

  const lines = [];
  if (labelled.length) {
    lines.push(
      `Nếu bạn hoặc người thân đang gặp nguy hiểm, hãy gọi ngay số khẩn cấp tại ${country.name}: ` +
        labelled.map(([label, value]) => `${label} ${value}`).join(", ") +
        ".",
    );
  } else {
    lines.push(
      `Nếu bạn hoặc người thân đang gặp nguy hiểm, hãy liên hệ ngay cơ quan khẩn cấp địa phương ` +
        `tại ${country.name}. Be.Travel chưa có số khẩn cấp đã kiểm chứng của nước này.`,
    );
  }
  if (embassyPhone) {
    lines.push(
      `Đại sứ quán Việt Nam${country.embassy?.name ? ` (${country.embassy.name})` : ""}: ${embassyPhone}.`,
    );
  }
  lines.push("Mở mục SOS trong ứng dụng để gọi và chia sẻ vị trí.");

  return {
    text: lines.join("\n"),
    numbers: [...labelled.map(([, value]) => value), ...(embassyPhone ? [embassyPhone] : [])],
  };
}
