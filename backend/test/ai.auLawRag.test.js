import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";
import { chunkAuLaw } from "../src/rag/auLawChunking.js";

/*
 * Luật liên bang Úc trong RAG (docs/AI_FEATURE_PLAN.md G3): chunk theo điều, index, và xác minh
 * chunk còn là bản biên soạn HIỆN HÀNH trước khi đưa cho AI. Không gọi mạng: block luật và tra
 * registerId đều được thay bằng dữ liệu giả; embedding dùng provider mock.
 */

const TITLE_ID = "C1958A00062"; // Migration Act 1958 (nằm trong danh sách tuyển chọn)
const LAW_NAME = "Migration Act 1958";

const block = (className, text, kind = className.startsWith("ActHead") ? "heading" : "text") => ({
  className,
  kind,
  text,
});

const BLOCKS = [
  block("LongT", "An Act relating to the entry into, and presence in, Australia of non-citizens"),
  block("ActHead2", "Part 2 - Arrival, presence and departure of non-citizens"),
  block("ActHead5", "116 Cancellation of visas"),
  block(
    "paragraph",
    "The Minister may cancel a visa if the holder has breached a condition of the visa.",
  ),
  block("paragraph", "The Minister must give the holder notice of the decision to cancel."),
  block("ActHead5", "117 Repealed"),
  block("paragraph", "[Repealed]"),
  block("ActHead5", "118 Notice of cancellation"),
  block(
    "paragraph",
    "A notice of cancellation must be given in the way prescribed by regulations.",
  ),
  block("ActHead5", "119 Review of decisions"),
  block("paragraph", "A person affected by a decision under this Part may apply for review."),
];

let LegalChunk;
let Country;
let User;
let chat;
let indexService;
let retrieval;
let llmIndex;
let embeddingIndex;
let memoryDriver;
let mockEmbedding;
let mockLlm;

before(async () => {
  await startTestDb();
  LegalChunk = (await import("../src/models/LegalChunk.js")).default;
  Country = (await import("../src/models/Country.js")).default;
  User = (await import("../src/models/User.js")).default;
  chat = await import("../src/services/chat.service.js");
  indexService = await import("../src/services/auLawIndex.service.js");
  retrieval = await import("../src/rag/retrieval.js");
  llmIndex = await import("../src/rag/llm/index.js");
  embeddingIndex = await import("../src/rag/embedding/index.js");
  memoryDriver = await import("../src/rag/search/memory.driver.js");
  mockEmbedding = await import("../src/rag/embedding/mock.embedding.js");
  mockLlm = await import("../src/rag/llm/mock.llm.js");
});

after(stopTestDb);

beforeEach(async () => {
  await clearTestDb();
  embeddingIndex.__setEmbeddingProviderForTest(
    mockEmbedding.createMockEmbeddingProvider({ dims: 768 }),
  );
  llmIndex.__setLlmProviderForTest(mockLlm.createMockLlmProvider());
  retrieval.__setAuRegisterLookupForTest(async () => "REGISTER-1");
  memoryDriver.invalidateMemorySearchCache();
});

const fakeDeps = (blocks = BLOCKS, registerId = "REGISTER-1") => ({
  loadBlocks: async () => ({ rawVersion: { registerId, start: "2025-07-01" }, allBlocks: blocks }),
  getName: async () => LAW_NAME,
});

// ── chunking ───────────────────────────────────────────────────────────────

test("chunkAuLaw: mỗi điều một chunk, giữ số điều và Phần, bỏ điều đã bãi bỏ", () => {
  const pieces = chunkAuLaw({ blocks: BLOCKS, lawName: LAW_NAME, topicLabel: "Cư trú" });

  assert.deepEqual(
    pieces.map((piece) => piece.sectionRef),
    ["116", "118", "119"],
  );
  assert.equal(pieces[0].heading, "116 Cancellation of visas");
  assert.equal(pieces[0].partHeading, "Part 2 - Arrival, presence and departure of non-citizens");
  assert.match(pieces[0].text, /may cancel a visa/);
  assert.match(pieces[0].text, /must give the holder notice/);
  assert.match(pieces[0].textForEmbedding, /\[Luật: Migration Act 1958\] \[Chủ đề: Cư trú\]/);
  assert.deepEqual(
    pieces.map((piece) => piece.order),
    [0, 1, 2],
  );
});

