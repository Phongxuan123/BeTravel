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
let articleIndex;

const auth = (token) => `Bearer ${token}`;

const TRIAGE_RULES = [
  [/phở/, { intent: "out_of_scope", reply: "Trợ lý chỉ hỗ trợ chủ đề chuyến đi." }],
  [/giấu thịt/, { intent: "harmful", reply: "Không thể giúp việc này, hãy khai báo." }],
  [/bất tỉnh/, { intent: "emergency" }],
  // Tu khong trung chu nao trong bai: chi tim ra nho buoc chon bai tu muc luc.
  [/vape/, { intent: "answer", articles: ["vuot-den-do"], keywords: { vi: ["zzz"], en: ["zzz"] } }],
  [
    /^có bị phạt không\?$/i,
    {
      intent: "clarify",
      reply: "Bạn hỏi về hành vi nào?",
      options: ["Giao thông", "Hải quan"],
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
      ? "Có, bị phạt [1]. Mức phạt là 500 AUD. Xem thêm [9].\n**Nên làm gì tiếp:** dừng trước vạch."
      : "Nên mang áo ấm. Phí là 50 AUD.\n**Nên làm gì tiếp:** xem dự báo.";
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
  articleIndex = await import("../src/rag/assistant/articleIndex.js");
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
  articleIndex.__clearArticleIndexForTest();
  await m.Country.create({
    code: "KR",
    name: "Hàn Quốc",
    status: "active",
    emergencyNumbers: { police: "112", ambulance: "119" },
  });
  await m.LegalTopic.create({ countryCode: "KR", slug: "giao-thong", label: "Giao thông" });
});

const indexArticle = async (overrides = {}) => {
  const article = await m.LegalArticle.create({
    countryCode: "KR",
    topicSlug: "giao-thong",
    slug: "vuot-den-do",
    status: "published",
    title: "Vượt đèn đỏ khi lái xe",
    summaryVi: "Vượt đèn đỏ khi lái xe bị xử phạt",
    bodyMd: "## Quy định\nNgười lái xe vượt đèn đỏ bị xử phạt theo luật giao thông.",
    sources: [
      { title: "Nguồn", url: "https://example.org/den-do", authority: "Cơ quan", kind: "gov" },
    ],
    effectiveFrom: new Date("2024-01-01"),
    ...overrides,
  });
  const provider = embeddingIndex.getEmbeddingProvider();
  const pieces = chunkArticle(article.toObject(), { countryName: "Hàn Quốc" });
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
    message: "Vượt đèn đỏ khi lái xe có bị xử phạt không?",
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
    message: "Vượt đèn đỏ khi lái xe có bị xử phạt không?",
  });

  assert.equal(res.body.data.message.sourceTier, "general");
  assert.deepEqual(res.body.data.message.citations, []);
});

test("bai chon tu muc luc thanh nguon; bai draft du duoc chon van khong lot ra", async () => {
  const { accessToken } = await registerAndLogin(app);
  const article = await indexArticle();

  const picked = await ask(accessToken, { message: "Can I bring my vape?" });
  assert.equal(picked.body.data.message.sourceTier, "official");
  assert.equal(picked.body.data.message.citations[0].articleSlug, "vuot-den-do");

  await m.LegalArticle.updateOne({ _id: article._id }, { status: "draft" });
  articleIndex.__clearArticleIndexForTest();
  const hidden = await ask(accessToken, { message: "Can I bring my vape?" });
  assert.equal(hidden.body.data.message.sourceTier, "general");
  assert.deepEqual(hidden.body.data.message.citations, []);
});

test("khong co nguon: tang kien thuc chung, khong con so nao lot ra", async () => {
  const { accessToken } = await registerAndLogin(app);

  const res = await ask(accessToken, { message: "Tháng 7 thời tiết thế nào?" });

  const { message } = res.body.data;
  assert.equal(message.sourceTier, "general");
  assert.ok(!message.content.includes("50 AUD"));
  assert.ok(message.content.includes("Nên làm gì tiếp"));
});

test("ngoai pham vi va y do pham phap bi tu choi; khan cap co so goi; mo ho thi hoi lai", async () => {
  const { accessToken } = await registerAndLogin(app);

  const scope = (await ask(accessToken, { message: "Cho tôi công thức nấu phở" })).body.data
    .message;
  const harm = (await ask(accessToken, { message: "Cách giấu thịt qua hải quan" })).body.data
    .message;
  const urgent = (await ask(accessToken, { message: "Bạn tôi bất tỉnh rồi" })).body.data.message;
  const vague = (await ask(accessToken, { message: "Có bị phạt không?" })).body.data.message;

  assert.equal(scope.kind, "refuse_scope");
  assert.equal(harm.kind, "refuse_harm");
  assert.equal(urgent.kind, "emergency");
  assert.equal(urgent.emergencyNumber, "112");
  assert.equal(vague.kind, "clarify");
  assert.deepEqual(vague.clarifyOptions, ["Giao thông", "Hải quan"]);
});

test("hoi thoai: luu lich su, tra loi lai chi tiet, xoa; nguoi khac khong xem duoc", async () => {
  const owner = await registerAndLogin(app);
  const other = await registerAndLogin(app);

  const first = (await ask(owner.accessToken, { message: "Tháng 7 thời tiết thế nào?" })).body.data;
  await ask(owner.accessToken, {
    conversationId: first.conversation.id,
    message: "Còn tháng 12?",
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
    .send({ countryCode: "KR", message: "Xin chào" });
  assert.equal(anonymous.status, 401);

  const { accessToken } = await registerAndLogin(app);
  const res = await ask(accessToken, { countryCode: "JP", message: "Xin chào" });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
});
