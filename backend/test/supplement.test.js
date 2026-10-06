import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";
import { registerAndLogin } from "./helpers.js";
import { mentionsCountry } from "../src/utils/countryAliases.js";
let app, Article, Topic, Job, Incident, Progress;
before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
  Article = (await import("../src/models/LegalArticle.js")).default;
  Topic = (await import("../src/models/LegalTopic.js")).default;
  Job = (await import("../src/models/Job.js")).default;
  Incident = (await import("../src/models/IncidentType.js")).default;
  Progress = (await import("../src/models/UserIncidentProgress.js")).default;
});
after(stopTestDb);
beforeEach(clearTestDb);

test("bí danh nhận diện Nhật, Tokyo, Japan và tên bản địa; không khớp một phần từ", () => {
  for (const question of [
    "Ở Nhật vượt đèn đỏ?",
    "Đi Tokyo có cần visa?",
    "In Japan?",
    "日本の法律",
  ]) {
    assert.ok(mentionsCountry(question, { code: "JP", name: "Nhật Bản" }), question);
  }
  assert.equal(mentionsCountry("Trạng thái của đơn?", { code: "TH", name: "Thái Lan" }), false);
});

test("SOS list và nearby không lộ điểm chưa xác minh hoặc ID người biên tập", async () => {
  const Location = (await import("../src/models/SupportLocation.js")).default;
  await Location.init();
  await Location.create(
    [
      { verified: true, name: "Verified" },
      { verified: false, name: "Unverified" },
    ].map((item) => ({
      ...item,
      countryCode: "KR",
      type: "hospital",
      address: "Test fixture",
      phone: "000",
      location: { type: "Point", coordinates: [127, 37] },
    })),
  );
  for (const url of [
    "/api/support-locations?country=KR",
    "/api/support-locations/nearby?country=KR&lat=37&lng=127",
  ]) {
    const res = await request(app).get(url);
    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.data.map((item) => item.name),
      ["Verified"],
    );
    assert.equal("createdBy" in res.body.data[0], false);
  }
});

test("publish chặn nhảy bước và transaction rollback cả bài cũ khi queue lỗi", async () => {
  const { changeArticleStatus } = await import("../src/services/legalArticle.service.js");
  await Article.init();
  await Topic.create({ countryCode: "KR", slug: "test", label: "Test" });
  const data = {
    countryCode: "KR",
    slug: "test",
    topicSlug: "test",
    title: "Test",
    summaryVi: "Fixture",
    effectiveFrom: new Date(),
    sources: [
      {
        title: "Fixture",
        url: "https://example.org",
        authority: "Fixture",
        publishedAt: new Date(),
      },
    ],
  };
  const old = await Article.create({ ...data, version: 1, status: "published", isCurrent: true });
  const next = await Article.create({ ...data, version: 2, status: "draft", isCurrent: false });
  await assert.rejects(changeArticleStatus(next._id, { status: "published" }, null), {
    code: "CONFLICT",
  });
  await changeArticleStatus(next._id, { status: "pending_review" }, null);
  const original = Job.create;
  Job.create = async () => {
    throw new Error("queue-test-failure");
  };
  try {
    await assert.rejects(
      changeArticleStatus(next._id, { status: "published" }, null),
      /queue-test-failure/,
    );
  } finally {
    Job.create = original;
  }
  assert.equal((await Article.findById(old._id)).status, "published");
  assert.equal((await Article.findById(old._id)).isCurrent, true);
  assert.equal((await Article.findById(next._id)).status, "pending_review");
  assert.equal(await Job.countDocuments(), 0);
});

test("legacy workflow không có ID: ID ổn định qua lần đọc và tick cũ đúng sau reorder", async () => {
  const service = await import("../src/services/incident.service.js");
  const { user } = await registerAndLogin(app);
  const inserted = await Incident.collection.insertOne({
    slug: "legacy",
    title: "Legacy",
    status: "published",
    steps: [
      { order: 0, title: "First", body: [] },
      { order: 1, title: "Second", body: [] },
    ],
    updatedAt: new Date(),
    createdAt: new Date(),
  });
  const id = inserted.insertedId;
  const before = await service.getIncidentById(id);
  const secondRead = await service.getIncidentById(id);
  assert.equal(before.steps[0].stepId, secondRead.steps[0].stepId);
  await Progress.create({ userId: user.id, incidentId: id, completedSteps: [0] });
  const after = await service.updateIncident(
    id,
    { steps: [...before.steps].reverse(), updatedAt: before.updatedAt },
    user.id,
  );
  const ticked = await service.getProgress(user.id, id);
  assert.equal(after.steps.find((step) => ticked.includes(step.stepId)).title, "First");
  await service.updateIncident(
    id,
    { steps: [after.steps[0]], updatedAt: after.updatedAt },
    user.id,
  );
  assert.deepEqual(await service.getProgress(user.id, id), []);
});

test("pipeline chặn bí danh nước khác trước khi gọi LLM và đánh dấu từ chối", async () => {
  const Country = (await import("../src/models/Country.js")).default;
  const { createSession, sendMessage } = await import("../src/services/chat.service.js");
  const llm = await import("../src/rag/llm/index.js");
  const { createMockLlmProvider } = await import("../src/rag/llm/mock.llm.js");
  let calls = 0;
  llm.__setLlmProviderForTest({
    model: "spy",
    complete: async () => {
      calls += 1;
      throw new Error("must-not-call");
    },
  });
  try {
    await Country.create([
      { code: "KR", name: "Hàn Quốc", status: "active" },
      { code: "JP", name: "Nhật Bản", status: "coming_soon" },
    ]);
    const { user } = await registerAndLogin(app);
    const session = await createSession(user.id, "KR");
    for (const question of ["Ở Nhật thì sao?", "Đi Tokyo thì sao?", "Japan visa?"]) {
      const { message } = await sendMessage({ userId: user.id, sessionId: session._id, question });
      assert.match(message.text, /đổi quốc gia/);
      assert.equal(message.fallbackReason, "INSUFFICIENT_EVIDENCE");
      assert.equal(message.citations.length, 0);
    }
    assert.equal(calls, 0);
  } finally {
    llm.__setLlmProviderForTest(createMockLlmProvider());
  }
});
