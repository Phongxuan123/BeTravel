import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { startTestDb, stopTestDb } from "./setup.js";
import { registerAndLogin } from "./helpers.js";

/*
 * ASSISTANT_ENABLED=false la khoa chinh (H1): Admin khong bat lai duoc va co DB "bat" cung
 * khong mo duoc tro ly. env.js dong bang gia tri luc nap nen dat TRUOC khi import app (moi file
 * test chay trong tien trinh rieng).
 */
process.env.ASSISTANT_ENABLED = "false";

let app;
let AppSetting;

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
  AppSetting = (await import("../src/models/AppSetting.js")).default;
});

after(stopTestDb);

test("env tat: Admin thay ro trang thai, khong bat duoc, /api/assistant van bi chan", async () => {
  const admin = await registerAndLogin(app, { role: "admin" });
  const user = await registerAndLogin(app);
  await AppSetting.create({ key: "assistant.enabled", value: true });

  const settings = await request(app)
    .get("/api/admin/assistant/settings")
    .set("Authorization", `Bearer ${admin.accessToken}`);
  assert.equal(settings.body.data.envEnabled, false);
  assert.equal(settings.body.data.enabled, true);
  assert.equal(settings.body.data.active, false);

  const enable = await request(app)
    .patch("/api/admin/assistant/settings")
    .set("Authorization", `Bearer ${admin.accessToken}`)
    .send({ enabled: true });
  assert.equal(enable.status, 409);
  assert.equal(enable.body.error.code, "CONFLICT");
  assert.equal(enable.body.error.details.reason, "ENV_DISABLED");

  const ask = await request(app)
    .post("/api/assistant/messages")
    .set("Authorization", `Bearer ${user.accessToken}`)
    .send({ countryCode: "AU", message: "Xin chào" });
  assert.equal(ask.status, 502);
  assert.equal(ask.body.error.code, "UPSTREAM_ERROR");
});