test("chunkAuLaw: điều dài được chia nhưng mọi chunk giữ tiêu đề điều", () => {
  const longParagraphs = Array.from({ length: 6 }, (_, index) =>
    block("paragraph", `Paragraph ${index} ${"word ".repeat(60)}`.trim()),
  );
  const blocks = [
    block("ActHead5", "1 Long section"),
    ...longParagraphs,
    block("ActHead5", "2 Second"),
    block("paragraph", "x".repeat(60)),
    block("ActHead5", "3 Third"),
    block("paragraph", "y".repeat(60)),
  ];
  const pieces = chunkAuLaw({ blocks, lawName: LAW_NAME });
  const first = pieces.filter((piece) => piece.sectionRef === "1");

  assert.ok(first.length >= 2);
  assert.ok(first.every((piece) => piece.heading === "1 Long section"));
  assert.ok(first.every((piece) => piece.text.length <= 1300));
});

test("chunkAuLaw: văn bản không dùng ActHead5 thì mọi tiêu đề mở một nhóm", () => {
  const blocks = [
    block("Heading", "Regulation 1 - Definitions", "heading"),
    block("paragraph", "In these Regulations, visa means a permission to travel to Australia."),
    block("Heading", "Regulation 2 - Application", "heading"),
    block("paragraph", "These Regulations apply to applications made after commencement."),
  ];
  const pieces = chunkAuLaw({ blocks, lawName: "Migration Regulations 1994" });
  assert.deepEqual(
    pieces.map((piece) => piece.heading),
    ["Regulation 1 - Definitions", "Regulation 2 - Application"],
  );
});

// ── index ──────────────────────────────────────────────────────────────────

test("indexAuLaw: ghi chunk luật gốc dùng chung bộ lọc countryCode/status/topicSlug", async () => {
  const result = await indexService.indexAuLaw(TITLE_ID, fakeDeps());
  assert.equal(result.chunks, 3);
  assert.equal(result.replaced, 0);

  const stored = await LegalChunk.find({ titleId: TITLE_ID }).select("+embedding").lean();
  assert.equal(stored.length, 3);
  const [first] = stored.sort((a, b) => a.order - b.order);
  assert.equal(first.sourceType, "au_legislation");
  assert.equal(first.countryCode, "AU");
  assert.equal(first.status, "published");
  assert.equal(first.topicSlug, "cu-tru");
  assert.equal(first.registerId, "REGISTER-1");
  assert.equal(first.articleId, undefined);
  assert.equal(first.embedding.length, 768);
  assert.match(first.officialUrl, /C1958A00062\/latest\/text$/);
});

test("indexAuLaw: index lại thay chunk cũ, từ chối luật ngoài danh sách tuyển chọn", async () => {
  await indexService.indexAuLaw(TITLE_ID, fakeDeps());
  const again = await indexService.indexAuLaw(TITLE_ID, fakeDeps(BLOCKS.slice(0, 5), "REGISTER-2"));
  assert.equal(again.replaced, 3);
  assert.equal(again.chunks, 1);
  assert.equal(await LegalChunk.countDocuments({ titleId: TITLE_ID }), 1);

  await assert.rejects(indexService.indexAuLaw("C0000A00000", fakeDeps()), /danh sách tuyển chọn/);
  assert.equal((await indexService.listIndexedAuLaws())[0].chunks, 1);
  assert.equal((await indexService.purgeAuLaw(TITLE_ID)).deleted, 1);
});

test("indexAuLaw: lỗi embedding không làm mất chunk đang dùng", async () => {
  await indexService.indexAuLaw(TITLE_ID, fakeDeps());
  const broken = { embedBatch: async () => Promise.reject(new Error("429")), model: "x" };
  await assert.rejects(
    indexService.indexAuLaw(TITLE_ID, { ...fakeDeps(), embedder: broken }),
    /429/,
  );
  assert.equal(await LegalChunk.countDocuments({ titleId: TITLE_ID }), 3);
});

// ── truy hồi + chat ────────────────────────────────────────────────────────

