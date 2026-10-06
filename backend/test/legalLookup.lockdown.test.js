import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { startTestDb, stopTestDb } from "./setup.js";
import { registerAndLogin } from "./helpers.js";

/*
 * Cong chan tam thoi tra cuu phap luat: env.js dong bang gia tri luc nap lan
 * dau nen file nay dat LEGAL_LOOKUP_ENABLED=false TRUOC khi import app (moi
 * file test chay trong tien trinh rieng, khong anh huong file khac).
 */
process.env.LEGAL_LOOKUP_ENABLED = "false";

let app;

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
});

after(stopTestDb);

const assertFeatureDisabled = (res) => {
  assert.equal(res.status, 403);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.error.code, "FORBIDDEN");
  assert.equal(res.body.error.details.reason, "FEATURE_DISABLED");
};

test("khi tat, moi endpoint /api/legal/* tra FORBIDDEN + FEATURE_DISABLED", async () => {
  assertFeatureDisabled(await request(app).get("/api/legal/topics?country=KR"));
  assertFeatureDisabled(await request(app).get("/api/legal/articles?country=KR"));
  assertFeatureDisabled(await request(app).get("/api/legal/articles/KR/visa-nhap-canh"));
  assertFeatureDisabled(await request(app).get("/api/legal/search?q=visa&country=KR"));
});

test("khi tat, /api/chat/* bi chan ngay ca khi chua dang nhap va khi da dang nhap", async () => {
  assertFeatureDisabled(await request(app).get("/api/chat/sessions"));

  const { accessToken } = await registerAndLogin(app);
  const res = await request(app)
    .post("/api/chat/sessions")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ countryCode: "KR" });
  assertFeatureDisabled(res);
});

test("khi tat, cac tinh nang khac van hoat dong (health, quoc gia, SOS)", async () => {
  assert.equal((await request(app).get("/api/health")).status, 200);
  assert.equal((await request(app).get("/api/countries")).status, 200);
  assert.equal((await request(app).get("/api/incidents")).status, 200);
});
