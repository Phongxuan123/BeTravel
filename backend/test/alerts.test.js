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

// Toa do that: trung tam Seoul va Busan (cach nhau ~320km) -- dung so gia se
// khong bat duoc loi dao [lat,lng] (CLAUDE.md Phan 6 "Cam bay da biet").
const SEOUL = { lat: 37.5665, lng: 126.978 };
const BUSAN = { lat: 35.1796, lng: 129.0756 };

const countryAlert = {
  countryCode: "KR",
  scope: "country",
  title: "Cảnh báo cả nước",
  message: "Áp dụng toàn bộ Hàn Quốc",
  severity: "warn",
  effectiveFrom: "2020-01-01T00:00:00.000Z",
  status: "published",
};

const areaAlertNearSeoul = {
  countryCode: "KR",
  scope: "area",
  center: { type: "Point", coordinates: [SEOUL.lng, SEOUL.lat] },
  radiusM: 5000,
  title: "Biểu tình gần Seoul",
  message: "Tránh khu vực trung tâm Seoul",
  severity: "danger",
  effectiveFrom: "2020-01-01T00:00:00.000Z",
  status: "published",
};

const draftAlert = { ...countryAlert, title: "Chưa xuất bản", status: "draft" };
const expiredAlert = {
  ...countryAlert,
  title: "Đã hết hiệu lực",
  effectiveFrom: "2020-01-01T00:00:00.000Z",
  effectiveTo: "2020-02-01T00:00:00.000Z",
};

async function createAlert(app, token, body) {
  return request(app).post("/api/admin/geo-alerts").set("Authorization", auth(token)).send(body);
}

test("Admin tao GeoAlert scope 'area' thieu center/radiusM bi VALIDATION_ERROR", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  const res = await createAlert(app, accessToken, { ...areaAlertNearSeoul, center: undefined, radiusM: undefined });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
});

test("non-admin khong tao duoc GeoAlert", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "user" });
  const res = await createAlert(app, accessToken, countryAlert);
  assert.equal(res.status, 403);
});

test("GET /api/alerts/applicable khong co toa do -> CHI alert scope 'country', khong tra rong", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  await createAlert(app, accessToken, countryAlert);
  await createAlert(app, accessToken, areaAlertNearSeoul);

  const res = await request(app).get("/api/alerts/applicable").query({ country: "KR" });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].scope, "country");
});

test("GET /api/alerts/applicable co toa do trong ban kinh -> gom ca alert 'area'", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  await createAlert(app, accessToken, countryAlert);
  await createAlert(app, accessToken, areaAlertNearSeoul);

  const res = await request(app).get("/api/alerts/applicable").query({ country: "KR", lat: SEOUL.lat, lng: SEOUL.lng });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 2);
  // Severity giam dan: danger truoc warn.
  assert.equal(res.body.data[0].severity, "danger");
});

test("GET /api/alerts/applicable toa do NGOAI ban kinh -> khong gom alert 'area'", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  await createAlert(app, accessToken, areaAlertNearSeoul);

  const res = await request(app).get("/api/alerts/applicable").query({ country: "KR", lat: BUSAN.lat, lng: BUSAN.lng });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 0);
});

test("GET /api/alerts/applicable loai bo alert draft va het hieu luc", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  await createAlert(app, accessToken, draftAlert);
  await createAlert(app, accessToken, expiredAlert);
  await createAlert(app, accessToken, countryAlert);

  const res = await request(app).get("/api/alerts/applicable").query({ country: "KR" });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].title, countryAlert.title);
});
