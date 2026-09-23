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

/*
 * Lop 1 bao ve chi phi AI (B4) -- chong spam burst trong 15 phut. Lop 2 (that
 * su bao ve chi phi, khong reset khi restart) la quota luu DB, xem
 * services/aiUsage.service.js.
 */
export const chatRateLimit = buildRateLimit({
  limit: 20,
  message: "Bạn đang hỏi quá nhanh. Vui lòng chờ một chút rồi thử lại.",
});
