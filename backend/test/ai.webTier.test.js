import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";

/*
 * Tầng tra web (rag/webAnswer.js) và trả lời lặp lại (services/answerMemory.service.js).
 * Không gọi mạng: provider tra web và bước chấm chủ đề đều là hàm giả.
 * Trọng tâm là lớp chống ảo giác: chỉ nguồn chính phủ thật sự đã đọc mới được hiển thị.
 */

let Country;
let User;
let AiEvent;
let LegalChunk;
let chat;
let llmIndex;
let webTopicGate;
let webAnswer;
let mockLlm;
let embeddingIndex;
let mockEmbedding;
let memoryDriver;
let retrieval;
let indexService;

before(async () => {
  await startTestDb();
  Country = (await import("../src/models/Country.js")).default;
  User = (await import("../src/models/User.js")).default;
  AiEvent = (await import("../src/models/AiEvent.js")).default;
  LegalChunk = (await import("../src/models/LegalChunk.js")).default;
  chat = await import("../src/services/chat.service.js");
  llmIndex = await import("../src/rag/llm/index.js");
  webTopicGate = await import("../src/rag/webTopicGate.js");
  webAnswer = await import("../src/rag/webAnswer.js");
  mockLlm = await import("../src/rag/llm/mock.llm.js");
  embeddingIndex = await import("../src/rag/embedding/index.js");
  mockEmbedding = await import("../src/rag/embedding/mock.embedding.js");
  memoryDriver = await import("../src/rag/search/memory.driver.js");
  retrieval = await import("../src/rag/retrieval.js");
  indexService = await import("../src/services/auLawIndex.service.js");
});

after(async () => {
  llmIndex.__setWebSearchProviderForTest(undefined);
  webTopicGate.__setTopicGateForTest(null);
  await stopTestDb();
});

const NSW_URL = "https://www.nsw.gov.au/driving-boating-and-transport/demerits-penalties-and-offences";
const TRAFFIC_QUESTION = "Ở Sydney vượt đèn đỏ thì bị xử lý thế nào?";

const webJson = (overrides = {}) =>
  JSON.stringify({
    inScope: true,
    answerable: true,
    answer: "Vượt đèn đỏ ở NSW bị phạt tiền và cộng điểm phạt theo bảng mức phạt của bang. [S1]",
    actions: ["Tra bảng mức phạt mới nhất của NSW trước khi lái xe. [S1]"],
    avoid: [],
    usedSources: ["S1"],
    sources: [{ marker: "S1", url: NSW_URL, title: "Demerits, penalties and offences" }],
    confidence: "medium",
    needsOfficialHelp: false,
    ...overrides,
  });

let webCalls;
const useWebProvider = (text = webJson(), { seenUrls = [NSW_URL], searchCount = 2 } = {}) => {
  webCalls = 0;
  llmIndex.__setWebSearchProviderForTest({
    model: "web-test",
    search: async () => {
      webCalls += 1;
      return {
        text,
        seenUrls: new Set(seenUrls),
        searchCount,
        usage: { inputTokens: 20_000, outputTokens: 400 },
      };
    },
  });
};

beforeEach(async () => {
  await clearTestDb();
  embeddingIndex.__setEmbeddingProviderForTest(
    mockEmbedding.createMockEmbeddingProvider({ dims: 768 }),
  );
  llmIndex.__setLlmProviderForTest(mockLlm.createMockLlmProvider());
  retrieval.__setAuRegisterLookupForTest(async () => "REGISTER-1");
  memoryDriver.invalidateMemorySearchCache();
  webTopicGate.__setTopicGateForTest(async () => true);
  useWebProvider();
});

const seedAustralia = async () => {
  await Country.create({
    code: "AU",
    name: "Úc",
    status: "active",
    emergencyNumbers: { police: "000" },
    officialWebDomains: ["gov.au"],
  });
  return User.create({
    username: "au_web",
    fullName: "AU Web",
    email: "au_web@example.test",
    password: "khong-dung-toi",
    role: "user",
  });
};

const ask = async (user, question, extra = {}) => {
  const session = await chat.createSession(user._id, "AU");
  const { message } = await chat.sendMessage({
    userId: user._id,
    sessionId: session._id,
    question,
    ...extra,
  });
  return message;
};

const usedToday = async (user) => (await User.findById(user._id).lean()).aiUsage?.count ?? 0;

// ── guard nguồn web ────────────────────────────────────────────────────────

