import rateLimit from "express-rate-limit";

import { ErrorCode } from "../core/errors.js";

/*
 * Rate limit lưu trong RAM -- chống spam, nhưng RESET khi server khởi động lại.
 * Với các endpoint tốn tiền (AI ở B4) phải thêm quota lưu DB, không dựa vào lớp này.
 *
 * Tắt (skip) trong NODE_ENV=test: một file test gọi /register hoặc /login hàng
 * chục lần trong cùng một tiến trình, dùng chung state rate-limit theo IP --
 * không tắt thì các test chạy sau bị 429 dù không hề mô phỏng spam thật.
 */
const isTestEnv = process.env.NODE_ENV === "test";

const buildRateLimit = ({ limit, message }) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => isTestEnv,
    message: { ok: false, error: { code: ErrorCode.RATE_LIMITED, message } },
  });

export const loginRateLimit = buildRateLimit({
  limit: 10,
  message: "Quá nhiều lần đăng nhập. Vui lòng thử lại sau.",
});

export const registerRateLimit = buildRateLimit({
  limit: 5,
  message: "Quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau.",
});

export const resetRateLimit = buildRateLimit({
  limit: 8,
  message: "Quá nhiều yêu cầu khôi phục mật khẩu. Vui lòng thử lại sau.",
});

// Dich (B7) goi LLM nen can lop 1 chong spam burst; lop 2 (khong reset khi
// restart) la quota luu DB, xem services/aiUsage.service.js.
export const translateRateLimit = buildRateLimit({
  limit: 30,
  message: "Bạn đang dịch quá nhanh. Vui lòng chờ một chút rồi thử lại.",
});

// Tro ly AI ban 2: lop 1 chong spam burst; lop 2 la quota ngay luu DB (aiUsage.service.js).
export const assistantRateLimit = buildRateLimit({
  limit: 20,
  message: "Bạn đang hỏi quá nhanh. Vui lòng chờ một chút rồi thử lại.",
});

// Endpoint dia diem Google Maps (SerpApi) ton quota that cua tai khoan -- gioi han burst theo IP.
export const externalPlacesRateLimit = buildRateLimit({
  limit: 30,
  message: "Bạn đang tìm địa điểm quá nhanh. Vui lòng chờ một chút rồi thử lại.",
});

// Tra cứu luật Úc: mỗi lượt có thể thành một lần gọi API của cơ quan Úc (có cache nhưng vẫn giới hạn burst theo IP).
export const lawsRateLimit = buildRateLimit({
  limit: 120,
  message: "Bạn đang tra cứu quá nhanh. Vui lòng chờ một chút rồi thử lại.",
});

// Dịch luật Úc mỗi lượt có thể gọi AI tới 4 lần (cụm 25 đoạn): giới hạn chặt hơn tra cứu thường.
export const lawsTranslateRateLimit = buildRateLimit({
  limit: 40,
  message: "Bạn đang dịch quá nhanh. Vui lòng chờ một chút rồi thử lại.",
});

// Tìm địa điểm theo chữ: người dùng gõ nhiều lần (client đã debounce) nhưng mỗi lượt có thể thành một lần gọi Nominatim.
export const placeSearchRateLimit = buildRateLimit({
  limit: 90,
  message: "Bạn đang tìm địa điểm quá nhanh. Vui lòng chờ một chút rồi thử lại.",
});
