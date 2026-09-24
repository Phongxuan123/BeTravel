import { fail } from "../core/envelope.js";
import { AppError, ErrorCode } from "../core/errors.js";
import { isProduction } from "../core/env.js";

export const notFoundHandler = (req, res) =>
  fail(res, ErrorCode.NOT_FOUND, "API endpoint không tồn tại");

/*
 * Điểm quy tụ duy nhất của mọi lỗi. Ba nhánh:
 *   ZodError  --> VALIDATION_ERROR kèm danh sách field sai
 *   AppError  --> dùng đúng code mà tầng dưới đã chọn
 *   còn lại   --> INTERNAL_ERROR. Production KHÔNG lộ message gốc vì nó có thể
 *                 chứa tên collection, chuỗi kết nối hoặc chi tiết nội bộ khác.
 */
export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error?.name === "ZodError") {
    const details = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));

    return fail(res, ErrorCode.VALIDATION_ERROR, "Dữ liệu không hợp lệ", details);
  }

  if (error instanceof AppError) {
    return fail(res, error.code, error.message, error.details);
  }

  if (
    error?.name === "CastError" ||
    error?.name === "ValidationError" ||
    error?.type === "entity.parse.failed" ||
    error?.type === "entity.too.large"
  ) {
    return fail(res, ErrorCode.VALIDATION_ERROR, "Dữ liệu không hợp lệ");
  }
  if (
    error?.code === 11000 ||
    error?.name === "VersionError" ||
    error?.name === "DocumentNotFoundError"
  ) {
    return fail(res, ErrorCode.CONFLICT, "Dữ liệu đã thay đổi hoặc bị trùng. Vui lòng tải lại.");
  }

  console.error("Lỗi không lường trước:", error);

  return fail(
    res,
    ErrorCode.INTERNAL_ERROR,
    isProduction ? "Đã có lỗi xảy ra" : String(error?.message ?? error),
  );
};
