import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";

/*
 * `app` chỉ được import ĐỘNG, sau khi startTestDb() đã đặt MONGODB_URI vào
 * process.env. core/env.js validate env bằng Zod ngay lúc import (fail fast),
 * nên import tĩnh ở đầu file sẽ chạy trước khi DB test kịp khởi động.
 */
let app;

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
});

after(stopTestDb);
beforeEach(clearTestDb);

const validRegisterBody = () => ({
  fullName: "Nguyen Van A",
  email: "a@example.com",
  phone: "0901234567",
  password: "Matkhau123",
  confirmPassword: "Matkhau123",
  termsAccepted: true,
});

test("POST /api/auth/register tra ve envelope {ok:true} va tao user", async () => {
  const res = await request(app).post("/api/auth/register").send(validRegisterBody());

  assert.equal(res.status, 201);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.data.user.email, "a@example.com");
  assert.equal("password" in res.body.data.user, false);
});

test("POST /api/auth/register tra VALIDATION_ERROR khi mat khau qua ngan", async () => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ ...validRegisterBody(), password: "abc", confirmPassword: "abc" });

  assert.equal(res.status, 400);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
});

test("POST /api/auth/register tra CONFLICT khi email da ton tai", async () => {
  await request(app).post("/api/auth/register").send(validRegisterBody());
  const res = await request(app).post("/api/auth/register").send(validRegisterBody());

  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, "CONFLICT");
});

test("POST /api/auth/login tra accessToken + refreshToken trong body khi AUTH_TRANSPORT=both", async () => {
  await request(app).post("/api/auth/register").send(validRegisterBody());

  const res = await request(app)
    .post("/api/auth/login")
    .send({ identifier: "a@example.com", password: "Matkhau123" });

  assert.equal(res.status, 200);
  assert.ok(res.body.data.accessToken);
  assert.ok(res.body.data.refreshToken);
  assert.equal(res.body.data.user.email, "a@example.com");
});

test("POST /api/auth/login tra UNAUTHORIZED khi sai mat khau", async () => {
  await request(app).post("/api/auth/register").send(validRegisterBody());

  const res = await request(app)
    .post("/api/auth/login")
    .send({ identifier: "a@example.com", password: "SaiRoi123" });

  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, "UNAUTHORIZED");
});

test("GET /api/auth/me tra 401 khi khong co Bearer token", async () => {
  const res = await request(app).get("/api/auth/me");

  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, "UNAUTHORIZED");
});

test("GET /api/auth/me tra dung user khi co Bearer token hop le", async () => {
  await request(app).post("/api/auth/register").send(validRegisterBody());
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ identifier: "a@example.com", password: "Matkhau123" });

  const res = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${loginRes.body.data.accessToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.data.user.email, "a@example.com");
  assert.equal(res.body.data.user.googleLinked, false);
});

test("POST /api/auth/refresh cap access token moi va XOAY VONG refresh token", async () => {
  await request(app).post("/api/auth/register").send(validRegisterBody());
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ identifier: "a@example.com", password: "Matkhau123" });

  const firstRefreshToken = loginRes.body.data.refreshToken;

  const refreshRes = await request(app)
    .post("/api/auth/refresh")
    .send({ refreshToken: firstRefreshToken });

  assert.equal(refreshRes.status, 200);
  assert.ok(refreshRes.body.data.accessToken);
  assert.ok(refreshRes.body.data.refreshToken);
  assert.notEqual(refreshRes.body.data.refreshToken, firstRefreshToken);
});

test("dung lai refresh token da xoay vong TRONG cua so an han van duoc chap nhan", async () => {
  await request(app).post("/api/auth/register").send(validRegisterBody());
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ identifier: "a@example.com", password: "Matkhau123" });

  const firstRefreshToken = loginRes.body.data.refreshToken;
  await request(app).post("/api/auth/refresh").send({ refreshToken: firstRefreshToken });

  // Gọi lại NGAY (còn trong cửa sổ ân hạn REFRESH_ROTATION_GRACE_SECONDS=10s) --
  // đây là race lành tính, ví dụ hai tab cùng refresh gần như đồng thời.
  const replayRes = await request(app)
    .post("/api/auth/refresh")
    .send({ refreshToken: firstRefreshToken });

  assert.equal(replayRes.status, 200);
  assert.ok(replayRes.body.data.accessToken);
});

test("dung lai refresh token da xoay vong NGOAI cua so an han thu hoi toan bo family", async () => {
  // REFRESH_ROTATION_GRACE_SECONDS=1 trong môi trường test (xem test/setup.js) --
  // env.js đóng băng giá trị này lúc import nên test không đổi được giữa chừng,
  // ta chờ vượt quá 1 giây để chắc chắn đã ra khỏi cửa sổ ân hạn.
  const { refreshAccessToken } = await import("../src/services/refreshToken.service.js");

  await request(app).post("/api/auth/register").send(validRegisterBody());
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ identifier: "a@example.com", password: "Matkhau123" });

  const firstRefreshToken = loginRes.body.data.refreshToken;
  const rotated = await refreshAccessToken(firstRefreshToken);

  await new Promise((resolve) => setTimeout(resolve, 1200));

  const reuseRes = await request(app)
    .post("/api/auth/refresh")
    .send({ refreshToken: firstRefreshToken });

  assert.equal(reuseRes.status, 401);
  assert.equal(reuseRes.body.error.code, "UNAUTHORIZED");

  // Cả family bị thu hồi -- token vừa xoay vòng hợp lệ cũng phải bị chặn theo.
  const secondReuseRes = await request(app)
    .post("/api/auth/refresh")
    .send({ refreshToken: rotated.refreshToken });

  assert.equal(secondReuseRes.status, 401);
});

test("POST /api/auth/logout thu hoi refresh token, refresh sau do bi 401", async () => {
  await request(app).post("/api/auth/register").send(validRegisterBody());
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ identifier: "a@example.com", password: "Matkhau123" });

  const refreshToken = loginRes.body.data.refreshToken;

  const logoutRes = await request(app).post("/api/auth/logout").send({ refreshToken });
  assert.equal(logoutRes.status, 200);
  assert.equal(logoutRes.body.data.loggedOut, true);

  const refreshRes = await request(app).post("/api/auth/refresh").send({ refreshToken });
  assert.equal(refreshRes.status, 401);
});

test("GET /api/health tra envelope {ok:true} voi db va searchDriver", async () => {
  const res = await request(app).get("/api/health");

  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.data.db, "connected");
  assert.ok(res.body.data.searchDriver);
});
