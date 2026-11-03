import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import request from "supertest";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";
import { registerAndLogin } from "./helpers.js";

/*
 * Admin tro ly AI (contracts muc 27) qua HTTP that: RBAC, cong tac tat nhanh chan /api/assistant
 * ngay lap tuc, nhat ky hoi-dap da an thong tin ca nhan, hinh dang bieu do. Mo hinh thay bang
 * provider gia; cache cong tac dat dai de chung minh PATCH xoa cache chu khong doi het han.
 */
process.env.ASSISTANT_SETTINGS_CACHE_MS = "600000";
process.env.ASSISTANT_PRICE_INPUT_VND_PER_M = "1200";
process.env.ASSISTANT_PRICE_OUTPUT_VND_PER_M = "7200";

let app;
let m;
let providers;
let settingsService;

const auth = (token) => `Bearer ${token}`;
const readFixture = (name) =>
  JSON.parse(readFileSync(new URL(`../../contracts/fixtures/${name}`, import.meta.url), "utf8"));
const sortedKeys = (value) => Object.keys(value).sort();

const fakeTriage = {
  model: "fake-triage",
  async complete({ question }) {
    const intent = /phở/.test(question) ? "out_of_scope" : "answer";
    return JSON.stringify({ question, intent, reply: "Chỉ hỗ trợ chủ đề chuyến đi." });
  },
};

const fakeAnswer = {
  model: "fake-answer",
  async complete({ onUsage }) {
    onUsage?.({ inputTokens: 1000, outputTokens: 500 });
    return JSON.stringify({ answer: "Nên mang áo ấm.\n**Nên làm gì tiếp:** xem dự báo." });
  },
};

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
  m = {
    Country: (await import("../src/models/Country.js")).default,
    AiEvent: (await import("../src/models/AiEvent.js")).default,
    AuditLog: (await import("../src/models/AuditLog.js")).default,
  };
  providers = await import("../src/rag/assistant/providers.js");
  settingsService = await import("../src/services/assistantSettings.service.js");
});

after(async () => {
  providers.__setAssistantProvidersForTest(null);
  await stopTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  settingsService.invalidateAssistantSettingsCache();
  providers.__setAssistantProvidersForTest({ triage: fakeTriage, answer: fakeAnswer, web: null });
  await m.Country.create({
    code: "AU",
    name: "Úc",
    status: "active",
    emergencyNumbers: { police: "000" },
  });
});

const ask = (token, message) =>
  request(app)
    .post("/api/assistant/messages")
    .set("Authorization", auth(token))
    .send({ countryCode: "AU", message });

const adminGet = (token, path) =>
  request(app).get(`/api/admin/assistant/${path}`).set("Authorization", auth(token));

const setEnabled = (token, enabled) =>
  request(app)
    .patch("/api/admin/assistant/settings")
    .set("Authorization", auth(token))
    .send({ enabled });

test("RBAC: user thuong bi 403, chua dang nhap bi 401 tren moi endpoint admin tro ly", async () => {
  const { accessToken } = await registerAndLogin(app);

  for (const path of ["settings", "messages", "metrics"]) {
    assert.equal((await adminGet(accessToken, path)).status, 403, path);
    assert.equal((await request(app).get(`/api/admin/assistant/${path}`)).status, 401, path);
  }
  const patch = await setEnabled(accessToken, false);
  assert.equal(patch.status, 403);
  assert.equal(patch.body.error.code, "FORBIDDEN");
});

test("cong tac tat chan /api/assistant ngay lap tuc, bat lai thi hoat dong; co ghi nhat ky", async () => {
  const admin = await registerAndLogin(app, { role: "admin" });
  const user = await registerAndLogin(app);

  const initial = await adminGet(admin.accessToken, "settings");
  assert.deepEqual(initial.body.data, {
    enabled: true,
    envEnabled: true,
    active: true,
    updatedAt: null,
  });
  // Nap co vao cache (TTL 10 phut trong file nay) truoc khi tat.
  assert.equal((await ask(user.accessToken, "Tháng 7 thời tiết thế nào?")).status, 200);

  const off = await setEnabled(admin.accessToken, false);
  assert.equal(off.status, 200);
  assert.deepEqual(
    sortedKeys(off.body.data),
    sortedKeys(readFixture("admin.assistantSettings.json").data),
  );
  assert.equal(off.body.data.active, false);

  const blocked = await ask(user.accessToken, "Tháng 7 thời tiết thế nào?");
  assert.equal(blocked.status, 502);
  assert.equal(blocked.body.error.code, "UPSTREAM_ERROR");

  assert.equal((await setEnabled(admin.accessToken, true)).body.data.active, true);
  assert.equal((await ask(user.accessToken, "Tháng 12 thì sao?")).status, 200);

  const audits = await m.AuditLog.find({ entityType: "AssistantSettings" }).lean();
  assert.equal(audits.length, 2);
  assert.equal(audits[0].diff.after.enabled, false);
  assert.equal(audits[0].diff.before.enabled, true);

  const invalid = await setEnabled(admin.accessToken, "off");
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, "VALIDATION_ERROR");
});

