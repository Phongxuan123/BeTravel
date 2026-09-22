/*
 * Mã lỗi là một enum ĐÓNG gồm đúng 10 giá trị. Client phân nhánh xử lý theo
 * `code`, không bao giờ so khớp theo `message` tiếng Việt -- message có thể
 * đổi bất cứ lúc nào mà không làm vỡ client.
 */
export const ErrorCode = Object.freeze({
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  UPSTREAM_ERROR: "UPSTREAM_ERROR",
  INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE",
  INTERNAL_ERROR: "INTERNAL_ERROR",
});

/*
 * INSUFFICIENT_EVIDENCE trả HTTP 200: khi RAG không đủ bằng chứng, việc hệ
 * thống nói "chưa đủ dữ liệu" là một KẾT QUẢ NGHIỆP VỤ hợp lệ, không phải sự cố.
 */
const HTTP_STATUS_BY_CODE = Object.freeze({
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  QUOTA_EXCEEDED: 429,
  UPSTREAM_ERROR: 502,
  INSUFFICIENT_EVIDENCE: 200,
  INTERNAL_ERROR: 500,
});

export const httpStatusForCode = (code) => HTTP_STATUS_BY_CODE[code] ?? 500;

export class AppError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = "AppError";
    this.code = ErrorCode[code] ?? ErrorCode.INTERNAL_ERROR;
    this.httpStatus = httpStatusForCode(this.code);
    this.details = details;
  }
}
