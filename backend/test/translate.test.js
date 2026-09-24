import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";
import { registerAndLogin } from "./helpers.js";

let app;

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
});

after(stopTestDb);
beforeEach(clearTestDb);

const auth = (token) => `Bearer ${token}`;

test("POST /api/translate dich duoc voi MockLlm (LLM_PROVIDER=mock mac dinh o test)", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "user" });

  const res = await request(app)
    .post("/api/translate")
    .set("Authorization", auth(accessToken))
    .send({ text: "Tôi cần giúp đỡ", from: "Tiếng Việt", to: "Tiếng Hàn", mode: "text" });

  assert.equal(res.status, 200);
  assert.ok(res.body.data.translated.length > 0);
  assert.equal(typeof res.body.data.phonetic, "string");
});

test("POST /api/translate tu choi noi dung rong", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "user" });
  const res = await request(app)
    .post("/api/translate")
    .set("Authorization", auth(accessToken))
    .send({ text: "   ", from: "vi", to: "ko", mode: "text" });

  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
});

test("POST /api/translate tu choi noi dung qua 500 ky tu", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "user" });
  const res = await request(app)
    .post("/api/translate")
    .set("Authorization", auth(accessToken))
    .send({ text: "a".repeat(501), from: "vi", to: "ko", mode: "text" });

  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
});

test("chua dang nhap goi /api/translate bi 401 UNAUTHORIZED", async () => {
  const res = await request(app).post("/api/translate").send({ text: "xin chào", from: "vi", to: "ko" });
  assert.equal(res.status, 401);
});

test("Admin CRUD QuickPhrase, GET /api/quick-phrases cong khai tra dung thu tu", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });

  const p1 = await request(app)
    .post("/api/admin/quick-phrases")
    .set("Authorization", auth(accessToken))
    .send({ countryCode: "KR", vi: "Tôi cần giúp đỡ", translated: "도와주세요", phonetic: "Dowajuseyo", order: 2 });
  assert.equal(p1.status, 201);

  const p2 = await request(app)
    .post("/api/admin/quick-phrases")
    .set("Authorization", auth(accessToken))
    .send({ countryCode: "KR", vi: "Tôi bị mất hộ chiếu", translated: "여권을 잃어버렸어요", order: 1 });
  assert.equal(p2.status, 201);

  const listRes = await request(app).get("/api/quick-phrases").query({ country: "KR" });
  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.data.length, 2);
  assert.equal(listRes.body.data[0].vi, "Tôi bị mất hộ chiếu", "phai sap xep theo order tang dan");

  const updateRes = await request(app)
    .patch(`/api/admin/quick-phrases/${p1.body.data._id}`)
    .set("Authorization", auth(accessToken))
    .send({ order: 0 });
  assert.equal(updateRes.status, 200);

  const afterUpdate = await request(app).get("/api/quick-phrases").query({ country: "KR" });
  assert.equal(afterUpdate.body.data[0].vi, "Tôi cần giúp đỡ");
});

test("GET /api/quick-phrases thieu country bi VALIDATION_ERROR", async () => {
  const res = await request(app).get("/api/quick-phrases");
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
});
