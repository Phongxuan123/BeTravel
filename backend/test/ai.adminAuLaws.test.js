import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";
import { registerAndLogin } from "./helpers.js";

/*
 * Admin: danh sách / index / xoá luật liên bang Úc trong RAG và thống kê theo luồng.
 * RBAC kiểm ở backend; không gọi mạng (tra tên luật thất bại thì name = null).
 */

let app;
let Job;
let LegalChunk;
let AiEvent;
let adminToken;
let userToken;
let ragAdmin;
let jobIndex;
let analytics;
let indexService;
let embeddingIndex;
let mockEmbedding;
let memoryDriver;

const TITLE_ID = "C1946A00045"; // Immigration (Guardianship of Children) Act 1946
const auth = (token) => `Bearer ${token}`;

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
  Job = (await import("../src/models/Job.js")).default;
  LegalChunk = (await import("../src/models/LegalChunk.js")).default;
  AiEvent = (await import("../src/models/AiEvent.js")).default;
  ragAdmin = await import("../src/services/ragAdmin.service.js");
  jobIndex = await import("../src/rag/jobs/index.js");
  analytics = await import("../src/services/analytics.service.js");
  indexService = await import("../src/services/auLawIndex.service.js");
  embeddingIndex = await import("../src/rag/embedding/index.js");
  mockEmbedding = await import("../src/rag/embedding/mock.embedding.js");
  memoryDriver = await import("../src/rag/search/memory.driver.js");
});

after(stopTestDb);

beforeEach(async () => {
  await clearTestDb();
  embeddingIndex.__setEmbeddingProviderForTest(
    mockEmbedding.createMockEmbeddingProvider({ dims: 768 }),
  );
  memoryDriver.invalidateMemorySearchCache();
  adminToken = (await registerAndLogin(app, { role: "admin" })).accessToken;
  userToken = (await registerAndLogin(app, { role: "user" })).accessToken;
});

const seedIndexedLaw = () =>
  indexService.indexAuLaw(TITLE_ID, {
    loadBlocks: async () => ({
      rawVersion: { registerId: "REG-1", start: "2024-01-01" },
      allBlocks: [
        { className: "ActHead5", kind: "heading", text: "6 Guardianship" },
        {
          className: "paragraph",
          kind: "text",
          text: "The Minister is the guardian of every non-citizen child who arrives in Australia.",
        },
        { className: "ActHead5", kind: "heading", text: "7 Delegation" },
        {
          className: "paragraph",
          kind: "text",
          text: "The Minister may delegate any of the Minister's powers under this Act in writing.",
        },
        { className: "ActHead5", kind: "heading", text: "8 Regulations" },
        {
          className: "paragraph",
          kind: "text",
          text: "The Governor-General may make regulations prescribing matters under this Act.",
        },
      ],
    }),
    getName: async () => "Immigration (Guardianship of Children) Act 1946",
  });

test("RBAC: người dùng thường không gọi được API luật Úc của RAG", async () => {
  for (const [method, path] of [
    ["get", "/api/admin/rag/au-laws"],
    ["post", "/api/admin/rag/au-laws/index"],
    ["delete", `/api/admin/rag/au-laws/${TITLE_ID}`],
  ]) {
    const res = await request(app)[method](path).set("Authorization", auth(userToken)).send({});
    assert.equal(res.status, 403, `${method} ${path}`);
  }
  const noToken = await request(app).get("/api/admin/rag/au-laws");
  assert.equal(noToken.status, 401);
});

test("GET au-laws: liệt kê 31 luật tuyển chọn, luật đã index kèm số chunk và job gần nhất", async () => {
  await seedIndexedLaw();
  await Job.create({ name: "index_au_law", payload: { titleId: TITLE_ID }, status: "done" });

  const res = await request(app)
    .get("/api/admin/rag/au-laws")
    .set("Authorization", auth(adminToken));
  assert.equal(res.status, 200);
  const rows = res.body.data;
  assert.equal(rows.length, 31);
  const indexed = rows.find((row) => row.titleId === TITLE_ID);
  assert.deepEqual(indexed.index, {
    chunks: 3,
    registerId: "REG-1",
    embeddingModel: indexed.index.embeddingModel,
  });
  assert.equal(indexed.job.status, "done");
  assert.ok(indexed.topics.includes("cu-tru"));
  const notIndexed = rows.find((row) => row.titleId !== TITLE_ID);
  assert.equal(notIndexed.index, null);
});

