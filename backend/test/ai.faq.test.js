import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";
import { registerAndLogin } from "./helpers.js";

/*
 * G6: câu hỏi lặp lại --> admin duyệt nguyên văn câu trả lời AI --> lần sau trả FAQ không gọi LLM.
 * Kiểm phần nghiệp vụ lõi: chỉ phát khi khớp và nguồn còn hiệu lực, "Tạo lại" luôn chạy AI,
 * không lộ sang quốc gia khác, RBAC ở backend. Không gọi mạng: luật Úc và registerId đều giả.
 */

const TITLE_ID = "C1958A00062"; // Migration Act 1958 (nằm trong danh sách tuyển chọn)
const LAW_NAME = "Migration Act 1958";
const QUESTION = "The Minister may cancel a visa if the holder has breached a condition?";

const block = (className, text, kind = className.startsWith("ActHead") ? "heading" : "text") => ({
  className,
  kind,
  text,
});
const BLOCKS = [
  block("ActHead2", "Part 2 - Arrival, presence and departure of non-citizens"),
  block("ActHead5", "116 Cancellation of visas"),
  block("paragraph", "The Minister may cancel a visa if the holder has breached a condition of the visa."),
  block("ActHead5", "118 Notice of cancellation"),
  block("paragraph", "The Minister must give the holder notice of the decision to cancel."),
];

let app;
let chat;
let faqService;
let ApprovedFaq;
let Country;
let User;
let indexService;
let retrieval;
let llmIndex;
let embeddingIndex;
let memoryDriver;
let mockEmbedding;
let mockLlm;
let llmCalls;
let similarity;

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
  chat = await import("../src/services/chat.service.js");
  faqService = await import("../src/services/faq.service.js");
  ApprovedFaq = (await import("../src/models/ApprovedFaq.js")).default;
  Country = (await import("../src/models/Country.js")).default;
  User = (await import("../src/models/User.js")).default;
  indexService = await import("../src/services/auLawIndex.service.js");
  retrieval = await import("../src/rag/retrieval.js");
  llmIndex = await import("../src/rag/llm/index.js");
  embeddingIndex = await import("../src/rag/embedding/index.js");
  memoryDriver = await import("../src/rag/search/memory.driver.js");
  mockEmbedding = await import("../src/rag/embedding/mock.embedding.js");
  mockLlm = await import("../src/rag/llm/mock.llm.js");
  similarity = await import("../src/rag/questionSimilarity.js");
});

// AI chấm trùng lặp giả, đối xứng: câu giống hệt (sau chuẩn hoá) = 1; cặp (QUESTION, câu X) lấy điểm
// của X trong bảng; mọi cặp khác = 0.
let similarityTable = new Map();
const pairScore = (left, right) => {
  if (similarity.normalizeQuestion(left) === similarity.normalizeQuestion(right)) return 1;
  if (left === QUESTION) return similarityTable.get(right) ?? 0;
  if (right === QUESTION) return similarityTable.get(left) ?? 0;
  return 0;
};
const fakeScorer = async (base, questions) =>
  new Map(questions.map((question) => [question, pairScore(base, question)]));

after(stopTestDb);

beforeEach(async () => {
  await clearTestDb();
  embeddingIndex.__setEmbeddingProviderForTest(
    mockEmbedding.createMockEmbeddingProvider({ dims: 768 }),
  );
  // Đếm số lần gọi LLM để chứng minh FAQ trả lời mà không gọi model.
  llmCalls = 0;
  const inner = mockLlm.createMockLlmProvider();
  llmIndex.__setLlmProviderForTest({
    ...inner,
    complete: async (request) => {
      llmCalls += 1;
      return inner.complete(request);
    },
  });
  retrieval.__setAuRegisterLookupForTest(async () => "REGISTER-1");
  memoryDriver.invalidateMemorySearchCache();
  similarityTable = new Map();
  faqService.__setSimilarityScorerForTest(fakeScorer);

  await Country.create({ code: "AU", name: "Úc", status: "active", emergencyNumbers: { police: "000" } });
  await indexService.indexAuLaw(TITLE_ID, {
    loadBlocks: async () => ({
      rawVersion: { registerId: "REGISTER-1", start: "2025-07-01" },
      allBlocks: BLOCKS,
    }),
    getName: async () => LAW_NAME,
  });
  memoryDriver.invalidateMemorySearchCache();
});

