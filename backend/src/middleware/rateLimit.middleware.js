import rateLimit from "express-rate-limit";

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Quá nhiều lần đăng nhập. Vui lòng thử lại sau.",
  },
});

export const registerRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau.",
  },
});

export const resetRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Quá nhiều yêu cầu khôi phục mật khẩu. Vui lòng thử lại sau.",
  },
});
