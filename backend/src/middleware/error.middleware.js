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

  console.error("Lỗi không lường trước:", error);

  return fail(
    res,
    ErrorCode.INTERNAL_ERROR,
    isProduction ? "Đã có lỗi xảy ra" : String(error?.message ?? error),
  );
};
