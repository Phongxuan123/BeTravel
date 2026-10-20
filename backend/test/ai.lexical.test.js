import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";

/*
 * Truy hồi KHÔNG embedding (RETRIEVAL_MODE=lexical): LLM chuyển câu hỏi thành từ khoá, tìm theo
 * độ phủ từ khoá có trọng số, áp ngưỡng TRƯỚC khi gọi LLM trả lời và vẫn xác minh chunk luật Úc
 * là bản hiện hành (fail-closed). env bị đóng băng nên gọi thẳng retrieveLexical thay vì đổi env.
 */

const TITLE_ID = "C1958A00062"; // Migration Act 1958 (nằm trong danh sách tuyển chọn)

const block = (className, text, kind = className.startsWith("ActHead") ? "heading" : "text") => ({
  className,
  kind,
  text,
});

const BLOCKS = [
  block("ActHead2", "Part 2 - Arrival, presence and departure of non-citizens"),
  block("ActHead5", "116 Cancellation of visas"),
  block("paragraph", "The Minister may cancel a visa if the holder breached a condition of the visa."),
  block("ActHead5", "118 Notice of cancellation"),
  block("paragraph", "The Minister must give the visa holder written notice before the cancellation."),
  block("ActHead5", "119 Review of decisions"),
  block("paragraph", "A person affected by a decision under this Part may apply for review."),
];

let indexService;
let retrieval;
let llmIndex;
let embeddingIndex;
let memoryDriver;
let mockEmbedding;
let lexical;
let queryRewrite;

before(async () => {
  await startTestDb();
  indexService = await import("../src/services/auLawIndex.service.js");
  retrieval = await import("../src/rag/retrieval.js");
  llmIndex = await import("../src/rag/llm/index.js");
  embeddingIndex = await import("../src/rag/embedding/index.js");
  memoryDriver = await import("../src/rag/search/memory.driver.js");
  mockEmbedding = await import("../src/rag/embedding/mock.embedding.js");
  lexical = await import("../src/rag/lexical.js");
  queryRewrite = await import("../src/rag/queryRewrite.js");
});

after(stopTestDb);

// LLM giả chỉ trả danh sách từ khoá cố định, như bước rewrite của model thật.
const keywordLlm = (keywords) => ({
  provider: "fake",
  model: "fake-rewrite",
  complete: async () => `Đây là từ khoá: ${JSON.stringify(keywords)}`,
});

beforeEach(async () => {
  await clearTestDb();
  embeddingIndex.__setEmbeddingProviderForTest(
    mockEmbedding.createMockEmbeddingProvider({ dims: 768 }),
  );
  retrieval.__setAuRegisterLookupForTest(async () => "REGISTER-1");
  memoryDriver.invalidateMemorySearchCache();
  await indexService.indexAuLaw(TITLE_ID, {
    loadBlocks: async () => ({
      rawVersion: { registerId: "REGISTER-1", start: "2025-07-01" },
      allBlocks: BLOCKS,
    }),
    getName: async () => "Migration Act 1958",
  });
  memoryDriver.invalidateMemorySearchCache();
});

const ask = (question) =>
  retrieval.retrieveLexical({ question, countryCode: "AU", topicSlug: undefined });

test("tokenize: bỏ dấu, bỏ từ dừng, gộp số nhiều/quá khứ", () => {
  assert.deepEqual(lexical.tokenize("Cancelled visas of the holders"), ["cancell", "visa", "holder"]);
  assert.deepEqual(lexical.tokenize("Hộ chiếu bị từ chối"), ["ho", "chieu", "tu", "choi"]);
});

test("parseRewriteJson: chịu chữ thừa quanh JSON, loại phần tử không phải chuỗi", () => {
  assert.deepEqual(queryRewrite.parseRewriteJson('Kết quả: {"vi":["thị thực",3],"en":["visa"]} xong'), {
    vi: ["thị thực"],
    en: ["visa"],
  });
  assert.equal(queryRewrite.parseRewriteJson("không có JSON"), null);
  assert.equal(queryRewrite.parseRewriteJson('{"vi":[],"en":[]}'), null);
});

test("lexical: câu hỏi đúng chủ đề qua ngưỡng và trích đúng luật", async () => {
  llmIndex.__setLlmProviderForTest(
    keywordLlm({ vi: ["huỷ thị thực"], en: ["cancel visa", "notice", "holder"] }),
  );
  const result = await ask("Bị huỷ visa Úc có được báo trước không?");

  assert.equal(result.passed, true);
  assert.ok(result.chunks.length >= 2);
  assert.ok(result.chunks.every((chunk) => chunk.title === "Migration Act 1958"));
  assert.ok(result.topScore >= 0.4);
});

test("lexical: từ khoá không có trong kho luật thì từ chối trước khi gọi LLM trả lời", async () => {
  llmIndex.__setLlmProviderForTest(
    keywordLlm({ vi: ["phạt tốc độ"], en: ["speeding", "traffic fine", "road rule"] }),
  );
  const result = await ask("Phạt tốc độ ở Sydney bao nhiêu?");

  assert.equal(result.passed, false);
  assert.equal(result.reason, "INSUFFICIENT_EVIDENCE");
  assert.equal(result.chunks.length, 0);
});

test("lexical: bản biên soạn đã đổi thì loại chunk (fail-closed), không trả bằng chứng cũ", async () => {
  llmIndex.__setLlmProviderForTest(
    keywordLlm({ vi: ["huỷ thị thực"], en: ["cancel visa", "notice", "holder"] }),
  );
  retrieval.__setAuRegisterLookupForTest(async () => "REGISTER-2");
  const result = await ask("Bị huỷ visa Úc có được báo trước không?");

  assert.equal(result.passed, false);
  assert.equal(result.chunks.length, 0);
});

test("lexical: LLM rewrite lỗi thì dùng câu hỏi gốc, không ném lỗi ra ngoài", async () => {
  llmIndex.__setLlmProviderForTest({
    provider: "fake",
    model: "fake",
    complete: async () => {
      throw new Error("UPSTREAM 500");
    },
  });
  const result = await ask("Bị huỷ visa Úc có được báo trước không?");
  assert.equal(result.passed, false);
});

test("cache từ khoá: hỏi lại câu giống nhau (khác hoa/thường, dấu câu) không gọi LLM lần nữa", async () => {
  let calls = 0;
  llmIndex.__setLlmProviderForTest({
    provider: "fake",
    model: "fake",
    complete: async () => {
      calls += 1;
      return JSON.stringify({ vi: ["huỷ thị thực"], en: ["cancel visa", "notice"] });
    },
  });
  const first = await queryRewrite.getQuestionKeywords("Bị huỷ visa Úc có được báo trước không?");
  const again = await queryRewrite.getQuestionKeywords("bị huỷ visa úc có được báo trước không");

  assert.equal(calls, 1);
  assert.deepEqual(again, first);
});

test("cache từ khoá: không lưu bản dự phòng khi LLM lỗi, lần sau vẫn thử lại LLM", async () => {
  let calls = 0;
  llmIndex.__setLlmProviderForTest({
    provider: "fake",
    model: "fake",
    complete: async () => {
      calls += 1;
      throw new Error("UPSTREAM 500");
    },
  });
  await queryRewrite.getQuestionKeywords("Câu hỏi khi AI lỗi");
  await queryRewrite.getQuestionKeywords("Câu hỏi khi AI lỗi");
  assert.equal(calls, 2);
});