let userSeq = 0;
const createUser = () => {
  userSeq += 1;
  return User.create({
    username: `faq_user_${userSeq}`,
    fullName: "FAQ",
    email: `faq_user_${userSeq}@example.test`,
    password: "khong-dung-toi",
    role: "user",
  });
};

const ask = async (user, question = QUESTION, extra = {}, countryCode = "AU") => {
  const session = await chat.createSession(user._id, countryCode);
  const { message } = await chat.sendMessage({
    userId: user._id,
    sessionId: session._id,
    question,
    ...extra,
  });
  return message;
};

// Ba người hỏi cùng một câu --> đủ điều kiện đề xuất; admin duyệt câu trả lời gần nhất.
const askThreeTimesAndApprove = async () => {
  const askers = [await createUser(), await createUser(), await createUser()];
  for (const user of askers) await ask(user);
  const [candidate] = await faqService.listFaqCandidates({ countryCode: "AU" });
  const admin = await createUser();
  const faq = await faqService.decideFaq({
    sourceMessageId: candidate.answers[0].messageId,
    decision: "approve",
    adminId: admin._id,
  });
  return { candidate, faq };
};

test("đề xuất: câu hỏi lặp đủ số lần thì thành một nhóm kèm câu trả lời", async () => {
  const user = await createUser();
  await ask(user);
  await ask(user);
  assert.equal((await faqService.listFaqCandidates({ countryCode: "AU" })).length, 0);

  await ask(user);
  const [candidate] = await faqService.listFaqCandidates({ countryCode: "AU" });
  assert.equal(candidate.count, 3);
  assert.equal(candidate.countryCode, "AU");
  assert.ok(candidate.answers.length >= 1);
  assert.ok(candidate.answers[0].citations.length >= 1);
});

test("FAQ đã duyệt: trả nguyên văn, không gọi LLM, gắn answerSource; nhóm không còn là đề xuất", async () => {
  const { faq } = await askThreeTimesAndApprove();
  assert.equal(faq.status, "active");
  assert.equal(faq.sources[0].registerId, "REGISTER-1");

  const callsBefore = llmCalls;
  const message = await ask(await createUser());
  assert.equal(llmCalls, callsBefore);
  assert.equal(message.answerSource, "approved_faq");
  assert.equal(String(message.faqId), String(faq._id));
  assert.equal(message.text, faq.answer);
  assert.equal((await faqService.listFaqCandidates({ countryCode: "AU" })).length, 0);

  const [listed] = await faqService.listFaqs({ status: "active" });
  assert.equal(listed.servedCount, 1);
});

test("nút Tạo lại (regenerate) luôn chạy AI, không dùng FAQ", async () => {
  await askThreeTimesAndApprove();
  const callsBefore = llmCalls;
  const message = await ask(await createUser(), QUESTION, { regenerate: true });
  assert.ok(llmCalls > callsBefore);
  assert.equal(message.answerSource, "ai");
});

test("nguồn đổi phiên bản: không phát FAQ, tự chuyển needs_review, không kích hoạt lại được", async () => {
  const { faq } = await askThreeTimesAndApprove();
  retrieval.__setAuRegisterLookupForTest(async () => "REGISTER-2");

  const message = await ask(await createUser());
  assert.notEqual(message.answerSource, "approved_faq");
  const stored = await ApprovedFaq.findById(faq._id).lean();
  assert.equal(stored.status, "needs_review");

  const admin = await createUser();
  await assert.rejects(
    faqService.setFaqStatus({ faqId: faq._id, status: "active", adminId: admin._id }),
    /FAQ_SOURCES_CHANGED/,
  );
});

test("FAQ không lộ sang phiên của quốc gia khác", async () => {
  await askThreeTimesAndApprove();
  await Country.create({ code: "KR", name: "Hàn Quốc", status: "active" });
  const message = await ask(await createUser(), QUESTION, {}, "KR");
  assert.notEqual(message.answerSource, "approved_faq");
});

test("duyệt: từ chối câu trả lời fallback và FAQ trùng nhóm", async () => {
  const { candidate } = await askThreeTimesAndApprove();
  const admin = await createUser();
  await assert.rejects(
    faqService.decideFaq({
      sourceMessageId: candidate.answers[0].messageId,
      decision: "approve",
      adminId: admin._id,
    }),
    /FAQ_DUPLICATE/,
  );

  const fallback = await ask(await createUser(), "Phạt tốc độ ở Sydney bao nhiêu tiền?");
  assert.ok(fallback.fallbackReason);
  await assert.rejects(
    faqService.decideFaq({ sourceMessageId: fallback._id, decision: "approve", adminId: admin._id }),
    /FAQ_MESSAGE_NOT_ELIGIBLE/,
  );
});

