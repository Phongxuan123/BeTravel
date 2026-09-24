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

const globalIncident = {
  slug: "mat-ho-chieu",
  countryCode: null,
  title: "Mất hộ chiếu",
  urgent: true,
  reassurance: "Giữ bình tĩnh.",
  status: "published",
  steps: [
    { title: "Trình báo công an", body: ["Xin giấy xác nhận"], ctas: [{ type: "map", label: "Đồn gần nhất", payload: { locationType: "police" } }] },
    { title: "Liên hệ Đại sứ quán", body: [], ctas: [{ type: "call", label: "Gọi ngay", payload: {} }] },
  ],
};

const krIncident = {
  slug: "vi-pham-giao-thong-kr",
  countryCode: "KR",
  title: "Vi phạm giao thông tại Hàn Quốc",
  status: "published",
  steps: [{ title: "Xuất trình giấy tờ", body: [] }],
};

const draftIncident = {
  slug: "dang-soan",
  countryCode: "KR",
  title: "Đang soạn, chưa xuất bản",
  status: "draft",
  steps: [],
};

test("Admin tao IncidentType, step.order duoc chuan hoa theo thu tu mang", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });

  const res = await request(app).post("/api/admin/incidents").set("Authorization", auth(accessToken)).send(globalIncident);

  assert.equal(res.status, 201);
  assert.equal(res.body.data.steps.length, 2);
  assert.equal(res.body.data.steps[0].order, 0);
  assert.equal(res.body.data.steps[1].order, 1);
  assert.equal(res.body.data.steps[0].ctas[0].type, "map");
});

test("non-admin khong tao duoc IncidentType", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "user" });
  const res = await request(app).post("/api/admin/incidents").set("Authorization", auth(accessToken)).send(globalIncident);
  assert.equal(res.status, 403);
});

test("GET /api/incidents?country= gop workflow toan cuc + rieng quoc gia, KHONG lo draft", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  await Promise.all(
    [globalIncident, krIncident, draftIncident].map((body) =>
      request(app).post("/api/admin/incidents").set("Authorization", auth(accessToken)).send(body),
    ),
  );

  const res = await request(app).get("/api/incidents").query({ country: "KR" });
  assert.equal(res.status, 200);
  const slugs = res.body.data.map((i) => i.slug);
  assert.ok(slugs.includes("mat-ho-chieu"), "phai co workflow toan cuc");
  assert.ok(slugs.includes("vi-pham-giao-thong-kr"), "phai co workflow rieng KR");
  assert.ok(!slugs.includes("dang-soan"), "KHONG duoc lo workflow con draft");
});

test("Quoc gia chua co workflow rieng van thay duoc nhom toan cuc, khong tra mang rong", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  await request(app).post("/api/admin/incidents").set("Authorization", auth(accessToken)).send(globalIncident);

  const res = await request(app).get("/api/incidents").query({ country: "TH" });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].slug, "mat-ho-chieu");
});

test("GET /api/incidents/:slug tra 404 cho workflow con draft", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  await request(app).post("/api/admin/incidents").set("Authorization", auth(accessToken)).send(draftIncident);

  const res = await request(app).get("/api/incidents/dang-soan");
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, "NOT_FOUND");
});

test("Tien do xu ly su co: luu/doc rieng theo tung user, khong lan nhau", async () => {
  const admin = await registerAndLogin(app, { role: "admin" });
  const created = await request(app).post("/api/admin/incidents").set("Authorization", auth(admin.accessToken)).send(globalIncident);
  const incidentId = created.body.data._id;

  const userA = await registerAndLogin(app, { role: "user" });
  const userB = await registerAndLogin(app, { role: "user" });

  const putRes = await request(app)
    .put(`/api/users/incident-progress/${incidentId}`)
    .set("Authorization", auth(userA.accessToken))
    .send({ completedSteps: [0] });
  assert.equal(putRes.status, 200);
  assert.deepEqual(putRes.body.data.completedSteps, [0]);

  const getA = await request(app).get(`/api/users/incident-progress/${incidentId}`).set("Authorization", auth(userA.accessToken));
  assert.deepEqual(getA.body.data.completedSteps, [0]);

  const getB = await request(app).get(`/api/users/incident-progress/${incidentId}`).set("Authorization", auth(userB.accessToken));
  assert.deepEqual(getB.body.data.completedSteps, []);
});

test("Tien do bo qua step.order khong con ton tai trong workflow hien hanh", async () => {
  const admin = await registerAndLogin(app, { role: "admin" });
  const created = await request(app).post("/api/admin/incidents").set("Authorization", auth(admin.accessToken)).send(globalIncident);
  const incidentId = created.body.data._id;

  const user = await registerAndLogin(app, { role: "user" });
  const res = await request(app)
    .put(`/api/users/incident-progress/${incidentId}`)
    .set("Authorization", auth(user.accessToken))
    .send({ completedSteps: [0, 1, 99] });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.completedSteps, [0, 1]);
});

test("chua dang nhap goi /api/users/incident-progress bi 401 UNAUTHORIZED", async () => {
  const res = await request(app).get("/api/users/incident-progress/000000000000000000000000");
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, "UNAUTHORIZED");
});
