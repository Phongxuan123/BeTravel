import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";
import { registerAndLogin } from "./helpers.js";
import { ChatRole } from "../src/core/constants.js";

let app;
let ChatSession;
let ChatMessage;

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
  ({ default: ChatSession } = await import("../src/models/ChatSession.js"));
  ({ default: ChatMessage } = await import("../src/models/ChatMessage.js"));
});

after(stopTestDb);
beforeEach(clearTestDb);

const auth = (token) => `Bearer ${token}`;

// Tao truc tiep 1 phien + 1 tin nhan assistant trong DB, khong chay ca pipeline
// RAG that -- module feedback (B5) chi can MOT ChatMessage that su ton tai va
// thuoc dung user, khong quan tam noi dung cau tra loi tu dau ra.
async function seedAssistantMessage(userId, overrides = {}) {
  const session = await ChatSession.create({ userId, countryCode: "KR", title: "Câu hỏi test" });
  const message = await ChatMessage.create({
    sessionId: session._id,
    role: ChatRole.ASSISTANT,
    text: "Câu trả lời test [S1].",
    citations: [],
    ...overrides,
  });
  return { session, message };
}

test("POST /api/chat/sessions/:id/messages/:messageId/feedback -- thumbs len tin nhan cua chinh minh", async () => {
  const { accessToken, user } = await registerAndLogin(app, { role: "user" });
  const { session, message } = await seedAssistantMessage(user.id);

  const res = await request(app)
    .post(`/api/chat/sessions/${session._id}/messages/${message._id}/feedback`)
    .set("Authorization", auth(accessToken))
    .send({ feedback: "up" });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.feedback, "up");
});

test("POST /api/feedback -- bao sai tin nhan CUA CHINH MINH thanh cong, xuat hien trong hang doi admin", async () => {
  const { accessToken, user } = await registerAndLogin(app, { role: "user" });
  const { session, message } = await seedAssistantMessage(user.id);

  const res = await request(app)
    .post("/api/feedback")
    .set("Authorization", auth(accessToken))
    .send({
      targetType: "chat_message",
      targetId: String(message._id),
      rating: "down",
      note: "Mức phạt ghi sai",
      context: { countryCode: session.countryCode, question: "Câu hỏi test" },
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.data.status, "pending");

  const { accessToken: adminToken } = await registerAndLogin(app, { role: "admin" });
  const listRes = await request(app).get("/api/admin/feedback").set("Authorization", auth(adminToken));
  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.data.length, 1);
  assert.equal(listRes.body.data[0].note, "Mức phạt ghi sai");
});

test("POST /api/feedback -- bao sai tin nhan CUA NGUOI KHAC bi tu choi (khong lo du lieu chat nguoi khac)", async () => {
  const { user: owner } = await registerAndLogin(app, { role: "user" });
  const { message } = await seedAssistantMessage(owner.id);

  const { accessToken: attackerToken } = await registerAndLogin(app, { role: "user" });
  const res = await request(app)
    .post("/api/feedback")
    .set("Authorization", auth(attackerToken))
    .send({ targetType: "chat_message", targetId: String(message._id), rating: "down", note: "spam" });

  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, "NOT_FOUND");
});

test("GET/PATCH /api/admin/feedback/:id -- xem chi tiet kem tin nhan goc, doi trang thai, ghi audit log", async () => {
  const { user } = await registerAndLogin(app, { role: "user" });
  const { message } = await seedAssistantMessage(user.id, { text: "Trả lời cần sửa [S1]." });

  const Feedback = (await import("../src/models/Feedback.js")).default;
  const feedback = await Feedback.create({
    userId: user.id,
    targetType: "chat_message",
    targetId: message._id,
    rating: "down",
    note: "Sai điều luật",
  });

  const { accessToken: adminToken } = await registerAndLogin(app, { role: "admin" });

  const detailRes = await request(app).get(`/api/admin/feedback/${feedback._id}`).set("Authorization", auth(adminToken));
  assert.equal(detailRes.status, 200);
  assert.equal(detailRes.body.data.message.text, "Trả lời cần sửa [S1].");

  const patchRes = await request(app)
    .patch(`/api/admin/feedback/${feedback._id}`)
    .set("Authorization", auth(adminToken))
    .send({ status: "resolved", reviewerNote: "Đã sửa bài luật" });

  assert.equal(patchRes.status, 200);
  assert.equal(patchRes.body.data.status, "resolved");
  assert.equal(patchRes.body.data.reviewerNote, "Đã sửa bài luật");

  const auditRes = await request(app).get("/api/admin/audit").set("Authorization", auth(adminToken));
  const entry = auditRes.body.data.find((a) => a.entityType === "Feedback");
  assert.ok(entry, "phai co audit log cho thao tac doi trang thai feedback");
});

test("GET /api/admin/analytics/overview -- tra ve so lieu AI ke ca khi chua co ai_events nao", async () => {
  const { accessToken: adminToken } = await registerAndLogin(app, { role: "admin" });

  const res = await request(app).get("/api/admin/analytics/overview").set("Authorization", auth(adminToken));
  assert.equal(res.status, 200);
  assert.equal(res.body.data.totalChats, 0);
  assert.equal(res.body.data.fallbackRate, 0);
  assert.deepEqual(res.body.data.topFallbackQuestions, []);
});
