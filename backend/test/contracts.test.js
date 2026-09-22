import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";

/*
 * Đối chiếu response THẬT của backend với fixture trong contracts/fixtures/ --
 * đây là "nguồn sự thật" duy nhất mà mobile cũng test ngược lại. Lệch ở đây
 * nghĩa là lệch cả hai phía, phát hiện ngay tại đây thay vì lúc tích hợp.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "..", "..", "contracts", "fixtures");

const readFixture = (name) => JSON.parse(fs.readFileSync(path.join(fixturesDir, name), "utf8"));

// So khớp HÌNH DẠNG (tập key), không so giá trị -- giá trị thật đổi theo thời gian
// (id sinh mới, timestamp), nhưng bộ field mà client dựa vào phải khớp tuyệt đối.
const assertSameKeys = (actual, expected, contextLabel) => {
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  assert.deepEqual(actualKeys, expectedKeys, `${contextLabel}: bộ field lệch với fixture`);
};

let app;

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
});

after(stopTestDb);
beforeEach(clearTestDb);

test("response cua /auth/register khop fixture auth.register.json", async () => {
  const fixture = readFixture("auth.register.json");

  const res = await request(app).post("/api/auth/register").send({
    fullName: "Nguyen Van A",
    email: "a@example.com",
    phone: "0901234567",
    password: "Matkhau123",
    confirmPassword: "Matkhau123",
    termsAccepted: true,
  });

  assert.equal(res.body.ok, true);
  assertSameKeys(res.body.data, fixture.data, "auth.register");
  assertSameKeys(res.body.data.user, fixture.data.user, "auth.register.user");
});

test("response cua /auth/login khop fixture auth.login.json", async () => {
  const fixture = readFixture("auth.login.json");

  await request(app).post("/api/auth/register").send({
    fullName: "Nguyen Van A",
    email: "a@example.com",
    phone: "0901234567",
    password: "Matkhau123",
    confirmPassword: "Matkhau123",
    termsAccepted: true,
  });

  const res = await request(app)
    .post("/api/auth/login")
    .send({ identifier: "a@example.com", password: "Matkhau123" });

  assert.equal(res.body.ok, true);
  assertSameKeys(res.body.data, fixture.data, "auth.login");
  assertSameKeys(res.body.data.user, fixture.data.user, "auth.login.user");
});

test("response cua /auth/me khop fixture auth.me.json", async () => {
  const fixture = readFixture("auth.me.json");

  await request(app).post("/api/auth/register").send({
    fullName: "Nguyen Van A",
    email: "a@example.com",
    phone: "0901234567",
    password: "Matkhau123",
    confirmPassword: "Matkhau123",
    termsAccepted: true,
  });
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ identifier: "a@example.com", password: "Matkhau123" });

  const res = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${loginRes.body.data.accessToken}`);

  assert.equal(res.body.ok, true);
  assertSameKeys(res.body.data, fixture.data, "auth.me");
  assertSameKeys(res.body.data.user, fixture.data.user, "auth.me.user");
});

test("loi VALIDATION_ERROR khop hinh dang fixture error.validation.json", async () => {
  const fixture = readFixture("error.validation.json");

  const res = await request(app).post("/api/auth/register").send({ email: "khong-hop-le" });

  assert.equal(res.body.ok, false);
  assertSameKeys(res.body.error, fixture.error, "error.validation");
  assert.equal(res.body.error.code, fixture.error.code);
});

test("loi UNAUTHORIZED khop hinh dang fixture error.unauthorized.json", async () => {
  const fixture = readFixture("error.unauthorized.json");

  const res = await request(app).get("/api/auth/me");

  assert.equal(res.body.ok, false);
  assertSameKeys(res.body.error, fixture.error, "error.unauthorized");
  assert.equal(res.body.error.code, fixture.error.code);
});