const seedAustralia = async () => {
  await Country.create({
    code: "AU",
    name: "Úc",
    status: "active",
    emergencyNumbers: { police: "000" },
  });
  await indexService.indexAuLaw(TITLE_ID, fakeDeps());
  return User.create({
    username: "au_rag",
    fullName: "AU RAG",
    email: "au_rag@example.test",
    password: "khong-dung-toi",
    role: "user",
  });
};

const askAu = async (user, question) => {
  const session = await chat.createSession(user._id, "AU");
  const { message } = await chat.sendMessage({
    userId: user._id,
    sessionId: session._id,
    question,
  });
  return message;
};

const QUESTION = "The Minister may cancel a visa if the holder has breached a condition?";

test("chat Úc: trả lời có trích dẫn điều luật gốc, gắn nhãn chưa kiểm chứng và URL chính thức", async () => {
  const user = await seedAustralia();
  const message = await askAu(user, QUESTION);

  assert.equal(message.fallbackReason, null, message.text);
  assert.ok(message.citations.length >= 1);
  const [citation] = message.citations;
  assert.equal(citation.sourceType, "au_legislation");
  assert.equal(citation.title, LAW_NAME);
  assert.match(citation.heading, /^116 Cancellation of visas/);
  assert.match(citation.officialUrl, /legislation\.gov\.au\/C1958A00062\/latest\/text$/);
  assert.ok(!citation.articleId);
});

test("chat Úc: bản biên soạn đã bị thay thế hoặc không tra được thì không dùng (fail-closed)", async () => {
  const user = await seedAustralia();

  retrieval.__setAuRegisterLookupForTest(async () => "REGISTER-NEWER");
  const stale = await askAu(user, QUESTION);
  assert.equal(stale.fallbackReason, "INSUFFICIENT_EVIDENCE");
  assert.equal(stale.citations.length, 0);

  retrieval.__setAuRegisterLookupForTest(async () => {
    throw new Error("UPSTREAM_DOWN");
  });
  const unreachable = await askAu(user, QUESTION);
  assert.equal(unreachable.fallbackReason, "INSUFFICIENT_EVIDENCE");
});

test("retrieval Úc: nguồn chập chờn sau một lần tra thành công vẫn dùng mã đã xác minh gần đây", async () => {
  await seedAustralia();
  const verified = await retrieval.retrieve({ question: QUESTION, countryCode: "AU" });
  assert.equal(verified.passed, true);

  let liveCalls = 0;
  const upstreamDown = async () => {
    liveCalls += 1;
    throw new Error("UPSTREAM_DOWN");
  };
  // Đổi hàm tra mà không xoá bộ nhớ (hàm test xoá), mô phỏng nguồn sập giữa chừng.
  retrieval.__swapAuRegisterLookupKeepMemoryForTest(upstreamDown);
  const whileDown = await retrieval.retrieve({ question: QUESTION, countryCode: "AU" });
  assert.equal(whileDown.passed, true);
  assert.ok(liveCalls >= 1, "vẫn phải thử tra lại ở nền");
});

test("chat Úc: chunk của luật ngoài danh sách tuyển chọn bị loại dù nằm trong DB", async () => {
  const user = await seedAustralia();
  await LegalChunk.updateMany({ titleId: TITLE_ID }, { $set: { titleId: "C0000A00000" } });
  memoryDriver.invalidateMemorySearchCache();

  const message = await askAu(user, QUESTION);
  assert.equal(message.fallbackReason, "INSUFFICIENT_EVIDENCE");
});

test("chunk luật Úc không lọt sang phiên của quốc gia khác", async () => {
  await seedAustralia();
  await Country.create({ code: "KR", name: "Hàn Quốc", status: "active" });
  const user = await User.create({
    username: "kr_user",
    fullName: "KR",
    email: "kr_user@example.test",
    password: "khong-dung-toi",
    role: "user",
  });
  const session = await chat.createSession(user._id, "KR");
  const { message } = await chat.sendMessage({
    userId: user._id,
    sessionId: session._id,
    question: QUESTION,
  });
  assert.equal(message.fallbackReason, "INSUFFICIENT_EVIDENCE");
  assert.equal(message.citations.length, 0);
});
