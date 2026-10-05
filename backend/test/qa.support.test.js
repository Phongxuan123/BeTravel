import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";
import { registerAndLogin } from "./helpers.js";

/*
 * Dot QA-3 (docs/07_QA_BugHunt.md, M08-M12): SOS, workflow su co, dich khan
 * cap, canh bao vi tri, favorites/trips/preferences. Moi test ghi ma INV/H de
 * doi chieu docs/QA_REPORT.md. Chi dung provider mock.
 */

let app;
let m;
let llmIndex;

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
  m = {
    Country: (await import("../src/models/Country.js")).default,
    LegalArticle: (await import("../src/models/LegalArticle.js")).default,
    SupportLocation: (await import("../src/models/SupportLocation.js")).default,
    IncidentType: (await import("../src/models/IncidentType.js")).default,
    UserIncidentProgress: (await import("../src/models/UserIncidentProgress.js")).default,
    QuickPhrase: (await import("../src/models/QuickPhrase.js")).default,
    GeoAlert: (await import("../src/models/GeoAlert.js")).default,
    Favorite: (await import("../src/models/Favorite.js")).default,
    Trip: (await import("../src/models/Trip.js")).default,
    User: (await import("../src/models/User.js")).default,
  };
  llmIndex = await import("../src/rag/llm/index.js");
});

after(stopTestDb);
beforeEach(async () => {
  await clearTestDb();
  const { createMockLlmProvider } = await import("../src/rag/llm/mock.llm.js");
  llmIndex.__setLlmProviderForTest(createMockLlmProvider());
});

const as = (token) => ({ Authorization: `Bearer ${token}` });
const SEOUL = { lat: 37.5665, lng: 126.978 };

const createIncident = (overrides = {}) =>
  m.IncidentType.create({
    slug: "mat-ho-chieu",
    countryCode: null,
    title: "Mất hộ chiếu",
    status: "published",
    steps: [
      { order: 0, title: "Trình báo công an", body: [] },
      { order: 1, title: "Liên hệ Đại sứ quán", body: [] },
      { order: 2, title: "Xin giấy thông hành", body: [] },
    ],
    ...overrides,
  });

const alertBody = (overrides = {}) => ({
  countryCode: "KR",
  scope: "country",
  title: "Cảnh báo",
  message: "Nội dung",
  severity: "warn",
  effectiveFrom: "2020-01-01T00:00:00.000Z",
  status: "published",
  ...overrides,
});

// ── M08: SOS ─────────────────────────────────────────────────────────────

test("INV-08.2 toa do ngoai mien va ban kinh qua lon bi 400", async () => {
  for (const query of [
    { lat: 91, lng: 127 },
    { lat: 37, lng: 181 },
    { lat: "abc", lng: 127 },
    { ...SEOUL, radiusKm: 5000 },
    { ...SEOUL, limit: 1000 },
  ]) {
    const res = await request(app).get("/api/support-locations/nearby").query(query);
    assert.equal(res.status, 400, JSON.stringify(query));
  }
});

test("INV-08.6 website chi http(s); diem khong co kenh lien lac bi tu choi", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  const base = {
    countryCode: "KR",
    type: "hospital",
    name: "Bệnh viện",
    address: "Seoul",
    location: { type: "Point", coordinates: [SEOUL.lng, SEOUL.lat] },
  };
  for (const body of [
    { ...base, website: "javascript:alert(1)" },
    { ...base, website: "ftp://example.org" },
    { ...base, phone: "   " },
  ]) {
    const res = await request(app).post("/api/admin/locations").set(as(accessToken)).send(body);
    assert.equal(res.status, 400, JSON.stringify(body));
  }
});

// ── M09: workflow su co ──────────────────────────────────────────────────

test("INV-09.3 PUT tien do dong thoi cua cung user chi tao 1 ban ghi", async () => {
  const incident = await createIncident();
  const { accessToken, user } = await registerAndLogin(app);
  const results = await Promise.all(
    [[0], [0, 1], [1, 2]].map((completedSteps) =>
      request(app)
        .put(`/api/users/incident-progress/${incident._id}`)
        .set(as(accessToken))
        .send({ completedSteps: completedSteps.map((order) => incident.steps[order].stepId) }),
    ),
  );
  assert.ok(results.every((res) => res.status === 200));
  assert.equal(await m.UserIncidentProgress.countDocuments({ userId: user.id }), 1);
});

