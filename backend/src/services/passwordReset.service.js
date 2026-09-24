import crypto from "crypto";
import bcrypt from "bcrypt";

import User from "../models/User.js";
import PasswordReset from "../models/PasswordReset.js";
import RefreshToken from "../models/RefreshToken.js";

import { sendPasswordResetOtpEmail } from "./email.service.js";

const OTP_EXPIRES_MS = 5 * 60 * 1000;
const RESET_TOKEN_EXPIRES_MS = 10 * 60 * 1000;
const RECORD_EXPIRES_MS = 15 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const normalizeEmail = (email) => {
  if (typeof email !== "string") {
    return "";
  }

  return email.trim().toLowerCase();
};

const hashValue = (value) => crypto.createHash("sha256").update(value).digest("hex");

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

const generateResetToken = () => crypto.randomBytes(48).toString("hex");

const validateNewPassword = (password) => {
  if (typeof password !== "string") {
    throw new Error("PASSWORD_INVALID");
  }

  if (password.length < 8) {
    throw new Error("PASSWORD_TOO_SHORT");
  }

  if (password.length > 128) {
    throw new Error("PASSWORD_TOO_LONG");
  }

  if (!/[A-Z]/.test(password)) {
    throw new Error("PASSWORD_NO_UPPERCASE");
  }

  if (!/[a-z]/.test(password)) {
    throw new Error("PASSWORD_NO_LOWERCASE");
  }

  if (!/[0-9]/.test(password)) {
    throw new Error("PASSWORD_NO_NUMBER");
  }
};

export const requestPasswordReset = async (email) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error("EMAIL_INVALID");
  }

  const user = await User.findOne({
    email: normalizedEmail,
  });

  /*
   * Do not reveal whether the account exists.
   */
  if (!user || !user.isActive) {
    return { accepted: true };
  }

  await PasswordReset.deleteMany({
    userId: user._id,
  });

  const otp = generateOtp();
  const now = Date.now();

  await PasswordReset.create({
    userId: user._id,
    email: normalizedEmail,
    otpHash: hashValue(otp),
    otpExpiresAt: new Date(now + OTP_EXPIRES_MS),
    attempts: 0,
    verified: false,
    resetTokenHash: null,
    resetTokenExpiresAt: null,
    expiresAt: new Date(now + RECORD_EXPIRES_MS),
  });

  try {
    await sendPasswordResetOtpEmail({
      to: normalizedEmail,
      otp,
      expiresMinutes: 5,
      fullName: user.fullName,
    });
  } catch (error) {
    await PasswordReset.deleteMany({
      userId: user._id,
    });

    console.error("Password reset email error:", error.message);

    // Giữ lại lỗi gốc (SMTP) trong `cause` để log phía server truy vết được,
    // trong khi controller/client chỉ thấy mã nghiệp vụ PASSWORD_RESET_EMAIL_FAILED.
    throw new Error("PASSWORD_RESET_EMAIL_FAILED", { cause: error });
  }

  return { accepted: true };
};

export const verifyPasswordResetOtp = async ({ email, otp }) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error("EMAIL_INVALID");
  }

  if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    throw new Error("OTP_INVALID");
  }

  const resetRequest = await PasswordReset.findOne({
    email: normalizedEmail,
  }).sort({ createdAt: -1 });

  if (!resetRequest) {
    throw new Error("RESET_REQUEST_NOT_FOUND");
  }

  if (resetRequest.verified) {
    throw new Error("RESET_OTP_ALREADY_VERIFIED");
  }

  if (resetRequest.otpExpiresAt.getTime() <= Date.now()) {
    throw new Error("RESET_OTP_EXPIRED");
  }

  if (resetRequest.attempts >= MAX_OTP_ATTEMPTS) {
    throw new Error("RESET_OTP_MAX_ATTEMPTS");
  }

  if (hashValue(otp) !== resetRequest.otpHash) {
    await PasswordReset.updateOne(
      { _id: resetRequest._id, verified: false, attempts: { $lt: MAX_OTP_ATTEMPTS } },
      { $inc: { attempts: 1 } },
    );
    throw new Error("RESET_OTP_INVALID");
  }

  const resetToken = generateResetToken();

  const claimed = await PasswordReset.findOneAndUpdate(
    {
      _id: resetRequest._id,
      verified: false,
      attempts: { $lt: MAX_OTP_ATTEMPTS },
      otpExpiresAt: { $gt: new Date() },
    },
    {
      $set: {
        verified: true,
        resetTokenHash: hashValue(resetToken),
        resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRES_MS),
      },
    },
  );
  if (!claimed) throw new Error("RESET_OTP_ALREADY_VERIFIED");

  return { resetToken };
};

export const resendPasswordResetOtp = async (email) => requestPasswordReset(email);

export const resetPassword = async ({ resetToken, password }) => {
  if (typeof resetToken !== "string" || !resetToken.trim()) {
    throw new Error("RESET_TOKEN_INVALID");
  }

  validateNewPassword(password);

  const resetRequest = await PasswordReset.findOne({
    resetTokenHash: hashValue(resetToken),
    verified: true,
  });

  if (!resetRequest) {
    throw new Error("RESET_TOKEN_INVALID");
  }

  if (
    !resetRequest.resetTokenExpiresAt ||
    resetRequest.resetTokenExpiresAt.getTime() <= Date.now()
  ) {
    await PasswordReset.deleteOne({
      _id: resetRequest._id,
    });
    throw new Error("RESET_TOKEN_EXPIRED");
  }

  const user = await User.findById(resetRequest.userId).select("+password");

  if (!user) {
    await PasswordReset.deleteOne({
      _id: resetRequest._id,
    });
    throw new Error("USER_NOT_FOUND");
  }

  if (user.password) {
    const isSamePassword = await bcrypt.compare(password, user.password);

    if (isSamePassword) {
      throw new Error("PASSWORD_SAME_AS_OLD");
    }
  }

  if (!user.isActive) throw new Error("ACCOUNT_NOT_ACTIVE");
  const passwordHash = await bcrypt.hash(password, 12);
  // Token reset dùng đúng một lần, kể cả hai request cùng vượt qua bước đọc.
  const consumed = await PasswordReset.findOneAndDelete({
    _id: resetRequest._id,
    resetTokenHash: hashValue(resetToken),
    resetTokenExpiresAt: { $gt: new Date() },
  });
  if (!consumed) throw new Error("RESET_TOKEN_INVALID");
  await User.updateOne({ _id: user._id, isActive: true }, { $set: { password: passwordHash } });

  /* Revoke all existing sessions after password reset. */
  await RefreshToken.deleteMany({
    userId: user._id,
  });

  await PasswordReset.deleteMany({
    userId: user._id,
  });
};
