import User from "../models/User.js";

import {
  registerUser,
  loginUser,
  loginWithGoogle,
  linkGoogleAccount,
  updateUserProfile,
  changeUserPassword,
} from "../services/auth.service.js";

import { refreshAccessToken, revokeRefreshToken } from "../services/refreshToken.service.js";
import { verifyGoogleCredential } from "../services/googleAuth.service.js";

import {
  requestPasswordReset,
  verifyPasswordResetOtp,
  resendPasswordResetOtp,
  resetPassword as resetPasswordService,
} from "../services/passwordReset.service.js";

import { registerSchema, loginSchema, changePasswordSchema } from "../validators/auth.validator.js";
import {
  readRefreshToken,
  applyAuthTransport,
  clearAuthTransportCookie,
} from "../utils/authTransport.js";
import { ok, created } from "../core/envelope.js";
import { toAppError } from "../core/domainErrors.js";

// Ngữ cảnh request để ghi lại cùng refresh token (giúp truy vết khi có nghi ngờ bị đánh cắp).
const requestContext = (req) => ({ userAgent: req.headers["user-agent"] ?? "", ip: req.ip });

export const register = async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);

    const user = await registerUser({
      fullName: input.fullName,
      username: input.username,
      email: input.email,
      phone: input.phone,
      password: input.password,
    });

    return created(res, { user });
  } catch (error) {
    next(toAppError(error));
  }
};

export const login = async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const session = await loginUser(input, requestContext(req));

    return ok(res, applyAuthTransport(res, session));
  } catch (error) {
    next(toAppError(error));
  }
};

export const googleLogin = async (req, res, next) => {
  try {
    const googleUser = await verifyGoogleCredential(req.body?.credential);
    const session = await loginWithGoogle(
      { googleId: googleUser.googleId, email: googleUser.email, fullName: googleUser.fullName },
      requestContext(req),
    );

    return ok(res, applyAuthTransport(res, session));
  } catch (error) {
    next(toAppError(error));
  }
};

export const linkGoogle = async (req, res, next) => {
  try {
    const googleUser = await verifyGoogleCredential(req.body?.credential);
    const user = await linkGoogleAccount({
      userId: req.user.userId,
      googleId: googleUser.googleId,
      email: googleUser.email,
      fullName: googleUser.fullName,
    });

    return ok(res, { user });
  } catch (error) {
    next(toAppError(error));
  }
};

export const refresh = async (req, res, next) => {
  try {
    const rawRefreshToken = readRefreshToken(req);
    const session = await refreshAccessToken(rawRefreshToken, requestContext(req));

    return ok(res, applyAuthTransport(res, session));
  } catch (error) {
    const appError = toAppError(error);

    if (appError.code === "UNAUTHORIZED" || appError.code === "FORBIDDEN") {
      clearAuthTransportCookie(res);
    }

    next(appError);
  }
};

export const logout = async (req, res, next) => {
  try {
    await revokeRefreshToken(readRefreshToken(req));
    clearAuthTransportCookie(res);

    return ok(res, { loggedOut: true });
  } catch (error) {
    next(toAppError(error));
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return next(toAppError(new Error("USER_NOT_FOUND")));
    }

    return ok(res, {
      user: {
        id: user._id.toString(),
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        isActive: user.isActive,
        googleLinked: Boolean(user.googleId),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    next(toAppError(error));
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { fullName, phone } = req.body || {};
    const user = await updateUserProfile({ userId: req.user.userId, fullName, phone });

    return ok(res, { user });
  } catch (error) {
    next(toAppError(error));
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    await requestPasswordReset(req.body?.email);

    return ok(res, { sent: true });
  } catch (error) {
    next(toAppError(error));
  }
};

export const verifyResetOtp = async (req, res, next) => {
  try {
    const data = await verifyPasswordResetOtp({ email: req.body?.email, otp: req.body?.otp });

    return ok(res, data);
  } catch (error) {
    next(toAppError(error));
  }
};

export const resendResetOtp = async (req, res, next) => {
  try {
    await resendPasswordResetOtp(req.body?.email);

    return ok(res, { sent: true });
  } catch (error) {
    next(toAppError(error));
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    await resetPasswordService({ resetToken: req.body?.resetToken, password: req.body?.password });

    return ok(res, { reset: true });
  } catch (error) {
    next(toAppError(error));
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const input = changePasswordSchema.parse(req.body);

    await changeUserPassword({
      userId: req.user.userId,
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    });

    return ok(res, { changed: true });
  } catch (error) {
    next(toAppError(error));
  }
};