test("POST au-laws/index: xếp job, bỏ qua luật đang có job, từ chối mã ngoài danh sách tuyển chọn", async () => {
  const first = await request(app)
    .post("/api/admin/rag/au-laws/index")
    .set("Authorization", auth(adminToken))
    .send({ titleIds: [TITLE_ID, "C2004A01918"] });
  assert.equal(first.status, 200);
  assert.deepEqual(first.body.data.queued.sort(), ["C1946A00045", "C2004A01918"]);
  assert.equal(await Job.countDocuments({ name: "index_au_law" }), 2);

  const again = await request(app)
    .post("/api/admin/rag/au-laws/index")
    .set("Authorization", auth(adminToken))
    .send({ titleIds: [TITLE_ID] });
  assert.deepEqual(again.body.data.queued, []);
  assert.deepEqual(again.body.data.skipped, [TITLE_ID]);
  assert.equal(await Job.countDocuments({ name: "index_au_law" }), 2);

  const notCurated = await request(app)
    .post("/api/admin/rag/au-laws/index")
    .set("Authorization", auth(adminToken))
    .send({ titleIds: ["C0000A00000"] });
  assert.equal(notCurated.status, 400);
  assert.equal(notCurated.body.error.code, "VALIDATION_ERROR");

  const malformed = await request(app)
    .post("/api/admin/rag/au-laws/index")
    .set("Authorization", auth(adminToken))
    .send({ titleIds: ["abc"] });
  assert.equal(malformed.status, 400);
});

test("job index_au_law có handler đã đăng ký để worker chạy được", () => {
  assert.equal(typeof jobIndex.registerRagJobHandlers, "function");
  assert.doesNotThrow(() => jobIndex.registerRagJobHandlers());
});

test("DELETE au-laws/:titleId: xoá chunk của đúng luật đó", async () => {
  await seedIndexedLaw();
  assert.equal(await LegalChunk.countDocuments({ titleId: TITLE_ID }), 3);

  const res = await request(app)
    .delete(`/api/admin/rag/au-laws/${TITLE_ID}`)
    .set("Authorization", auth(adminToken));
  assert.equal(res.status, 200);
  assert.equal(res.body.data.deleted, 3);
  assert.equal(await LegalChunk.countDocuments({ titleId: TITLE_ID }), 0);

  const notCurated = await request(app)
    .delete("/api/admin/rag/au-laws/C0000A00000")
    .set("Authorization", auth(adminToken));
  assert.equal(notCurated.status, 400);
});

test("ragAdmin.enqueueAuLawIndex: luật có job đã xong thì được xếp job mới", async () => {
  await Job.create({ name: "index_au_law", payload: { titleId: TITLE_ID }, status: "done" });
  const result = await ragAdmin.enqueueAuLawIndex([TITLE_ID]);
  assert.deepEqual(result.queued, [TITLE_ID]);
});

test("analytics: câu ngoài phạm vi không tính vào tỉ lệ fallback, có đếm theo luồng", async () => {
  const userId = new mongoose.Types.ObjectId();
  const event = (extra) => ({
    userId,
    countryCode: "KR",
    questionHash: "h",
    question: "q",
    ...extra,
  });
  await AiEvent.create([
    event({ route: "legal", fallbackReason: null }),
    event({ route: "legal", fallbackReason: "INSUFFICIENT_EVIDENCE", question: "thieu nguon" }),
    event({ route: "out_of_scope", fallbackReason: "OUT_OF_SCOPE", question: "thoi tiet" }),
    event({ route: "out_of_scope", fallbackReason: "OUT_OF_SCOPE", question: "thoi tiet" }),
    event({ route: "emergency", fallbackReason: null }),
  ]);
  // ai_event cũ (trước khi có phân luồng) không có field route: ghi thẳng, bỏ qua default của Mongoose.
  await AiEvent.collection.insertOne({ ...event({ fallbackReason: null }), createdAt: new Date() });

  const overview = await analytics.getAnalyticsOverview({ days: 7 });
  assert.equal(overview.totalChats, 6);
  assert.equal(overview.fallbackCount, 1);
  assert.deepEqual(
    overview.topFallbackQuestions.map((row) => row.question),
    ["thieu nguon"],
  );
  assert.equal(overview.routeCounts.out_of_scope, 2);
  assert.equal(overview.routeCounts.emergency, 1);
  assert.equal(overview.routeCounts.legal, 3);
});
