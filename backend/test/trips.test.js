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

test("chua dang nhap goi /api/users/trips bi 401 UNAUTHORIZED", async () => {
  const res = await request(app).get("/api/users/trips");
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, "UNAUTHORIZED");
});

test("tao chuyen di moi LUON isCurrent:false (giong hanh vi mock)", async () => {
  const { accessToken } = await registerAndLogin(app);

  const res = await request(app)
    .post("/api/users/trips")
    .set("Authorization", auth(accessToken))
    .send({ countryCode: "kr", startDate: "2026-10-01", endDate: "2026-10-10" });

  assert.equal(res.status, 201);
  assert.equal(res.body.data.countryCode, "KR");
  assert.equal(res.body.data.isCurrent, false);
});

test("setCurrentTrip: chi 1 chuyen di isCurrent:true tai mot thoi diem", async () => {
  const { accessToken } = await registerAndLogin(app);
  const headers = { Authorization: auth(accessToken) };

  const t1 = await request(app).post("/api/users/trips").set(headers).send({
    countryCode: "KR", startDate: "2026-10-01", endDate: "2026-10-10",
  });
  const t2 = await request(app).post("/api/users/trips").set(headers).send({
    countryCode: "JP", startDate: "2026-11-01", endDate: "2026-11-10",
  });

  await request(app).put(`/api/users/trips/${t1.body.data._id}/current`).set(headers);
  const afterSecond = await request(app).put(`/api/users/trips/${t2.body.data._id}/current`).set(headers);

  assert.equal(afterSecond.status, 200);

  const list = await request(app).get("/api/users/trips").set(headers);
  const currentOnes = list.body.data.filter((t) => t.isCurrent);
  assert.equal(currentOnes.length, 1);
  assert.equal(currentOnes[0]._id, t2.body.data._id);
});

test("user A khong xem/xoa duoc chuyen di cua user B", async () => {
  const userA = await registerAndLogin(app);
  const userB = await registerAndLogin(app);

  const created = await request(app)
    .post("/api/users/trips")
    .set("Authorization", auth(userA.accessToken))
    .send({ countryCode: "KR", startDate: "2026-10-01", endDate: "2026-10-10" });

  const listB = await request(app).get("/api/users/trips").set("Authorization", auth(userB.accessToken));
  assert.equal(listB.body.data.length, 0);

  const deleteByB = await request(app)
    .delete(`/api/users/trips/${created.body.data._id}`)
    .set("Authorization", auth(userB.accessToken));
  assert.equal(deleteByB.status, 404);
  assert.equal(deleteByB.body.error.code, "NOT_FOUND");
});

test("endDate truoc startDate bi VALIDATION_ERROR", async () => {
  const { accessToken } = await registerAndLogin(app);

  const res = await request(app)
    .post("/api/users/trips")
    .set("Authorization", auth(accessToken))
    .send({ countryCode: "KR", startDate: "2026-10-10", endDate: "2026-10-01" });

  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
});