test("RBAC: user thường bị chặn 403 ở mọi route /api/admin/faq", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "user" });
  const auth = `Bearer ${accessToken}`;
  const responses = await Promise.all([
    request(app).get("/api/admin/faq/candidates").set("Authorization", auth),
    request(app).get("/api/admin/faq").set("Authorization", auth),
    request(app)
      .post("/api/admin/faq")
      .set("Authorization", auth)
      .send({ sourceMessageId: "a".repeat(24), decision: "approve" }),
    request(app)
      .patch(`/api/admin/faq/${"a".repeat(24)}`)
      .set("Authorization", auth)
      .send({ status: "retired" }),
  ]);
  for (const response of responses) assert.equal(response.status, 403);
});

test("admin API: đề xuất, duyệt, gỡ qua HTTP với envelope chuẩn", async () => {
  const askers = [await createUser(), await createUser(), await createUser()];
  for (const user of askers) await ask(user);
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  const auth = `Bearer ${accessToken}`;

  const candidates = await request(app)
    .get("/api/admin/faq/candidates?countryCode=AU")
    .set("Authorization", auth);
  assert.equal(candidates.status, 200);
  assert.equal(candidates.body.ok, true);
  const messageId = candidates.body.data[0].answers[0].messageId;

  const approved = await request(app)
    .post("/api/admin/faq")
    .set("Authorization", auth)
    .send({ sourceMessageId: messageId, decision: "approve" });
  assert.equal(approved.status, 201);
  assert.equal(approved.body.data.status, "active");

  const retired = await request(app)
    .patch(`/api/admin/faq/${approved.body.data._id}`)
    .set("Authorization", auth)
    .send({ status: "retired" });
  assert.equal(retired.status, 200);
  assert.equal(retired.body.data.status, "retired");

  const invalid = await request(app)
    .post("/api/admin/faq")
    .set("Authorization", auth)
    .send({ sourceMessageId: "not-an-id", decision: "approve" });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.error.code, "VALIDATION_ERROR");
});

const PARAPHRASE = "Can the Minister cancel a visa when the holder breached a visa condition?";
const NARROWER = "Can the Minister cancel a visa for breaching a condition, and what notice is given?";

test("AI chấm trùng lặp: câu diễn đạt khác đạt 85% thì gom chung, dưới 85% thì không", async () => {
  similarityTable = new Map([
    [PARAPHRASE, 0.9],
    [NARROWER, 0.6],
  ]);
  const user = await createUser();
  await ask(user);
  await ask(user, PARAPHRASE);
  await ask(user, NARROWER);
  assert.equal((await faqService.listFaqCandidates({ countryCode: "AU" })).length, 0);

  await ask(user, PARAPHRASE);
  const candidates = await faqService.listFaqCandidates({ countryCode: "AU" });
  // Câu hẹp hơn tách riêng nhưng chỉ 1 lần hỏi: không được hiện thành đề xuất.
  assert.equal(candidates.length, 1);
  const [candidate] = candidates;
  assert.equal(candidate.count, 3);
  assert.ok(candidate.questions.includes(PARAPHRASE));
  assert.ok(!candidate.questions.includes(NARROWER));
  assert.equal(candidate.minSimilarity, 0.9);
});

test("AI chấm trùng lặp lỗi: không đưa nhóm chưa kiểm lên cho admin", async () => {
  faqService.__setSimilarityScorerForTest(async () => null);
  const user = await createUser();
  await ask(user);
  await ask(user, PARAPHRASE);
  await ask(user, PARAPHRASE);
  assert.equal((await faqService.listFaqCandidates({ countryCode: "AU" })).length, 0);
});

test("parseScores: nhận JSON điểm 0-100 đúng số lượng, loại kết quả sai", () => {
  assert.deepEqual(similarity.parseScores('Kết quả {"scores":[90, 40]}', 2), [0.9, 0.4]);
  assert.equal(similarity.parseScores('{"scores":[90]}', 2), null);
  assert.equal(similarity.parseScores('{"scores":[120, 10]}', 2), null);
  assert.equal(similarity.parseScores("không phải JSON", 1), null);
});
