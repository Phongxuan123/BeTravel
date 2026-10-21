import nodemailer from "nodemailer";

import { env } from "../core/env.js";

let transporter = null;
const SMTP_TIMEOUT_MS = 10000;
const HEALTH_TTL_MS = 30000;
let healthyUntil = 0;
let healthCheck = null;

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD"];

  const missing = required.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`SMTP_CONFIG_MISSING:${missing.join(",")}`);
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    requireTLS: !env.SMTP_SECURE,
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });

  return transporter;
};

// Kiểm tra chung TRƯỚC tra tài khoản: lỗi cấu hình/SMTP giống nhau cho mọi email.
// Chỉ test được bỏ gửi; dev/production không được báo thành công khi tắt SMTP.
export const verifyPasswordResetEmailService = async () => {
  if (env.SMTP_DISABLED && env.NODE_ENV === "test") return;
  if (env.SMTP_DISABLED) throw new Error("PASSWORD_RESET_EMAIL_FAILED");
  if (healthyUntil > Date.now()) return;
  if (!healthCheck) {
    healthCheck = Promise.resolve()
      .then(() => getTransporter().verify())
      .then(() => {
        healthyUntil = Date.now() + HEALTH_TTL_MS;
      })
      .catch((error) => {
        console.error("[password-reset] SMTP unavailable:", error.code || "SMTP_CONFIG_ERROR");
        throw new Error("PASSWORD_RESET_EMAIL_FAILED");
      })
      .finally(() => {
        healthCheck = null;
      });
  }
  await healthCheck;
};

export const sendPasswordResetOtpEmail = async ({
  to,
  otp,
  expiresMinutes = 5,
  fullName = "Bạn",
}) => {
  if (!to) {
    throw new Error("EMAIL_RECIPIENT_MISSING");
  }

  if (!otp) {
    throw new Error("OTP_MISSING");
  }

  // Chỉ test bỏ gửi; dev/production phải cấu hình SMTP thật.
  if (env.SMTP_DISABLED && env.NODE_ENV === "test") return;
  if (env.SMTP_DISABLED) throw new Error("PASSWORD_RESET_EMAIL_FAILED");

  const mailer = getTransporter();

  const result = await mailer.sendMail({
    from: { name: "BeTravel", address: env.SMTP_USER },
    to,
    subject: "Mã OTP khôi phục mật khẩu - BeTravel",
    text: [
      `Xin chào ${fullName},`,
      "",
      "Bạn vừa yêu cầu khôi phục mật khẩu tài khoản BeTravel.",
      "",
      `Mã OTP của bạn là: ${otp}`,
      "",
      `Mã OTP có hiệu lực trong ${expiresMinutes} phút.`,
      "Vui lòng không cung cấp mã này cho bất kỳ ai.",
      "",
      "Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.",
      "",
      "BeTravel",
    ].join("\n"),
    html: `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#243447">
                <h2>Khôi phục mật khẩu BeTravel</h2>
                <p>Xin chào <strong>${escapeHtml(fullName)}</strong>,</p>
                <p>Mã OTP của bạn là:</p>
                <div style="font-size:28px;font-weight:700;letter-spacing:6px;padding:12px 18px;background:#f3f6f9;display:inline-block;border-radius:8px">${otp}</div>
                <p>Mã có hiệu lực trong <strong>${expiresMinutes} phút</strong>.</p>
                <p>Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.</p>
            </div>
        `,
  });
  if (!result.accepted?.length) {
    healthyUntil = 0;
    throw new Error("SMTP_RECIPIENT_REJECTED");
  }
};
