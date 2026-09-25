import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";
import { registerAndLogin } from "./helpers.js";

let app;
let ChatSession;

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
  ({ default: ChatSession } = await import("../src/models/ChatSession.js"));
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
    locationConsent: true,
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
  assert.equal(me.body.data.user.preferences.locationConsent, false, "phai con nguyen sau khi doc lai");
});

test("chua dang nhap goi PUT /api/users/preferences bi 401 UNAUTHORIZED", async () => {
  const res = await request(app).put("/api/users/preferences").send({ locationConsent: false });
  assert.equal(res.status, 401);
});

test("PATCH /api/chat/sessions/:id doi ten phien, rieng tung user", async () => {
  const userA = await registerAndLogin(app, { role: "user" });
  const userB = await registerAndLogin(app, { role: "user" });

  const session = await ChatSession.create({ userId: userA.user.id, countryCode: "KR", title: "Câu hỏi test" });
  const sessionId = session._id;

  const renameRes = await request(app)
    .patch(`/api/chat/sessions/${sessionId}`)
    .set("Authorization", auth(userA.accessToken))
    .send({ title: "Hỏi về visa lao động" });
  assert.equal(renameRes.status, 200);
  assert.equal(renameRes.body.data.title, "Hỏi về visa lao động");

  const renameOtherUser = await request(app)
    .patch(`/api/chat/sessions/${sessionId}`)
    .set("Authorization", auth(userB.accessToken))
    .send({ title: "Chiếm quyền" });
  assert.equal(renameOtherUser.status, 404, "khong duoc doi ten phien cua user khac");
});

test("PATCH /api/chat/sessions/:id tu choi ten rong", async () => {
  const { accessToken, user } = await registerAndLogin(app, { role: "user" });
  const session = await ChatSession.create({ userId: user.id, countryCode: "KR", title: "Câu hỏi test" });

  const res = await request(app)
    .patch(`/api/chat/sessions/${session._id}`)
    .set("Authorization", auth(accessToken))
    .send({ title: "   " });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
});
