import { env } from "../core/env.js";
import { AppError, ErrorCode } from "../core/errors.js";

/*
 * Cong chan tam thoi cho moi endpoint tra cuu phap luat (/api/legal/* va
 * /api/chat/*). ErrorCode la enum DONG nen khong them ma moi: dung FORBIDDEN
 * kem details.reason = "FEATURE_DISABLED" de client phan biet voi loi phan
 * quyen that (client chi phan nhanh theo code + reason, khong theo message).
 * Doc env moi request de bat/tat khong can sua code.
 */
const FEATURE_DISABLED_REASON = "FEATURE_DISABLED";

export const requireLegalLookupEnabled = (req, res, next) => {
  if (env.LEGAL_LOOKUP_ENABLED) return next();

  return next(
    new AppError(
      ErrorCode.FORBIDDEN,
      "Tính năng tra cứu pháp luật đang tạm ngưng để cập nhật nội dung. Vui lòng quay lại sau.",
      { reason: FEATURE_DISABLED_REASON },
    ),
  );
};