test("nguồn web: chỉ giữ URL https thuộc tên miền chính phủ VÀ đã thật sự được tìm thấy", () => {
  const sources = [
    { marker: "S1", url: NSW_URL, title: "NSW" },
    { marker: "S2", url: "https://www.example.com/nsw-fines", title: "Blog" },
    { marker: "S3", url: "http://www.nsw.gov.au/x", title: "Không https" },
    { marker: "S4", url: "https://www.vic.gov.au/model-tu-nghi-ra", title: "Chưa từng mở" },
    { marker: "S5", url: "https://fakegov.au/x", title: "Giả tên miền" },
  ];
  const map = webAnswer.buildWebSourceMap(sources, {
    allowedDomains: ["gov.au"],
    seenUrls: new Set([`${NSW_URL}/#bang`, "https://www.example.com/nsw-fines", "https://fakegov.au/x"]),
  });
  assert.deepEqual([...map.keys()], ["S1"]);
  assert.equal(map.get("S1").sourceType, "official_web");
  assert.equal(map.get("S1").officialUrl, NSW_URL);
});

test("tra web: model không tìm lần nào thì câu trả lời là từ trí nhớ, bị hạ cấp", async () => {
  useWebProvider(webJson(), { searchCount: 0 });
  const web = await webAnswer.answerFromOfficialWeb({
    provider: llmIndex.getWebSearchProvider(),
    question: TRAFFIC_QUESTION,
    country: { code: "AU", name: "Úc", officialWebDomains: ["gov.au"] },
    allowedNumbers: [],
  });
  assert.equal(web.guarded.fallbackReason, "GUARD_REJECTED");
  assert.deepEqual(web.guarded.citations, []);
});

test("tra web: số tiền không có marker nguồn bị bỏ, nguồn ngoài danh sách không được dẫn", async () => {
  useWebProvider(
    webJson({
      answer: "Phạt 562 AUD và 3 điểm. [S1]",
      actions: ["Nộp phạt 562 AUD trong 21 ngày."],
      sources: [
        { marker: "S1", url: NSW_URL, title: "NSW" },
        { marker: "S2", url: "https://www.example.com", title: "Blog" },
      ],
    }),
  );
  const web = await webAnswer.answerFromOfficialWeb({
    provider: llmIndex.getWebSearchProvider(),
    question: TRAFFIC_QUESTION,
    country: { code: "AU", name: "Úc", officialWebDomains: ["gov.au"] },
    allowedNumbers: [],
  });
  assert.equal(web.guarded.fallbackReason, null);
  assert.deepEqual(web.guarded.sections.actions, []);
  assert.deepEqual(
    web.guarded.citations.map((citation) => citation.officialUrl),
    [NSW_URL],
  );
  assert.match(web.guarded.answer, /CHƯA kiểm chứng/);
});

test("tra web: link công cụ tìm kiếm chèn giữa câu bị bỏ, nguồn chỉ còn ở danh sách đã kiểm", async () => {
  useWebProvider(
    webJson({
      avoid: [
        "Không mang dao bấm vào Úc. [S1] ([abf.gov.au](https://www.abf.gov.au/x?utm_source=openai))",
      ],
    }),
  );
  const web = await webAnswer.answerFromOfficialWeb({
    provider: llmIndex.getWebSearchProvider(),
    question: TRAFFIC_QUESTION,
    country: { code: "AU", name: "Úc", officialWebDomains: ["gov.au"] },
    allowedNumbers: [],
  });
  assert.deepEqual(web.guarded.sections.avoid, ["Không mang dao bấm vào Úc. [S1]"]);
  assert.doesNotMatch(web.guarded.answer, /utm_source|https:\/\/www\.abf/);
});

// ── chat: tầng tra web ─────────────────────────────────────────────────────

test("chat Úc: câu giao thông (kho chưa có) được trả lời bằng tra web, gắn nguồn chính phủ", async () => {
  const user = await seedAustralia();
  const message = await ask(user, TRAFFIC_QUESTION);

  assert.equal(webCalls, 1);
  assert.equal(message.fallbackReason, null, message.text);
  assert.equal(message.answerSource, "official_web");
  assert.equal(message.citations[0].sourceType, "official_web");
  assert.equal(message.citations[0].officialUrl, NSW_URL);
  const event = await AiEvent.findOne({ messageId: message._id }).lean();
  assert.equal(event.webSearch, true);
  assert.equal(event.model, "web-test");
  assert.ok(event.costEstimateVnd > 0);
});

