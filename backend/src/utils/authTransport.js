import { authTransportIncludes } from "../core/env.js";
import { setRefreshTokenCookie, clearRefreshTokenCookie } from "./cookie.js";

/*
 * ĐỌC refresh token từ cookie HOẶC body -- viết một lần, chạy được cả mobile
 * (body) lẫn admin web (cookie), bất kể AUTH_TRANSPORT server đang cấu hình gì.
 * Đây là lý do X2 trong docs/04_Repo_Audit.md yêu cầu.
 */
export const readRefreshToken = (req) =>
  req.cookies?.refreshToken || req.body?.refreshToken || null;

/*
 * GỬI refresh token theo đúng AUTH_TRANSPORT đang bật:
 *   body   --> giữ nguyên trong `session.refreshToken`, mobile tự lưu secure-store
 *   cookie --> set httpOnly cookie, xóa khỏi body để không lộ ra JS phía trình duyệt
 *   both   --> làm cả hai
 * Trả về session đã được điều chỉnh để controller gắn thẳng vào envelope.
 */
export const applyAuthTransport = (res, session) => {
  const refreshMaxAgeMs = Math.max(0, session.expiresAt.getTime() - Date.now());

  if (authTransportIncludes("cookie") && session.refreshToken) {
    setRefreshTokenCookie(res, session.refreshToken, refreshMaxAgeMs);
  }

  const { expiresAt, refreshToken, ...rest } = session;

  return authTransportIncludes("body")
    ? { ...rest, refreshToken, expiresAt }
    : { ...rest, expiresAt };
};

export const clearAuthTransportCookie = (res) => clearRefreshTokenCookie(res);
