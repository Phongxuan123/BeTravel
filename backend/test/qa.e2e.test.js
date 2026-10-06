import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";
import { registerAndLogin } from "./helpers.js";

/*
 * Pha 3 dot QA (docs/07_QA_BugHunt.md). PHAN 6 (E2E-01..20) cua dac ta bi thieu
 * noi dung --> day la kich ban TU DE XUAT, di xuyen tang qua HTTP that + job
 * worker that (reindex/purge) + pipeline RAG that voi provider mock.
 */

let app;
let m;
let runNextJob;
let embeddingIndex;
let llmIndex;
let memoryDriver;
let env;

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
  m = {
    LegalArticle: (await import("../src/models/LegalArticle.js")).default,
    LegalChunk: (await import("../src/models/LegalChunk.js")).default,
    Job: (await import("../src/models/Job.js")).default,
    User: (await import("../src/models/User.js")).default,
  };
  ({ runNextJob } = await import("../src/services/job.service.js"));
  const { registerRagJobHandlers } = await import("../src/rag/jobs/index.js");
  registerRagJobHandlers();
  embeddingIndex = await import("../src/rag/embedding/index.js");
  llmIndex = await import("../src/rag/llm/index.js");
  memoryDriver = await import("../src/rag/search/memory.driver.js");
  ({ env } = await import("../src/core/env.js"));
});

after(stopTestDb);

beforeEach(async () => {
  await clearTestDb();
  const { createMockEmbeddingProvider } = await import("../src/rag/embedding/mock.embedding.js");
  const { createMockLlmProvider } = await import("../src/rag/llm/mock.llm.js");
  embeddingIndex.__setEmbeddingProviderForTest(createMockEmbeddingProvider({ dims: 768 }));
  llmIndex.__setLlmProviderForTest(createMockLlmProvider());
  memoryDriver.invalidateMemorySearchCache();
});

const as = (token) => ({ Authorization: `Bearer ${token}` });

async function drainJobs() {
  // Chay het hang doi nhu worker that (khong setInterval de test tat dinh).
  while (await runNextJob());
  memoryDriver.invalidateMemorySearchCache();
}

async function setupCountry(adminToken) {
  await request(app)
    .post("/api/admin/countries")
    .set(as(adminToken))
    .send({ code: "KR", name: "Hàn Quốc", status: "active" });
  await request(app)
    .post("/api/admin/topics")
    .set(as(adminToken))
    .send({ countryCode: "KR", slug: "giao-thong", label: "Giao thông" });
}

const ARTICLE = {
  countryCode: "KR",
  topicSlug: "giao-thong",
  slug: "vuot-den-do",
  title: "Vượt đèn đỏ",
  summaryVi: "Mức phạt khi vượt đèn đỏ tại Hàn Quốc.",
  bodyMd:
    "## Quy định\nNgười lái xe vượt đèn đỏ bị xử phạt hành chính theo luật giao thông đường bộ " +
    "Hàn Quốc. Người điều khiển xe phải dừng trước vạch khi đèn đỏ bật sáng.",
  penalties: [{ behavior: "Vượt đèn đỏ", amountText: "70.000 won" }],
  effectiveFrom: "2024-01-01",
  sources: [
    {
      title: "Luật GTĐB",
      url: "https://example.go.kr/law",
      authority: "Bộ GTVT",
      publishedAt: "2024-01-01",
    },
  ],
};

async function publish(adminToken, id) {
  await request(app)
    .post(`/api/admin/legal/articles/${id}/status`)
    .set(as(adminToken))
    .send({ status: "pending_review" });
  const res = await request(app)
    .post(`/api/admin/legal/articles/${id}/status`)
    .set(as(adminToken))
    .send({ status: "published" });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  await drainJobs();
}

async function ask(userToken, question) {
  const session = await request(app)
    .post("/api/chat/sessions")
    .set(as(userToken))
    .send({ countryCode: "KR" });
  const res = await request(app)
    .post(`/api/chat/sessions/${session.body.data._id}/messages`)
    .set(as(userToken))
    .send({ question });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data.message;
}

