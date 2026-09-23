import { AppError, ErrorCode } from "./errors.js";

/*
 * Các service ném lỗi bằng MÃ NGHIỆP VỤ dạng chuỗi ("EMAIL_EXISTS", ...).
 * Bảng này dịch mã nghiệp vụ sang cặp (ErrorCode, message tiếng Việt) -- khai
 * báo đúng một chỗ thay vì lặp lại ở từng khối catch của controller (Rule 3).
 */
const DOMAIN_ERROR_MAP = Object.freeze({
  // Đăng ký
  EMAIL_EXISTS: [ErrorCode.CONFLICT, "Email đã được sử dụng"],
  USERNAME_EXISTS: [ErrorCode.CONFLICT, "Username đã được sử dụng"],
  PHONE_EXISTS: [ErrorCode.CONFLICT, "Số điện thoại đã được sử dụng"],

  // Đăng nhập
  INVALID_CREDENTIALS: [ErrorCode.UNAUTHORIZED, "Tài khoản hoặc mật khẩu không chính xác"],
  CURRENT_PASSWORD_INVALID: [ErrorCode.UNAUTHORIZED, "Mật khẩu hiện tại không chính xác"],
  PASSWORD_LOGIN_UNAVAILABLE: [
    ErrorCode.VALIDATION_ERROR,
    "Tài khoản này chưa có mật khẩu. Hãy đăng nhập bằng Google hoặc dùng Quên mật khẩu để tạo mật khẩu.",
  ],
  ACCOUNT_NOT_ACTIVE: [ErrorCode.FORBIDDEN, "Tài khoản đã bị vô hiệu hóa"],
  USER_NOT_FOUND: [ErrorCode.NOT_FOUND, "Tài khoản không tồn tại"],

  // Google
  GOOGLE_CREDENTIAL_MISSING: [ErrorCode.VALIDATION_ERROR, "Google credential không được để trống"],
  GOOGLE_CLIENT_ID_MISSING: [ErrorCode.INTERNAL_ERROR, "Google Client ID chưa được cấu hình"],
  GOOGLE_CREDENTIAL_INVALID: [ErrorCode.UNAUTHORIZED, "Google credential không hợp lệ"],
  GOOGLE_CREDENTIAL_EXPIRED: [ErrorCode.UNAUTHORIZED, "Google credential đã hết hạn"],
  GOOGLE_EMAIL_NOT_VERIFIED: [ErrorCode.UNAUTHORIZED, "Email Google chưa được xác thực"],
  GOOGLE_ID_INVALID: [ErrorCode.VALIDATION_ERROR, "Google ID không hợp lệ"],
  GOOGLE_EMAIL_INVALID: [ErrorCode.VALIDATION_ERROR, "Email Google không hợp lệ"],
  GOOGLE_EMAIL_ALREADY_REGISTERED: [
    ErrorCode.CONFLICT,
    "Email này đã có tài khoản mật khẩu. Hãy đăng nhập tài khoản đó rồi liên kết Google.",
  ],
  GOOGLE_EMAIL_MISMATCH: [
    ErrorCode.CONFLICT,
    "Email Google phải trùng với email tài khoản hiện tại",
  ],
  GOOGLE_ACCOUNT_IN_USE: [
    ErrorCode.CONFLICT,
    "Tài khoản Google này đã được liên kết với người dùng khác",
  ],

  // Hồ sơ
  PROFILE_FIELDS_REQUIRED: [ErrorCode.VALIDATION_ERROR, "Không có thông tin hồ sơ cần cập nhật"],
  FULL_NAME_INVALID: [ErrorCode.VALIDATION_ERROR, "Họ và tên phải có từ 2 đến 150 ký tự"],
  PHONE_INVALID: [
    ErrorCode.VALIDATION_ERROR,
    "Số điện thoại không hợp lệ. Vui lòng dùng dạng 0xxxxxxxxx hoặc +84xxxxxxxxx",
  ],

  // Quên mật khẩu
  EMAIL_INVALID: [ErrorCode.VALIDATION_ERROR, "Email không hợp lệ"],
  PASSWORD_RESET_EMAIL_FAILED: [ErrorCode.UPSTREAM_ERROR, "Không thể gửi email khôi phục mật khẩu"],
  OTP_INVALID: [ErrorCode.VALIDATION_ERROR, "OTP không hợp lệ"],
  RESET_REQUEST_NOT_FOUND: [ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu khôi phục mật khẩu"],
  RESET_OTP_ALREADY_VERIFIED: [ErrorCode.CONFLICT, "OTP đã được xác thực"],
  RESET_OTP_EXPIRED: [ErrorCode.VALIDATION_ERROR, "OTP đã hết hạn"],
  RESET_OTP_MAX_ATTEMPTS: [ErrorCode.RATE_LIMITED, "Bạn đã nhập sai OTP quá nhiều lần"],
  RESET_OTP_INVALID: [ErrorCode.VALIDATION_ERROR, "OTP không chính xác"],
  RESET_TOKEN_INVALID: [ErrorCode.VALIDATION_ERROR, "Reset token không hợp lệ"],
  RESET_TOKEN_EXPIRED: [ErrorCode.VALIDATION_ERROR, "Reset token đã hết hạn"],
  PASSWORD_INVALID: [ErrorCode.VALIDATION_ERROR, "Mật khẩu không hợp lệ"],
  PASSWORD_TOO_SHORT: [ErrorCode.VALIDATION_ERROR, "Mật khẩu phải có ít nhất 8 ký tự"],
  PASSWORD_TOO_LONG: [ErrorCode.VALIDATION_ERROR, "Mật khẩu quá dài"],
  PASSWORD_NO_UPPERCASE: [ErrorCode.VALIDATION_ERROR, "Mật khẩu cần ít nhất 1 chữ hoa"],
  PASSWORD_NO_LOWERCASE: [ErrorCode.VALIDATION_ERROR, "Mật khẩu cần ít nhất 1 chữ thường"],
  PASSWORD_NO_NUMBER: [ErrorCode.VALIDATION_ERROR, "Mật khẩu cần ít nhất 1 chữ số"],
  PASSWORD_SAME_AS_OLD: [ErrorCode.VALIDATION_ERROR, "Mật khẩu mới không được trùng mật khẩu cũ"],

  // Chat AI (B4)
  QUOTA_EXCEEDED_USER: [
    ErrorCode.QUOTA_EXCEEDED,
    "Bạn đã dùng hết lượt hỏi AI hôm nay. Vui lòng thử lại vào ngày mai.",
  ],
  QUOTA_EXCEEDED_GLOBAL: [
    ErrorCode.QUOTA_EXCEEDED,
    "Hệ thống đang quá tải lượt hỏi AI. Vui lòng thử lại sau ít phút.",
  ],
  CHAT_SESSION_NOT_FOUND: [ErrorCode.NOT_FOUND, "Không tìm thấy phiên chat"],
  CHAT_MESSAGE_NOT_FOUND: [ErrorCode.NOT_FOUND, "Không tìm thấy tin nhắn"],

  // Feedback (B5)
  FEEDBACK_NOT_FOUND: [ErrorCode.NOT_FOUND, "Không tìm thấy feedback"],
  FEEDBACK_TARGET_NOT_FOUND: [
    ErrorCode.NOT_FOUND,
    "Không tìm thấy tin nhắn được báo cáo, hoặc bạn không có quyền báo cáo tin nhắn này",
  ],
});

/*
 * Chuyển lỗi bất kỳ thành AppError nếu nhận ra được; không nhận ra thì trả về
 * nguyên lỗi để error middleware coi là INTERNAL_ERROR. Xử lý riêng lỗi trùng
 * khóa của MongoDB (code 11000) vì nó đến từ tầng DB, không qua service.
 */
export const toAppError = (error) => {
  const mapped = DOMAIN_ERROR_MAP[error?.message];

  if (mapped) {
    return new AppError(mapped[0], mapped[1]);
  }

  if (error?.code === 11000) {
    const duplicatedField = Object.keys(error.keyPattern ?? {})[0];
    const fieldLabel = { email: "Email", phone: "Số điện thoại" }[duplicatedField] ?? "Username";

    return new AppError(ErrorCode.CONFLICT, `${fieldLabel} đã được sử dụng`);
  }

  return error;
};
