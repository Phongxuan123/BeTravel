import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";
import { registerAndLogin } from "./helpers.js";

/*
 * Dot QA-2 (docs/07_QA_BugHunt.md, M05-M07): noi dung cong khai, RAG/guard/
 * quota/cache, chat/feedback. Moi test ghi ma INV/H tuong ung de doi chieu
 * voi docs/QA_REPORT.md. Chi dung provider mock + memory driver.
 */

let app;
let m;
let chat;
let guard;
let chunkArticle;
let retrieve;
let llmIndex;
let embeddingIndex;
let memoryDriver;
let mockEmbedding;
let mockLlm;

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
  m = {
    Country: (await import("../src/models/Country.js")).default,
    LegalTopic: (await import("../src/models/LegalTopic.js")).default,
    LegalArticle: (await import("../src/models/LegalArticle.js")).default,
    LegalChunk: (await import("../src/models/LegalChunk.js")).default,
    ChatSession: (await import("../src/models/ChatSession.js")).default,
    ChatMessage: (await import("../src/models/ChatMessage.js")).default,
    AiEvent: (await import("../src/models/AiEvent.js")).default,
    User: (await import("../src/models/User.js")).default,
  };
  chat = await import("../src/services/chat.service.js");
  guard = await import("../src/rag/guard.js");
  ({ chunkArticle } = await import("../src/rag/chunking.js"));
  ({ retrieve } = await import("../src/rag/retrieval.js"));
  llmIndex = await import("../src/rag/llm/index.js");
  embeddingIndex = await import("../src/rag/embedding/index.js");
  memoryDriver = await import("../src/rag/search/memory.driver.js");
  mockEmbedding = await import("../src/rag/embedding/mock.embedding.js");
  mockLlm = await import("../src/rag/llm/mock.llm.js");
});

after(stopTestDb);

let llmCalls;
beforeEach(async () => {
  await clearTestDb();
  embeddingIndex.__setEmbeddingProviderForTest(
    mockEmbedding.createMockEmbeddingProvider({ dims: 768 }),
  );
  // Dem so lan goi LLM de chung minh nguong chan TRUOC khi goi LLM (INV-06.3).
  const inner = mockLlm.createMockLlmProvider();
  llmCalls = 0;
  llmIndex.__setLlmProviderForTest({
    ...inner,
    complete: async (input) => {
      llmCalls += 1;
      return inner.complete(input);
    },
  });
  memoryDriver.invalidateMemorySearchCache();
});

const SOURCE = [
  {
    title: "Nguon kiem thu",
    url: "https://example.org/nguon",
    authority: "Co quan kiem thu",
    kind: "gov",
    publishedAt: new Date("2024-01-01"),
  },
];

const createArticle = (overrides = {}) =>
  m.LegalArticle.create({
    countryCode: "KR",
    topicSlug: "giao-thong",
    slug: "vuot-den-do",
    version: 1,
    isCurrent: true,
    status: "published",
    title: "Vượt đèn đỏ khi lái xe",
    summaryVi: "Mức phạt khi vượt đèn đỏ tại Hàn Quốc",
    bodyMd:
      "## Quy định\nNgười lái xe vượt đèn đỏ bị xử phạt hành chính theo luật giao thông " +
      "đường bộ. Người điều khiển xe phải dừng trước vạch khi đèn đỏ bật sáng.",
    penalties: [{ behavior: "Vượt đèn đỏ", amountText: "70.000 won" }],
    sources: SOURCE,
    effectiveFrom: new Date("2024-01-01"),
    ...overrides,
  });

// Chunk + embedding that bang mock provider -- cung duong ma reindex job dung.
const indexArticle = async (article, { embeddingModel } = {}) => {
  const provider = embeddingIndex.getEmbeddingProvider();
  const pieces = chunkArticle(article.toObject(), { countryName: "Hàn Quốc" });
  const vectors = await provider.embedBatch(pieces.map((p) => p.textForEmbedding));
  await m.LegalChunk.insertMany(
    pieces.map((p, index) => ({
      articleId: article._id,
      articleSlug: article.slug,
      articleVersion: article.version,
      countryCode: article.countryCode,
      topicSlug: article.topicSlug,
      status: "published",
      heading: p.heading,
      order: p.order,
      text: p.text,
      textNorm: p.textNorm,
      embedding: vectors[index],
      embeddingModel: embeddingModel ?? provider.model,
      kind: p.kind,
    })),
  );
  memoryDriver.invalidateMemorySearchCache();
};

