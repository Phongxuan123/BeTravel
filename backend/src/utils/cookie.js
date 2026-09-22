import { isProduction } from "../core/env.js";

/*
 * Nhánh cookie dành cho admin web (trình duyệt). Mobile KHÔNG dùng nhánh này
 * -- xem X2 ở docs/04_Repo_Audit.md: cookie jar của React Native không bền
 * vững qua lần mở app. Mobile nhận refresh token qua response body
 * (utils/authTransport.js) và tự lưu bằng expo-secure-store.
 */
const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/api/auth",
});

export const setRefreshTokenCookie = (res, token, maxAge) => {
  res.cookie("refreshToken", token, { ...getRefreshCookieOptions(), maxAge });
};

export const clearRefreshTokenCookie = (res) => {
  res.clearCookie("refreshToken", getRefreshCookieOptions());
};
