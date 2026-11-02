import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";
import { readFileSync } from "node:fs";

import { registerAndLogin } from "./helpers.js";

/*
 * Tro ly AI ban 2 qua HTTP that (route + validate + service + pipeline), mo hinh thay bang
 * provider gia de khong goi API that. Kho nguon dung duong chunk + memory driver nhu production.
 */
let app;
let m;
let chunkArticle;
let providers;
let embeddingIndex;
let memoryDriver;
let mockEmbedding;

const auth = (token) => `Bearer ${token}`;

const TRIAGE_RULES = [
  [
    /phá»Ÿ/,
    { intent: "out_of_scope", reply: "Trá»£ lĂ½ chá»‰ há»— trá»£ chá»§ Ä‘á» chuyáº¿n Ä‘i." },
  ],
  [
    /giáº¥u thá»‹t/,
    { intent: "harmful", reply: "KhĂ´ng thá»ƒ giĂºp viá»‡c nĂ y, hĂ£y khai bĂ¡o." },
  ],
  [/báº¥t tá»‰nh/, { intent: "emergency" }],
  [
    /^cĂ³ bá»‹ pháº¡t khĂ´ng\?$/i,
    {
      intent: "clarify",
      reply: "Báº¡n há»i vá» hĂ nh vi nĂ o?",
      options: ["Giao thĂ´ng", "Háº£i quan"],
    },
  ],
];

const fakeTriage = {
  model: "fake-triage",
  async complete({ question }) {
    const rule = TRIAGE_RULES.find(([pattern]) => pattern.test(question));
    return JSON.stringify({ question, ...(rule ? rule[1] : { intent: "answer" }) });
  },
};

// Tra loi co mot marker hop le, mot marker bia va mot con so khong nguon -- guard phai xu ly.
const fakeAnswer = {
  model: "fake-answer",
  async complete({ chunks }) {
    const answer = chunks.length
      ? "CĂ³, bá»‹ pháº¡t [1]. Má»©c pháº¡t lĂ  500 AUD. Xem thĂªm [9].\n**NĂªn lĂ m gĂ¬ tiáº¿p:** dá»«ng trÆ°á»›c váº¡ch."
      : "NĂªn mang Ă¡o áº¥m. PhĂ­ lĂ  50 AUD.\n**NĂªn lĂ m gĂ¬ tiáº¿p:** xem dá»± bĂ¡o.";
    return JSON.stringify({ answer });
  },
};

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
  m = {
    Country: (await import("../src/models/Country.js")).default,
    LegalTopic: (await import("../src/models/LegalTopic.js")).default,
    LegalArticle: (await import("../src/models/LegalArticle.js")).default,
    LegalChunk: (await import("../src/models/LegalChunk.js")).default,
    AiEvent: (await import("../src/models/AiEvent.js")).default,
  };
  ({ chunkArticle } = await import("../src/rag/chunking.js"));
  providers = await import("../src/rag/assistant/providers.js");
  embeddingIndex = await import("../src/rag/embedding/index.js");
  memoryDriver = await import("../src/rag/search/memory.driver.js");
  mockEmbedding = await import("../src/rag/embedding/mock.embedding.js");
});

after(async () => {
  providers.__setAssistantProvidersForTest(null);
  await stopTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  embeddingIndex.__setEmbeddingProviderForTest(
    mockEmbedding.createMockEmbeddingProvider({ dims: 768 }),
  );
  providers.__setAssistantProvidersForTest({ triage: fakeTriage, answer: fakeAnswer, web: null });
  memoryDriver.invalidateMemorySearchCache();
  await m.Country.create({
    code: "KR",
    name: "HĂ n Quá»‘c",
    status: "active",
    emergencyNumbers: { police: "112", ambulance: "119" },
  });
  await m.LegalTopic.create({ countryCode: "KR", slug: "giao-thong", label: "Giao thĂ´ng" });
});

const indexArticle = async (overrides = {}) => {
  const article = await m.LegalArticle.create({
    countryCode: "KR",
    topicSlug: "giao-thong",
    slug: "vuot-den-do",
    status: "published",
    title: "VÆ°á»£t Ä‘Ă¨n Ä‘á» khi lĂ¡i xe",
    summaryVi: "VÆ°á»£t Ä‘Ă¨n Ä‘á» khi lĂ¡i xe bá»‹ xá»­ pháº¡t",
    bodyMd:
      "## Quy Ä‘á»‹nh\nNgÆ°á»i lĂ¡i xe vÆ°á»£t Ä‘Ă¨n Ä‘á» bá»‹ xá»­ pháº¡t theo luáº­t giao thĂ´ng.",
    sources: [
      { title: "Nguá»“n", url: "https://example.org/den-do", authority: "CÆ¡ quan", kind: "gov" },
    ],
    effectiveFrom: new Date("2024-01-01"),
    ...overrides,
  });
  const provider = embeddingIndex.getEmbeddingProvider();
  const pieces = chunkArticle(article.toObject(), { countryName: "HĂ n Quá»‘c" });
  const vectors = await provider.embedBatch(pieces.map((p) => p.textForEmbedding));
  await m.LegalChunk.insertMany(
    pieces.map((p, index) => ({
      articleId: article._id,
      articleSlug: article.slug,
      articleVersion: article.version,
      countryCode: "KR",
      topicSlug: "giao-thong",
      status: "published",
      heading: p.heading,
      order: p.order,
      text: p.text,
      textNorm: p.textNorm,
      embedding: vectors[index],
      embeddingModel: provider.model,
      kind: p.kind,
    })),
  );
  memoryDriver.invalidateMemorySearchCache();
  return article;
};