const seedCountries = async () => {
  await m.Country.create({ code: "KR", name: "Hàn Quốc", status: "active" });
  await m.Country.create({ code: "JP", name: "Nhật Bản", status: "coming_soon" });
  await m.LegalTopic.create({ countryCode: "KR", slug: "giao-thong", label: "Giao thông" });
};

const createUser = (suffix = "a") =>
  m.User.create({
    username: `qa2_${suffix}`,
    fullName: "QA Hai",
    email: `qa2_${suffix}@example.test`,
    password: "khong-dung-toi",
    role: "user",
  });

const ask = async (user, question, extra = {}) => {
  const session = await chat.createSession(user._id, "KR");
  const { message } = await chat.sendMessage({
    userId: user._id,
    sessionId: session._id,
    question,
    ...extra,
  });
  return { session, message };
};

// ── M05: API noi dung cong khai ──────────────────────────────────────────

test("INV-05.1 5 trang thai bi chan khong lot qua list/detail/search/dem so bai", async () => {
  await seedCountries();
  await createArticle({ slug: "cong-khai", title: "Vape công khai" });
  const blocked = [
    { slug: "ban-nhap", status: "draft" },
    { slug: "cho-duyet", status: "pending_review" },
    { slug: "luu-tru", status: "archived" },
    { slug: "bi-thay", status: "superseded", isCurrent: false },
    { slug: "published-cu", status: "published", isCurrent: false },
  ];
  for (const b of blocked) await createArticle({ ...b, title: `Vape ${b.slug}` });

  const list = await request(app).get("/api/legal/articles?country=KR");
  assert.deepEqual(
    list.body.data.map((a) => a.slug),
    ["cong-khai"],
  );
  assert.equal(list.body.meta.total, 1);

  const search = await request(app).get("/api/legal/search").query({ q: "vape", country: "KR" });
  assert.deepEqual(
    search.body.data.map((a) => a.slug),
    ["cong-khai"],
  );

  for (const b of blocked) {
    const detail = await request(app).get(`/api/legal/articles/KR/${b.slug}`);
    assert.equal(detail.status, 404, b.slug);
  }

  const detail = await request(app).get("/api/legal/articles/KR/cong-khai");
  assert.deepEqual(detail.body.data.relatedArticles, []);

  const topics = await request(app).get("/api/legal/topics?country=KR");
  assert.equal(topics.body.data[0].articleCount, 1);
  const countries = await request(app).get("/api/countries");
  assert.equal(countries.body.data.find((c) => c.code === "KR").articleCount, 1);
});

test("INV-05.2 slug co ban superseded tra noi dung ban HIEN HANH, khong tra ban cu", async () => {
  await seedCountries();
  await createArticle({ status: "superseded", isCurrent: false, summaryVi: "Nội dung cũ" });
  await createArticle({ version: 2, summaryVi: "Nội dung mới" });
  const res = await request(app).get("/api/legal/articles/KR/vuot-den-do");
  assert.equal(res.status, 200);
  assert.equal(res.body.data.version, 2);
  assert.equal(res.body.data.summaryVi, "Nội dung mới");
});

test("INV-05.4 quoc gia khong ton tai 404, coming_soon van tra ve", async () => {
  await seedCountries();
  assert.equal((await request(app).get("/api/countries/XX")).status, 404);
  const jp = await request(app).get("/api/countries/jp");
  assert.equal(jp.status, 200);
  assert.equal(jp.body.data.status, "coming_soon");
});

test("INV-05.5 tim khong dau khop chu d/đ o ca hai chieu", async () => {
  await seedCountries();
  await createArticle({ slug: "dai-su-quan", title: "Liên hệ Đại sứ quán khi mất hộ chiếu" });
  for (const q of ["dai su quan", "đại sứ", "DAI SU", "Đai su quan"]) {
    const res = await request(app).get("/api/legal/search").query({ q, country: "KR" });
    assert.deepEqual(
      res.body.data.map((a) => a.slug),
      ["dai-su-quan"],
      q,
    );
  }
});

test("INV-05.5 q rong/qua dai bi 400", async () => {
  for (const q of ["   ", "a".repeat(201)]) {
    const res = await request(app).get("/api/legal/search").query({ q, country: "KR" });
    assert.equal(res.status, 400, `q dai ${q.length}`);
  }
});

test("INV-05.6 ky tu regex trong q khong gay 500, khong khop toan bo", async () => {
  await seedCountries();
  await createArticle();
  for (const q of ["(a+)+$", ".*", "[", "\\", "a|b"]) {
    const res = await request(app).get("/api/legal/search").query({ q, country: "KR" });
    assert.equal(res.status, 200, q);
    assert.equal(res.body.data.length, 0, q);
  }
});