test("chat Úc: model nhỏ chấm là ngoài chủ đề thì không tra web, dùng lời từ chối", async () => {
  const user = await seedAustralia();
  webTopicGate.__setTopicGateForTest(async () => false);
  const message = await ask(user, TRAFFIC_QUESTION);

  assert.equal(webCalls, 0);
  assert.equal(message.fallbackReason, "INSUFFICIENT_EVIDENCE");
  assert.match(message.text, /https:\/\/www\.nsw\.gov\.au\//);
});

test("chat Úc: hết lượt tra web trong ngày thì không tra web", async () => {
  const user = await seedAustralia();
  const today = Array.from({ length: 5 }, (_, index) => ({
    userId: user._id,
    countryCode: "AU",
    questionHash: `h${index}`,
    webSearch: true,
  }));
  await AiEvent.insertMany(today);
  const message = await ask(user, TRAFFIC_QUESTION);

  assert.equal(webCalls, 0);
  assert.equal(message.fallbackReason, "INSUFFICIENT_EVIDENCE");
});

test("chat Úc: quốc gia không khai tên miền chính phủ thì không có tầng tra web", async () => {
  const user = await seedAustralia();
  await Country.updateOne({ code: "AU" }, { $set: { officialWebDomains: [] } });
  const message = await ask(user, TRAFFIC_QUESTION);

  assert.equal(webCalls, 0);
  assert.equal(message.fallbackReason, "INSUFFICIENT_EVIDENCE");
});

// ── trả lời lặp lại ────────────────────────────────────────────────────────

test("lặp lại: cùng câu (khác dấu câu, hoa thường, không dấu) dùng lại ngay, không gọi AI, không trừ lượt", async () => {
  const user = await seedAustralia();
  await ask(user, TRAFFIC_QUESTION);
  assert.equal(await usedToday(user), 1);

  const again = await ask(user, "o sydney VUOT DEN DO thi bi xu ly the nao");
  assert.equal(webCalls, 1, "lần 2 không được tra web lại");
  assert.equal(again.repeated, true);
  assert.equal(again.answerSource, "official_web");
  assert.equal(again.citations[0].officialUrl, NSW_URL);
  assert.equal(await usedToday(user), 1);
});

test("lặp lại: 'Tạo lại' luôn trả lời mới", async () => {
  const user = await seedAustralia();
  await ask(user, TRAFFIC_QUESTION);
  const regenerated = await ask(user, TRAFFIC_QUESTION, { regenerate: true });
  assert.equal(webCalls, 2);
  assert.equal(regenerated.repeated, false);
});

test("lặp lại: câu trả lời bị từ chối không được ghi nhớ", async () => {
  const user = await seedAustralia();
  webTopicGate.__setTopicGateForTest(async () => false);
  await ask(user, TRAFFIC_QUESTION);
  webTopicGate.__setTopicGateForTest(async () => true);
  const second = await ask(user, TRAFFIC_QUESTION);
  assert.equal(second.repeated, false);
  assert.equal(webCalls, 1);
});

// Luật Úc trong kho: câu trả lời đã ghi nhớ hết hiệu lực khi luật đổi bản hiện hành.
const LAW_BLOCKS = [
  { className: "ActHead5", kind: "heading", text: "116 Cancellation of visas" },
  {
    className: "paragraph",
    kind: "text",
    text: "The Minister may cancel a visa if the holder has breached a condition of the visa.",
  },
];
const LAW_QUESTION = "The Minister may cancel a visa if the holder has breached a condition?";

const indexMigrationAct = () =>
  indexService.indexAuLaw("C1958A00062", {
    loadBlocks: async () => ({
      rawVersion: { registerId: "REGISTER-1", start: "2025-07-01" },
      allBlocks: LAW_BLOCKS,
    }),
    getName: async () => "Migration Act 1958",
  });

test("lặp lại: câu trả lời từ kho bị bỏ khi luật đổi bản hiện hành (không phát nội dung cũ)", async () => {
  const user = await seedAustralia();
  await indexMigrationAct();
  memoryDriver.invalidateMemorySearchCache();
  webTopicGate.__setTopicGateForTest(async () => false);

  const first = await ask(user, LAW_QUESTION);
  assert.equal(first.fallbackReason, null, first.text);
  assert.equal(first.answerSource, "ai");
  assert.equal((await ask(user, LAW_QUESTION)).repeated, true);

  retrieval.__setAuRegisterLookupForTest(async () => "REGISTER-NEWER");
  const afterChange = await ask(user, LAW_QUESTION);
  assert.equal(afterChange.repeated, false);
  assert.equal(afterChange.fallbackReason, "INSUFFICIENT_EVIDENCE");
  assert.ok(await LegalChunk.exists({ titleId: "C1958A00062" }));
});

test("lặp lại: câu khác thứ tự từ nhưng cùng từ khoá dùng lại, trả lượt quota", async () => {
  const user = await seedAustralia();
  await indexMigrationAct();
  memoryDriver.invalidateMemorySearchCache();

  await ask(user, LAW_QUESTION);
  assert.equal(await usedToday(user), 1);
  const reordered = await ask(
    user,
    "If the holder has breached a condition, the Minister may cancel a visa?",
  );
  assert.equal(reordered.repeated, true);
  assert.equal(await usedToday(user), 1);
});