const ask = (token, body) =>
  request(app)
    .post("/api/assistant/messages")
    .set("Authorization", auth(token))
    .send({ countryCode: "KR", ...body });

test("tang nguon chinh thuc: trich dan that, marker bia va so khong nguon bi go", async () => {
  await indexArticle();
  const { accessToken } = await registerAndLogin(app);

  const res = await ask(accessToken, {
    message: "VÆ°á»£t Ä‘Ă¨n Ä‘á» khi lĂ¡i xe cĂ³ bá»‹ xá»­ pháº¡t khĂ´ng?",
  });

  assert.equal(res.status, 200);
  const { message } = res.body.data;
  assert.equal(message.kind, "answer");
  assert.equal(message.sourceTier, "official");
  assert.equal(message.citations.length, 1);
  assert.equal(message.citations[0].url, "https://example.org/den-do");
  assert.ok(!message.content.includes("500 AUD"));
  assert.ok(!message.content.includes("[9]"));
  assert.equal(await m.AiEvent.countDocuments(), 1);
  const fixture = JSON.parse(
    readFileSync(
      new URL("../../contracts/fixtures/assistant.message.json", import.meta.url),
      "utf8",
    ),
  ).data;
  for (const key of ["conversation", "userMessage", "message"]) {
    assert.deepEqual(Object.keys(res.body.data[key]).sort(), Object.keys(fixture[key]).sort());
  }
});

test("bai draft khong bao gio thanh nguon cua tro ly", async () => {
  await indexArticle({ status: "draft" });
  const { accessToken } = await registerAndLogin(app);

  const res = await ask(accessToken, {
    message: "VÆ°á»£t Ä‘Ă¨n Ä‘á» khi lĂ¡i xe cĂ³ bá»‹ xá»­ pháº¡t khĂ´ng?",
  });

  assert.equal(res.body.data.message.sourceTier, "general");
  assert.deepEqual(res.body.data.message.citations, []);
});

test("khong co nguon: tang kien thuc chung, khong con so nao lot ra", async () => {
  const { accessToken } = await registerAndLogin(app);

  const res = await ask(accessToken, { message: "ThĂ¡ng 7 thá»i tiáº¿t tháº¿ nĂ o?" });

  const { message } = res.body.data;
  assert.equal(message.sourceTier, "general");
  assert.ok(!message.content.includes("50 AUD"));
  assert.ok(message.content.includes("NĂªn lĂ m gĂ¬ tiáº¿p"));
});

test("ngoai pham vi va y do pham phap bi tu choi; khan cap co so goi; mo ho thi hoi lai", async () => {
  const { accessToken } = await registerAndLogin(app);

  const scope = (await ask(accessToken, { message: "Cho tĂ´i cĂ´ng thá»©c náº¥u phá»Ÿ" })).body.data
    .message;
  const harm = (await ask(accessToken, { message: "CĂ¡ch giáº¥u thá»‹t qua háº£i quan" })).body.data
    .message;
  const urgent = (await ask(accessToken, { message: "Báº¡n tĂ´i báº¥t tá»‰nh rá»“i" })).body.data
    .message;
  const vague = (await ask(accessToken, { message: "CĂ³ bá»‹ pháº¡t khĂ´ng?" })).body.data.message;

  assert.equal(scope.kind, "refuse_scope");
  assert.equal(harm.kind, "refuse_harm");
  assert.equal(urgent.kind, "emergency");
  assert.equal(urgent.emergencyNumber, "112");
  assert.equal(vague.kind, "clarify");
  assert.deepEqual(vague.clarifyOptions, ["Giao thĂ´ng", "Háº£i quan"]);
});

test("hoi thoai: luu lich su, tra loi lai chi tiet, xoa; nguoi khac khong xem duoc", async () => {
  const owner = await registerAndLogin(app);
  const other = await registerAndLogin(app);

  const first = (await ask(owner.accessToken, { message: "ThĂ¡ng 7 thá»i tiáº¿t tháº¿ nĂ o?" }))
    .body.data;
  await ask(owner.accessToken, {
    conversationId: first.conversation.id,
    message: "CĂ²n thĂ¡ng 12?",
  });

  const detail = await request(app)
    .get(`/api/assistant/conversations/${first.conversation.id}`)
    .set("Authorization", auth(owner.accessToken));
  assert.equal(detail.body.data.messages.length, 4);

  const regenerated = await request(app)
    .post(`/api/assistant/messages/${first.message.id}/regenerate`)
    .set("Authorization", auth(owner.accessToken))
    .send({ detailed: true });
  assert.equal(regenerated.body.data.message.id, first.message.id);
  assert.equal(regenerated.body.data.message.detailed, true);

  const peek = await request(app)
    .get(`/api/assistant/conversations/${first.conversation.id}`)
    .set("Authorization", auth(other.accessToken));
  assert.equal(peek.status, 404);

  await request(app)
    .delete(`/api/assistant/conversations/${first.conversation.id}`)
    .set("Authorization", auth(owner.accessToken));
  const list = await request(app)
    .get("/api/assistant/conversations")
    .set("Authorization", auth(owner.accessToken));
  assert.deepEqual(list.body.data, []);
});

test("bat buoc dang nhap va chi quoc gia dang hoat dong", async () => {
  const anonymous = await request(app)
    .post("/api/assistant/messages")
    .send({ countryCode: "KR", message: "Xin chĂ o" });
  assert.equal(anonymous.status, 401);

  const { accessToken } = await registerAndLogin(app);
  const res = await ask(accessToken, { countryCode: "JP", message: "Xin chĂ o" });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
});
