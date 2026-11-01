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

test("GET /api/auth/me tra ve preferences mac dinh", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "user" });
  const res = await request(app).get("/api/auth/me").set("Authorization", auth(accessToken));
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.user.preferences, {
    locale: "vi",
    alerts: { legal: true, safety: true, tripReminder: false },
    locationConsent: false,
  });
});

test("PUT /api/users/preferences chi ghi de dung field duoc gui, con lai giu nguyen", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "user" });

  const res = await request(app)
    .put("/api/users/preferences")
    .set("Authorization", auth(accessToken))
    .send({ alerts: { safety: false }, locationConsent: false });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data, {
    locale: "vi",
    alerts: { legal: true, safety: false, tripReminder: false },
    locationConsent: false,
  });

  const me = await request(app).get("/api/auth/me").set("Authorization", auth(accessToken));
  assert.equal(
    me.body.data.user.preferences.locationConsent,
    false,
    "phai con nguyen sau khi doc lai",
  );
});

test("chua dang nhap goi PUT /api/users/preferences bi 401 UNAUTHORIZED", async () => {
  const res = await request(app).put("/api/users/preferences").send({ locationConsent: false });
  assert.equal(res.status, 401);
});