test("E2E-Q1 vong doi bai luat: nhap --> publish --> index --> cong khai + AI trich dan --> phien ban moi thay the", async () => {
  const admin = await registerAndLogin(app, { role: "admin" });
  const user = await registerAndLogin(app);
  await setupCountry(admin.accessToken);

  const draft = await request(app)
    .post("/api/admin/legal/articles")
    .set(as(admin.accessToken))
    .send(ARTICLE);
  // Nhap: chua cong khai, AI chua biet.
  assert.equal((await request(app).get("/api/legal/articles/KR/vuot-den-do")).status, 404);
  assert.equal(
    (await ask(user.accessToken, "Vượt đèn đỏ bị phạt bao nhiêu?")).fallbackReason,
    "INSUFFICIENT_EVIDENCE",
  );

  await publish(admin.accessToken, draft.body.data._id);
  assert.ok((await m.LegalChunk.countDocuments({ articleId: draft.body.data._id })) > 0);
  assert.equal((await request(app).get("/api/legal/articles/KR/vuot-den-do")).status, 200);
  const answered = await ask(user.accessToken, "Vượt đèn đỏ bị phạt bao nhiêu?");
  assert.equal(answered.fallbackReason, null);
  assert.ok(answered.citations.every((c) => c.articleSlug === "vuot-den-do"));

  // Nguoi dung luu bai v1.
  await request(app)
    .post("/api/users/favorites")
    .set(as(user.accessToken))
    .send({ targetType: "article", targetId: draft.body.data._id });

  // Phien ban 2 thay the.
  const v2 = await request(app)
    .post(`/api/admin/legal/articles/${draft.body.data._id}/new-version`)
    .set(as(admin.accessToken));
  await request(app)
    .patch(`/api/admin/legal/articles/${v2.body.data._id}`)
    .set(as(admin.accessToken))
    .send({ summaryVi: "Bản cập nhật 2026.", updatedAt: v2.body.data.updatedAt });
  await publish(admin.accessToken, v2.body.data._id);

  const detail = await request(app).get("/api/legal/articles/KR/vuot-den-do");
  assert.equal(detail.body.data.version, 2);
  // Chunk v1 da bi purge, AI chi trich tu v2.
  assert.equal(await m.LegalChunk.countDocuments({ articleId: draft.body.data._id }), 0);
  const favorites = await request(app).get("/api/users/favorites").set(as(user.accessToken));
  assert.equal(favorites.body.data[0].isOutdated, true);
  assert.equal(favorites.body.data[0].currentArticleId, v2.body.data._id);
  assert.equal(
    favorites.body.data[0].article.summaryVi,
    undefined,
    "bookmark cu khong lo noi dung cu",
  );
});

test("E2E-Q2 luu tru bai: purge chunk, cong khai 404, AI tu choi", async () => {
  const admin = await registerAndLogin(app, { role: "admin" });
  const user = await registerAndLogin(app);
  await setupCountry(admin.accessToken);
  const draft = await request(app)
    .post("/api/admin/legal/articles")
    .set(as(admin.accessToken))
    .send(ARTICLE);
  await publish(admin.accessToken, draft.body.data._id);

  await request(app)
    .post(`/api/admin/legal/articles/${draft.body.data._id}/status`)
    .set(as(admin.accessToken))
    .send({ status: "archived" });
  await drainJobs();

  assert.equal(await m.LegalChunk.countDocuments({}), 0);
  assert.equal((await request(app).get("/api/legal/articles/KR/vuot-den-do")).status, 404);
  const search = await request(app).get("/api/legal/search").query({ q: "den do", country: "KR" });
  assert.equal(search.body.data.length, 0);
  assert.equal(
    (await ask(user.accessToken, "Vượt đèn đỏ bị phạt bao nhiêu?")).fallbackReason,
    "INSUFFICIENT_EVIDENCE",
  );
});