test("H-09.a đảo thứ tự bước vẫn giữ đúng dấu tick, kể cả tiến độ cũ dạng số", async () => {
  const incident = await createIncident();
  const { user: loginUser } = await registerAndLogin(app);
  const user = { _id: loginUser.id };
  await m.UserIncidentProgress.create({
    userId: user._id,
    incidentId: incident._id,
    completedSteps: [0],
  });
  const service = await import("../src/services/incident.service.js");
  const reordered = [incident.steps[2], incident.steps[1], incident.steps[0]].map((step) =>
    step.toObject(),
  );
  const after = await service.updateIncident(
    incident._id,
    { steps: reordered, updatedAt: incident.updatedAt.toISOString() },
    user._id,
  );
  const progress = await service.getProgress(user._id, incident._id);
  assert.equal(after.steps.find((step) => step.stepId === progress[0]).title, "Trình báo công an");
});

test("QA5-E2E PATCH chi doi status/title khong xoa steps (incident) va behaviorsToAvoid (geo-alert)", async () => {
  // Zod 4: .partial() van ap .default([]) cua schema tao --> field khong gui bi ghi de rong.
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  const incident = await createIncident({ status: "draft" });
  const patchedIncident = await request(app)
    .patch(`/api/admin/incidents/${incident._id}`)
    .set(as(accessToken))
    .send({ status: "published", updatedAt: incident.updatedAt.toISOString() });
  assert.equal(patchedIncident.status, 200);
  assert.equal(patchedIncident.body.data.steps.length, 3);

  const alert = await request(app)
    .post("/api/admin/geo-alerts")
    .set(as(accessToken))
    .send(alertBody({ behaviorsToAvoid: ["Không tụ tập"] }));
  const patchedAlert = await request(app)
    .patch(`/api/admin/geo-alerts/${alert.body.data._id}`)
    .set(as(accessToken))
    .send({ title: "Tiêu đề mới" });
  assert.equal(patchedAlert.status, 200);
  assert.deepEqual(patchedAlert.body.data.behaviorsToAvoid, ["Không tụ tập"]);
});

// ── M10: dich khan cap ───────────────────────────────────────────────────

test("INV-10.2 ngon ngu nguon/dich gioi han do dai (khong vuot tran chi phi AI)", async () => {
  const { accessToken } = await registerAndLogin(app);
  for (const override of [{ to: "x".repeat(5000) }, { from: "y".repeat(5000) }]) {
    const res = await request(app)
      .post("/api/translate")
      .set(as(accessToken))
      .send({ text: "Xin chào", from: "Tiếng Việt", to: "Tiếng Hàn", ...override });
    assert.equal(res.status, 400, Object.keys(override)[0]);
  }
});

test("INV-10.3 provider loi/JSON hong --> 502 UPSTREAM_ERROR, khong 500", async () => {
  const { accessToken } = await registerAndLogin(app);
  for (const complete of [
    async () => {
      throw new Error("timeout");
    },
    async () => "khong phai json",
    async () => JSON.stringify({ translated: "  " }),
  ]) {
    llmIndex.__setLlmProviderForTest({ model: "broken", complete });
    const res = await request(app)
      .post("/api/translate")
      .set(as(accessToken))
      .send({ text: "Xin chào", from: "Tiếng Việt", to: "Tiếng Hàn" });
    assert.equal(res.status, 502);
    assert.equal(res.body.error.code, "UPSTREAM_ERROR");
  }
});

test("INV-10.5 mau cau cong khai loc dung quoc gia", async () => {
  await m.QuickPhrase.create({
    countryCode: "KR",
    vi: "Cứu tôi",
    translated: "도와주세요",
    order: 1,
  });
  await m.QuickPhrase.create({ countryCode: "JP", vi: "Cứu tôi", translated: "助けて", order: 1 });
  const res = await request(app).get("/api/quick-phrases?country=kr");
  assert.deepEqual(
    res.body.data.map((p) => p.countryCode),
    ["KR"],
  );
});

// ── M11: canh bao vi tri ─────────────────────────────────────────────────

test("INV-11.1 effectiveTo truoc effectiveFrom bi 400 ca khi tao lan PATCH", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  const bad = alertBody({ effectiveTo: "2019-01-01T00:00:00.000Z" });
  const created = await request(app).post("/api/admin/geo-alerts").set(as(accessToken)).send(bad);
  assert.equal(created.status, 400);

  const ok = await request(app)
    .post("/api/admin/geo-alerts")
    .set(as(accessToken))
    .send(alertBody());
  const patched = await request(app)
    .patch(`/api/admin/geo-alerts/${ok.body.data._id}`)
    .set(as(accessToken))
    .send({ effectiveTo: "2019-01-01T00:00:00.000Z" });
  assert.equal(patched.status, 400);
});