test("INV-05.8 bai cong khai khong lo truong noi bo", async () => {
  await seedCountries();
  const article = await createArticle({ reviewNote: "Ghi chú nội bộ của reviewer" });
  await m.LegalArticle.updateOne(
    { _id: article._id },
    { $set: { "indexState.error": "provider timeout noi bo" } },
  );
  const INTERNAL = [
    "titleNorm",
    "summaryNorm",
    "reviewNote",
    "reviewedBy",
    "indexState",
    "createdBy",
    "updatedBy",
    "__v",
  ];
  const detail = await request(app).get("/api/legal/articles/KR/vuot-den-do");
  const list = await request(app).get("/api/legal/articles?country=KR");
  for (const payload of [detail.body.data, list.body.data[0]]) {
    for (const key of INTERNAL) assert.equal(key in payload, false, key);
  }
});

test("INV-05.9 + H-05.a doi country khong bao gio tra bai nuoc khac; 'kr' thuong van dung", async () => {
  await seedCountries();
  await createArticle();
  await createArticle({ countryCode: "JP", slug: "jp-only", title: "Luật Nhật vape" });
  const lower = await request(app).get("/api/legal/articles?country=kr");
  assert.deepEqual(
    lower.body.data.map((a) => a.slug),
    ["vuot-den-do"],
  );
  assert.equal((await request(app).get("/api/legal/articles/KR/jp-only")).status, 404);
  const search = await request(app).get("/api/legal/search").query({ q: "vape", country: "KR" });
  assert.equal(search.body.data.length, 0);
});

// ── M06: RAG, guard, quota, cache ────────────────────────────────────────

test("INV-06.3 duoi nguong va cau hoi nuoc khac: LLM KHONG duoc goi", async () => {
  await seedCountries();
  await indexArticle(await createArticle());
  const user = await createUser();

  const refused = await ask(user, "Thủ tục nhận nuôi thú cưng như thế nào?");
  assert.equal(refused.message.fallbackReason, "INSUFFICIENT_EVIDENCE");
  const isolated = await ask(user, "Ở Nhật Bản vượt đèn đỏ bị phạt bao nhiêu?");
  assert.equal(isolated.message.citations.length, 0);
  assert.equal(llmCalls, 0);

  const answered = await ask(user, "Vượt đèn đỏ bị phạt bao nhiêu?");
  assert.equal(answered.message.fallbackReason, null);
  assert.equal(llmCalls, 1);
});

test("INV-06.8 LLM tra JSON hong / answer rong / nem loi --> fallback PROVIDER_ERROR, khong 500", async () => {
  await seedCountries();
  await indexArticle(await createArticle());
  const user = await createUser();
  const outputs = [
    async () => "khong phai json",
    async () =>
      JSON.stringify({
        answer: "  ",
        usedSources: [],
        confidence: "high",
        needsOfficialHelp: false,
      }),
    async () => JSON.stringify({ answer: "Thiếu trường [S1]." }),
    async () => {
      throw new Error("timeout");
    },
  ];
  for (const complete of outputs) {
    llmIndex.__setLlmProviderForTest({ model: "broken", complete });
    const { message } = await ask(user, `Vượt đèn đỏ bị phạt bao nhiêu? ${Math.random()}`);
    assert.equal(message.fallbackReason, "PROVIDER_ERROR");
    assert.equal(message.citations.length, 0);
  }
});

test("INV-06.12 bai duoc cap nhat thi cache cu khong duoc tra lai", async () => {
  await seedCountries();
  const article = await createArticle();
  await indexArticle(article);
  const user = await createUser();
  const question = "Vượt đèn đỏ bị phạt bao nhiêu?";

  await ask(user, question);
  await ask(user, question);
  assert.equal(llmCalls, 1, "lan 2 phai lay tu cache");

  await m.LegalArticle.updateOne({ _id: article._id }, { $set: { summaryVi: "Tóm tắt đã sửa" } });
  await ask(user, question);
  assert.equal(llmCalls, 2, "bai doi updatedAt --> khong duoc dung cache cu");
});

test("INV-06.14 request bi tu choi vi validate khong tru quota", async () => {
  await seedCountries();
  const { accessToken, user } = await registerAndLogin(app);
  const session = await request(app)
    .post("/api/chat/sessions")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ countryCode: "KR" });
  const res = await request(app)
    .post(`/api/chat/sessions/${session.body.data._id}/messages`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ question: "a" });
  assert.equal(res.status, 400);
  const stored = await m.User.findById(user.id).lean();
  assert.equal(stored.aiUsage?.count ?? 0, 0);
});

