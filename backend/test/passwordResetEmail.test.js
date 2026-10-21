import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";
import request from "supertest";
import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";
import { registerAndLogin } from "./helpers.js";

let app, PasswordReset;
let message;
let smtpFailure = true;
const originalTransport = nodemailer.createTransport;
before(async () => {
  // Transport tại chỗ: kiểm luồng HTTP thật, tuyệt đối không gửi email ra ngoài.
  process.env.SMTP_DISABLED = "false";
  process.env.SMTP_HOST = "smtp.example.test";
  process.env.SMTP_USER = "sender@example.test";
  process.env.SMTP_PASSWORD = "test-only";
  nodemailer.createTransport = () => ({
    verify: async () => {
      if (smtpFailure) throw Object.assign(new Error("unavailable"), { code: "EAUTH" });
    },
    sendMail: async (mail) => {
      message = mail;
      return { accepted: [mail.to] };
    },
  });
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
  ({ default: PasswordReset } = await import("../src/models/PasswordReset.js"));
});
after(async () => {
  nodemailer.createTransport = originalTransport;
  await stopTestDb();
});

test("SMTP hỏng trả cùng 502 cho email tồn tại/không tồn tại, sau đó khôi phục OTP đúng luồng", async () => {
  await clearTestDb();
  const { accessToken, user } = await registerAndLogin(app, { email: "reset@example.com" });
  for (const email of [user.email, "absent@example.com"]) {
    const res = await request(app).post("/api/auth/forgot-password").send({ email });
    assert.equal(res.status, 502);
    assert.equal(res.body.error.code, "UPSTREAM_ERROR");
  }
  assert.equal(await PasswordReset.countDocuments(), 0);
  smtpFailure = false;
  const sent = await request(app).post("/api/auth/forgot-password").send({ email: user.email });
  assert.equal(sent.status, 200);
  const otp = message.text.match(/Mã OTP của bạn là: (\d{6})/)[1];
  const verified = await request(app)
    .post("/api/auth/verify-reset-otp")
    .send({ email: user.email, otp });
  assert.equal(verified.status, 200);
  const token = verified.body.data.resetToken;
  const changed = await request(app)
    .post("/api/auth/reset-password")
    .send({ resetToken: token, password: "NewPassword123" });
  assert.equal(changed.status, 200);
  assert.equal(
    (
      await request(app)
        .post("/api/auth/reset-password")
        .send({ resetToken: token, password: "OtherPassword123" })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(app)
        .post("/api/auth/login")
        .send({ identifier: user.email, password: "Matkhau123" })
    ).status,
    401,
  );
  assert.equal(
    (
      await request(app)
        .post("/api/auth/login")
        .send({ identifier: user.email, password: "NewPassword123" })
    ).status,
    200,
  );
  // Đổi trực tiếp không phụ thuộc SMTP và phải hủy yêu cầu khôi phục đang chờ.
  await request(app).post("/api/auth/forgot-password").send({ email: user.email });
  assert.equal(await PasswordReset.countDocuments(), 1);
  smtpFailure = true;
  const direct = await request(app)
    .post("/api/auth/change-password")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ currentPassword: "NewPassword123", newPassword: "DirectPassword123" });
  assert.equal(direct.status, 200);
  assert.equal(await PasswordReset.countDocuments(), 0);
});