test("INV-11.2 chi tra canh bao dung quoc gia va da den ngay hieu luc", async () => {
  await m.GeoAlert.create(alertBody({ title: "KR hiện hành" }));
  await m.GeoAlert.create(alertBody({ countryCode: "JP", title: "JP" }));
  await m.GeoAlert.create(
    alertBody({ title: "Chưa tới ngày", effectiveFrom: new Date(Date.now() + 86_400_000) }),
  );
  const res = await request(app)
    .get("/api/alerts/applicable")
    .query({ country: "KR", ...SEOUL });
  assert.deepEqual(
    res.body.data.map((a) => a.title),
    ["KR hiện hành"],
  );
});

// ── M12: favorites, trips, preferences ───────────────────────────────────

test("INV-12.1 user B khong xoa duoc favorite cua A", async () => {
  const location = await m.SupportLocation.create({
    countryCode: "KR",
    type: "embassy",
    name: "Đại sứ quán",
    address: "Seoul",
    phone: "+82",
    verified: true,
    location: { type: "Point", coordinates: [SEOUL.lng, SEOUL.lat] },
  });
  const a = await registerAndLogin(app);
  const b = await registerAndLogin(app);
  await request(app)
    .post("/api/users/favorites")
    .set(as(a.accessToken))
    .send({ targetType: "location", targetId: String(location._id) });
  await request(app).delete(`/api/users/favorites/location/${location._id}`).set(as(b.accessToken));
  assert.equal(await m.Favorite.countDocuments({ userId: a.user.id }), 1);
  const listB = await request(app).get("/api/users/favorites").set(as(b.accessToken));
  assert.equal(listB.body.data.length, 0);
});

test("INV-12.1 user B khong dat duoc chuyen di cua A lam chuyen chinh", async () => {
  await m.Country.create({ code: "KR", name: "Hàn Quốc", status: "active" });
  const a = await registerAndLogin(app);
  const b = await registerAndLogin(app);
  const trip = await request(app).post("/api/users/trips").set(as(a.accessToken)).send({
    countryCode: "KR",
    destinationCity: "Seoul",
    startDate: "2026-10-01",
    endDate: "2026-10-05",
  });
  const res = await request(app)
    .put(`/api/users/trips/${trip.body.data._id}/current`)
    .set(as(b.accessToken));
  assert.equal(res.status, 404);
  assert.equal((await m.Trip.findById(trip.body.data._id)).isCurrent, false);
});

test("INV-12.3 bai luat trong favorites khong lo truong noi bo", async () => {
  const article = await m.LegalArticle.create({
    countryCode: "KR",
    topicSlug: "giao-thong",
    slug: "vuot-den-do",
    title: "Vượt đèn đỏ",
    status: "published",
    isCurrent: true,
    reviewNote: "Ghi chú nội bộ",
  });
  const { accessToken } = await registerAndLogin(app);
  await request(app)
    .post("/api/users/favorites")
    .set(as(accessToken))
    .send({ targetType: "article", targetId: String(article._id) });
  const res = await request(app).get("/api/users/favorites").set(as(accessToken));
  const payload = res.body.data[0].article;
  for (const key of ["reviewNote", "indexState", "titleNorm", "summaryNorm", "createdBy", "__v"]) {
    assert.equal(key in payload, false, key);
  }
});

test("INV-12.5 khong tao/sua chuyen di toi quoc gia chua mo hoac khong ton tai", async () => {
  await m.Country.create({ code: "KR", name: "Hàn Quốc", status: "active" });
  await m.Country.create({ code: "JP", name: "Nhật Bản", status: "coming_soon" });
  const { accessToken } = await registerAndLogin(app);
  const body = (countryCode) => ({
    countryCode,
    destinationCity: "Thành phố",
    startDate: "2026-10-01",
    endDate: "2026-10-05",
  });
  for (const code of ["JP", "XX"]) {
    const res = await request(app).post("/api/users/trips").set(as(accessToken)).send(body(code));
    assert.equal(res.status, 400, code);
  }
  const trip = await request(app).post("/api/users/trips").set(as(accessToken)).send(body("KR"));
  assert.equal(trip.status, 201);
  const moved = await request(app)
    .put(`/api/users/trips/${trip.body.data._id}`)
    .set(as(accessToken))
    .send(body("JP"));
  assert.equal(moved.status, 400);
});

test("INV-12.6 preferences khong nhan truong la (role, email)", async () => {
  const { accessToken, user } = await registerAndLogin(app);
  const res = await request(app)
    .put("/api/users/preferences")
    .set(as(accessToken))
    .send({ locationConsent: true, role: "admin", email: "evil@x.test" });
  assert.equal(res.status, 200);
  const stored = await m.User.findById(user.id).lean();
  assert.equal(stored.role, "user");
  assert.notEqual(stored.email, "evil@x.test");
  assert.equal(stored.preferences.locationConsent, true);
});