test("INV-06.15 ai_events ghi du truong truy vet", async () => {
  await seedCountries();
  await indexArticle(await createArticle());
  const user = await createUser();
  await ask(user, "Vượt đèn đỏ bị phạt bao nhiêu?");
  const event = await m.AiEvent.findOne().lean();
  for (const key of ["questionHash", "countryCode", "chunkIds", "topScore", "model", "latencyMs"]) {
    assert.ok(event[key] !== undefined && event[key] !== null, key);
  }
  assert.ok(event.chunkIds.length > 0);
  assert.equal(event.fallbackReason, null);
});

test("INV-06.16 chunking: cat >1200 co overlap, gop <200, penalty rieng, dong ngu canh khong vao text", () => {
  const longSentence = "Người nước ngoài phải tuân thủ quy định giao thông đường bộ. ";
  const pieces = chunkArticle(
    {
      countryCode: "KR",
      topicSlug: "giao-thong",
      title: "Bài kiểm thử",
      bodyMd: `## Dài\n${longSentence.repeat(40)}\n## Ngắn một\nNgắn.\n## Ngắn hai\nCũng ngắn.`,
      penalties: [
        { behavior: "A", amountText: "10.000 won" },
        { behavior: "B", amountText: "20.000 won" },
      ],
    },
    { countryName: "Hàn Quốc" },
  );
  const body = pieces.filter((p) => p.kind === "body");
  assert.ok(body.length >= 3, "section dai phai bi cat");
  assert.ok(body.every((p) => p.text.length <= 1200 + longSentence.length));
  const [first, second] = body;
  const tail = first.text.split(". ").slice(-2).join(". ");
  assert.ok(second.text.includes(tail.trim().slice(0, 30)), "phai co overlap");
  const merged = body.at(-1);
  assert.ok(
    merged.text.includes("Ngắn.") && merged.text.includes("Cũng ngắn."),
    "section ngan phai gop",
  );
  assert.equal(pieces.filter((p) => p.kind === "penalty").length, 2);
  for (const p of pieces) {
    assert.equal(p.text.includes("[Quốc gia:"), false);
    assert.ok(p.textForEmbedding.startsWith("[Quốc gia: Hàn Quốc]"));
  }
});

test("INV-06.2 chunk cua bai published nhung KHONG hien hanh khong duoc lam bang chung", async () => {
  // Trang thai nua voi (publish loi giua chung) -- lop phong thu 2 phai kiem
  // CA status LAN isCurrent, khong chi status.
  await seedCountries();
  const article = await createArticle();
  await indexArticle(article);
  await m.LegalArticle.updateOne({ _id: article._id }, { $set: { isCurrent: false } });
  const result = await retrieve({ question: "Vượt đèn đỏ bị phạt bao nhiêu?", countryCode: "KR" });
  assert.equal(result.passed, false);
});

test("INV-06.17 chunk cua embedding model khac khong duoc dung lam bang chung", async () => {
  await seedCountries();
  await indexArticle(await createArticle(), { embeddingModel: "model-cu-da-bo" });
  const result = await retrieve({ question: "Vượt đèn đỏ bị phạt bao nhiêu?", countryCode: "KR" });
  assert.equal(result.passed, false);
});

test("H-06.a pipeline chat THAT goi guard: LLM bia so + marker gia --> GUARD_REJECTED", async () => {
  // Golden test dung MockLlm luon trich dung nguon nen khong bao gio kich hoat
  // guard; test nay chung minh guard nam tren duong di that cua sendMessage.
  await seedCountries();
  await indexArticle(await createArticle());
  llmIndex.__setLlmProviderForTest(mockLlm.createHallucinatingMockLlmProvider());
  const user = await createUser();
  const { message } = await ask(user, "Vượt đèn đỏ bị phạt bao nhiêu?");
  assert.equal(message.fallbackReason, "GUARD_REJECTED");
  assert.equal(message.text, guard.FALLBACK_MESSAGE);
  assert.deepEqual(message.citations, []);
  const event = await m.AiEvent.findOne().lean();
  assert.equal(event.fallbackReason, "GUARD_REJECTED");
});

test("H-06.b guard chan tuyen bo dinh luong khong nguon o cac dinh dang pho bien", () => {
  const retrieved = new Map([["S1", { marker: "S1", text: "Thông tin chung về giao thông." }]]);
  const unsourced = [
    "Bạn sẽ bị phạt ₩3,000,000.",
    "Mức phạt là $500.",
    "Bạn có thể bị phạt tù 1 năm.",
    "Hành vi này bị tù đến 3 năm.",
    "Bạn phải nộp ba triệu won.",
    "Mức phạt 30 triệu won.",
    "Phạt 3.000.000 원.",
    "Bạn có thể bị trục xuất.",
    "Bị cấm nhập cảnh 5 năm.",
  ];
  for (const answer of unsourced) {
    const result = guard.guardAnswer({ answer, usedSources: [] }, retrieved);
    assert.equal(result.fallbackReason, "GUARD_REJECTED", answer);
  }
});