test("nhat ky hoi-dap: ghep cau hoi, an PII, khong lo nguoi hoi, loc va phan trang", async () => {
  const admin = await registerAndLogin(app, { role: "admin" });
  const user = await registerAndLogin(app);
  await ask(user.accessToken, "Mất hộ chiếu C1234567, gọi tôi 0901234567 hoặc a.b@mail.com");
  await ask(user.accessToken, "Cho tôi công thức nấu phở");

  const res = await adminGet(admin.accessToken, "messages?limit=1");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.meta, { page: 1, limit: 1, total: 2 });
  const [latest] = res.body.data;
  assert.equal(latest.kind, "refuse_scope");
  assert.equal(latest.question, "Cho tôi công thức nấu phở");

  const answers = await adminGet(admin.accessToken, "messages?kind=answer&sourceTier=general");
  assert.equal(answers.body.meta.total, 1);
  const [item] = answers.body.data;
  const fixtureItem = readFixture("admin.assistantMessages.json").data[0];
  assert.deepEqual(sortedKeys(item), sortedKeys(fixtureItem));
  assert.deepEqual(sortedKeys(item.telemetry), sortedKeys(fixtureItem.telemetry));
  assert.ok(!/C1234567|0901234567|a\.b@mail\.com/.test(item.question), item.question);
  assert.ok(item.question.startsWith("Mất hộ chiếu"));
  assert.equal(item.countryCode, "AU");
  // 1000 token vao x 1200 + 500 token ra x 7200, tren 1 trieu token.
  assert.equal(item.telemetry.costEstimateVnd, 4.8);

  const serialized = JSON.stringify(res.body) + JSON.stringify(answers.body);
  assert.ok(!serialized.includes(String(user.user.id ?? user.user._id)));
  assert.ok(!serialized.includes(user.user.email));
  assert.ok(!/userId|conversationId|fullName|email"/.test(serialized));

  const badFilter = await adminGet(admin.accessToken, "messages?sourceTier=secret");
  assert.equal(badFilter.status, 400);
});

test("bieu do: du so ngay, tong luot, chi phi, phan vi do tre va ty le tu choi", async () => {
  const admin = await registerAndLogin(app, { role: "admin" });
  const user = await registerAndLogin(app);
  await ask(user.accessToken, "Tháng 7 thời tiết thế nào?");
  await ask(user.accessToken, "Cho tôi công thức nấu phở");

  const res = await adminGet(admin.accessToken, "metrics?days=7");
  assert.equal(res.status, 200);
  const fixture = readFixture("admin.assistantMetrics.json").data;
  const metrics = res.body.data;
  assert.deepEqual(sortedKeys(metrics), sortedKeys(fixture));
  assert.deepEqual(sortedKeys(metrics.totals), sortedKeys(fixture.totals));
  assert.deepEqual(sortedKeys(metrics.daily[0]), sortedKeys(fixture.daily[0]));

  assert.equal(metrics.days, 7);
  assert.equal(metrics.daily.length, 7);
  assert.equal(metrics.to, new Date().toISOString().slice(0, 10));
  assert.equal(metrics.totals.questions, 2);
  assert.equal(metrics.totals.refusals, 1);
  assert.equal(metrics.totals.refusalRate, 0.5);
  assert.equal(metrics.totals.costEstimateVnd, 4.8);
  assert.equal(metrics.daily.at(-1).questions, 2);
  assert.equal(metrics.daily[0].questions, 0);

  assert.equal((await adminGet(admin.accessToken, "metrics")).body.data.daily.length, 30);
  assert.equal((await adminGet(admin.accessToken, "metrics?days=365")).status, 400);
});
