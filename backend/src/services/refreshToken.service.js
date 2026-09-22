import RefreshToken from "../models/RefreshToken.js";
import User from "../models/User.js";

import { generateAccessToken, hashToken } from "../utils/token.js";

import { serializeUser } from "./auth.service.js";

export const refreshAccessToken = async (rawRefreshToken) => {
  if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
    throw new Error("REFRESH_TOKEN_MISSING");
  }

  const tokenHash = hashToken(rawRefreshToken);

  const storedToken = await RefreshToken.findOne({
    tokenHash,
  });

  if (!storedToken) {
    throw new Error("REFRESH_TOKEN_INVALID");
  }

  if (storedToken.expiresAt.getTime() <= Date.now()) {
    await RefreshToken.deleteOne({
      _id: storedToken._id,
    });

    throw new Error("REFRESH_TOKEN_EXPIRED");
  }

  const user = await User.findById(storedToken.userId);

  if (!user) {
    await RefreshToken.deleteOne({
      _id: storedToken._id,
    });
    throw new Error("USER_NOT_FOUND");
  }

  if (!user.isActive) {
    await RefreshToken.deleteOne({
      _id: storedToken._id,
    });
    throw new Error("ACCOUNT_NOT_ACTIVE");
  }

  /*
   * Intentional: do NOT rotate the refresh token here.
   * This prevents the React StrictMode / concurrent refresh race
   * where two simultaneous /refresh calls make one request invalidate
   * the token used by the other request.
   *
   * The opaque refresh token is still:
   * - random 64 bytes
   * - stored hashed in MongoDB
   * - sent only via httpOnly cookie
   * - revoked on logout/password reset
   * - automatically expires via MongoDB TTL
   */
  return {
    accessToken: generateAccessToken(user),
    expiresAt: storedToken.expiresAt,
    user: serializeUser(user),
  };
};