test("E2E-Q3 diem SOS: chua xac minh khong luu duoc --> admin xac minh --> luu duoc, hien o nearby", async () => {
  const admin = await registerAndLogin(app, { role: "admin" });
  const user = await registerAndLogin(app);
  const created = await request(app)
    .post("/api/admin/locations")
    .set(as(admin.accessToken))
    .send({
      countryCode: "KR",
      type: "embassy",
      name: "Đại sứ quán Việt Nam",
      address: "Seoul",
      phone: "+82 2 000 0000",
      location: { type: "Point", coordinates: [127.0016, 37.5407] },
    });
  const id = created.body.data._id;
  const save = () =>
    request(app)
      .post("/api/users/favorites")
      .set(as(user.accessToken))
      .send({ targetType: "location", targetId: id });

  assert.equal((await save()).status, 404);
  await request(app)
    .post("/api/admin/locations/bulk-verify")
    .set(as(admin.accessToken))
    .send({ ids: [id] });
  assert.equal((await save()).status, 201);
  const nearby = await request(app)
    .get("/api/support-locations/nearby")
    .query({ lat: 37.5407, lng: 127.0016, country: "KR" });
  assert.equal(nearby.body.data[0]._id, id);
  assert.equal(nearby.body.data[0].verified, true);
});

test("E2E-Q4 workflow su co: nhap an --> publish --> nguoi dung ghi tien do --> go ve nhap thi tien do bi chan", async () => {
  const admin = await registerAndLogin(app, { role: "admin" });
  const user = await registerAndLogin(app);
  const created = await request(app)
    .post("/api/admin/incidents")
    .set(as(admin.accessToken))
    .send({
      slug: "mat-ho-chieu",
      countryCode: null,
      title: "Mất hộ chiếu",
      status: "draft",
      steps: [
        { title: "Trình báo công an", body: [] },
        { title: "Liên hệ Đại sứ quán", body: [] },
      ],
    });
  const id = created.body.data._id;
  const progress = (steps) =>
    request(app)
      .put(`/api/users/incident-progress/${id}`)
      .set(as(user.accessToken))
      .send({ completedSteps: steps.map((order) => created.body.data.steps[order].stepId) });

  assert.equal((await request(app).get("/api/incidents/mat-ho-chieu")).status, 404);
  assert.equal((await progress([0])).status, 404);

  const published = await request(app)
    .patch(`/api/admin/incidents/${id}`)
    .set(as(admin.accessToken))
    .send({ status: "published", updatedAt: created.body.data.updatedAt });
  assert.equal((await progress([0, 1])).body.data.completedSteps.length, 2);

  await request(app)
    .patch(`/api/admin/incidents/${id}`)
    .set(as(admin.accessToken))
    .send({ status: "draft", updatedAt: published.body.data.updatedAt });
  assert.equal((await progress([0])).status, 404);
  assert.equal(
    (await request(app).get(`/api/users/incident-progress/${id}`).set(as(user.accessToken))).status,
    404,
  );
});

test("E2E-Q5 het quota ngay: 429 QUOTA_EXCEEDED, khong tao tin nhan tra loi", async () => {
  const admin = await registerAndLogin(app, { role: "admin" });
  const user = await registerAndLogin(app);
  await setupCountry(admin.accessToken);
  const today = new Date().toISOString().slice(0, 10);
  await m.User.updateOne(
    { _id: user.user.id },
    { $set: { aiUsage: { date: today, count: env.AI_DAILY_QUOTA_USER } } },
  );
  const session = await request(app)
    .post("/api/chat/sessions")
    .set(as(user.accessToken))
    .send({ countryCode: "KR" });
  const res = await request(app)
    .post(`/api/chat/sessions/${session.body.data._id}/messages`)
    .set(as(user.accessToken))
    .send({ question: "Vượt đèn đỏ bị phạt bao nhiêu?" });
  assert.equal(res.status, 429);
  assert.equal(res.body.error.code, "QUOTA_EXCEEDED");
  const messages = await request(app)
    .get(`/api/chat/sessions/${session.body.data._id}/messages`)
    .set(as(user.accessToken));
  assert.equal(messages.body.data.length, 0);
});