test("H-06.b so tien dang ky hieu dung truoc van phai khop nguon duoc dan", () => {
  const retrieved = new Map([["S1", { marker: "S1", text: "Phạt tối đa 70.000 won." }]]);
  const wrong = guard.guardAnswer(
    { answer: "Phạt ₩3,000,000 [S1].", usedSources: ["S1"] },
    retrieved,
  );
  assert.equal(wrong.fallbackReason, "GUARD_REJECTED");
  const right = guard.guardAnswer({ answer: "Phạt ₩70,000 [S1].", usedSources: ["S1"] }, retrieved);
  assert.equal(right.fallbackReason, null);
});

test("H-06.c so khong phai phap ly khong bi ha cap nham", () => {
  const retrieved = new Map([["S1", { marker: "S1", text: "..." }]]);
  for (const answer of [
    "Hãy gọi 112 để báo cảnh sát.",
    "Tổng đài 1345 hỗ trợ người nước ngoài.",
    "Đại sứ quán mở cửa lúc 9 giờ.",
  ]) {
    const result = guard.guardAnswer({ answer: `${answer} [S1]`, usedSources: ["S1"] }, retrieved);
    assert.equal(result.fallbackReason, null, answer);
  }
});

test("INV-06.7 disclaimer luon co o cau tra loi answered, khong hua 100%", async () => {
  await seedCountries();
  await indexArticle(await createArticle());
  const user = await createUser();
  const { message } = await ask(user, "Vượt đèn đỏ bị phạt bao nhiêu?");
  assert.ok(message.text.includes(guard.DEFAULT_DISCLAIMER));
  assert.doesNotMatch(message.text, /100\s*%/);
});

// ── M07: chat & feedback ─────────────────────────────────────────────────

test("INV-07.1 user B khong doc/sua/xoa/gui vao session cua A (404)", async () => {
  await seedCountries();
  const a = await registerAndLogin(app);
  const b = await registerAndLogin(app);
  const as = (token) => ({ Authorization: `Bearer ${token}` });
  const session = await request(app)
    .post("/api/chat/sessions")
    .set(as(a.accessToken))
    .send({ countryCode: "KR" });
  const id = session.body.data._id;
  const message = await m.ChatMessage.create({ sessionId: id, role: "assistant", text: "A" });

  const attempts = [
    request(app).get(`/api/chat/sessions/${id}/messages`),
    request(app).post(`/api/chat/sessions/${id}/messages`).send({ question: "Câu hỏi của B" }),
    request(app).patch(`/api/chat/sessions/${id}`).send({ title: "B doi ten" }),
    request(app).delete(`/api/chat/sessions/${id}`),
    request(app)
      .post(`/api/chat/sessions/${id}/messages/${message._id}/feedback`)
      .send({ feedback: "down" }),
  ];
  for (const attempt of attempts) {
    const res = await attempt.set(as(b.accessToken));
    assert.equal(res.status, 404, `${res.req.method} ${res.req.path}`);
  }
  const listB = await request(app).get("/api/chat/sessions").set(as(b.accessToken));
  assert.equal(listB.body.data.length, 0);
  const intact = await m.ChatSession.findById(id).lean();
  assert.notEqual(intact.title, "B doi ten");
  assert.equal(await m.ChatMessage.countDocuments({ sessionId: id }), 1);
  assert.equal((await m.User.findById(b.user.id).lean()).aiUsage?.count ?? 0, 0);
});

test("INV-07.2 xoa session xoa luon message", async () => {
  await seedCountries();
  const user = await createUser();
  const session = await chat.createSession(user._id, "KR");
  await m.ChatMessage.create({ sessionId: session._id, role: "user", text: "x" });
  await chat.deleteSession(user._id, session._id);
  assert.equal(await m.ChatMessage.countDocuments({ sessionId: session._id }), 0);
});

test("INV-07.5 feedback: note qua 1000 ky tu bi 400", async () => {
  const { accessToken } = await registerAndLogin(app);
  const res = await request(app)
    .post("/api/feedback")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      targetType: "chat_message",
      targetId: "000000000000000000000000",
      rating: "down",
      note: "x".repeat(1001),
    });
  assert.equal(res.status, 400);
});
