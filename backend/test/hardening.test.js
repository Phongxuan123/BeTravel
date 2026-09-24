import crypto from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { z } from "zod";
import express from "express";
import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";
import PasswordReset from "../src/models/PasswordReset.js";
import { verifyPasswordResetOtp, resetPassword } from "../src/services/passwordReset.service.js";
import User from "../src/models/User.js";
import Country from "../src/models/Country.js";
import LegalArticle from "../src/models/LegalArticle.js";
import LegalChunk from "../src/models/LegalChunk.js";
import AiQuota from "../src/models/AiQuota.js";
import AiCache from "../src/models/AiCache.js";
import Job from "../src/models/Job.js";
import RefreshToken from "../src/models/RefreshToken.js";
import { env } from "../src/core/env.js";
import { validateQuery } from "../src/middleware/validate.middleware.js";
import { checkAndIncrementQuota } from "../src/services/aiUsage.service.js";
import { issueRefreshToken, refreshAccessToken } from "../src/services/refreshToken.service.js";
import { registerJobHandler, runNextJob } from "../src/services/job.service.js";
import { updateArticle } from "../src/services/legalArticle.service.js";
import { createSession, sendMessage } from "../src/services/chat.service.js";
import { retrieve } from "../src/rag/retrieval.js";
import { __setSearchDriverForTest } from "../src/rag/search/index.js";
import { __setLlmProviderForTest } from "../src/rag/llm/index.js";
import { __setEmbeddingProviderForTest } from "../src/rag/embedding/index.js";
import { createMockEmbeddingProvider } from "../src/rag/embedding/mock.embedding.js";
import { purgeChunksHandler } from "../src/rag/jobs/purgeChunks.job.js";
import { reindexArticleHandler } from "../src/rag/jobs/reindexArticle.job.js";
import { generateAccessToken } from "../src/utils/token.js";
import app from "../src/app.js";

const today = () => new Date().toISOString().slice(0, 10);
const createUser = () =>
  User.create({
    username: "audit_user",
    fullName: "Audit User",
    email: "audit@example.test",
    password: "unused",
    role: "admin",
  });

test.before(startTestDb);
test.after(stopTestDb);
test.beforeEach(async () => {
  await clearTestDb();
  __setEmbeddingProviderForTest(createMockEmbeddingProvider({ dims: 768 }));
});

test("Express query giữ coerce, default, transform và loại field lạ", async () => {
  const probe = express();
  probe.get(
    "/",
    validateQuery(
      z.object({ limit: z.coerce.number().default(10), country: z.string().toUpperCase() }),
    ),
    (req, res) => res.json({ ...req.query, numeric: typeof req.query.limit === "number" }),
  );
  const res = await request(probe).get("/?country=kr&unknown=hidden");
  assert.deepEqual(res.body, { limit: 10, country: "KR", numeric: true });
});

test("quota user đồng thời chỉ cấp đúng số lượt còn lại", async () => {
  const user = await createUser();
  await User.updateOne(
    { _id: user._id },
    { $set: { aiUsage: { date: today(), count: env.AI_DAILY_QUOTA_USER - 1 } } },
  );
  const results = await Promise.allSettled(
    Array.from({ length: 8 }, () => checkAndIncrementQuota(user._id)),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await User.findById(user._id)).aiUsage.count, env.AI_DAILY_QUOTA_USER);
  assert.equal((await AiQuota.findById(today())).count, 1);
});

test("quota global đồng thời không vượt trần", async () => {
  const user = await createUser();
  await AiQuota.create({
    _id: today(),
    count: env.AI_DAILY_QUOTA_GLOBAL - 1,
    expiresAt: new Date(Date.now() + 86400000),
  });
  const results = await Promise.allSettled(
    Array.from({ length: 8 }, () => checkAndIncrementQuota(user._id)),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await AiQuota.findById(today())).count, env.AI_DAILY_QUOTA_GLOBAL);
});

test("refresh đồng thời chỉ tạo một token con còn hiệu lực", async () => {
  const user = await createUser();
  const { rawRefreshToken } = await issueRefreshToken({ user, ttlDays: 1 });
  const results = await Promise.all(
    Array.from({ length: 6 }, () => refreshAccessToken(rawRefreshToken)),
  );
  assert.equal(results.filter((result) => result.rotated).length, 1);
  assert.equal(await RefreshToken.countDocuments({ revokedAt: null }), 1);
});

test("worker lấy lại job running bị gián đoạn và không chạy trùng", async () => {
  let calls = 0;
  registerJobHandler("audit", async () => {
    calls += 1;
  });
  const job = await Job.create({
    name: "audit",
    status: "running",
    lockedAt: new Date(0),
    attempts: 1,
  });
  await Promise.all([runNextJob(), runNextJob()]);
  assert.equal(calls, 1);
  assert.equal((await Job.findById(job._id)).status, "done");
});

test("job không có handler không được báo done", async () => {
  const job = await Job.create({ name: "missing-handler", maxAttempts: 1 });
  await runNextJob();
  assert.equal((await Job.findById(job._id)).status, "failed");
});

test("job running hết lượt chuyển failed", async () => {
  const job = await Job.create({
    name: "audit",
    status: "running",
    lockedAt: new Date(0),
    attempts: 3,
  });
  await runNextJob();
  assert.equal((await Job.findById(job._id)).status, "failed");
});

async function seedEvidence() {
  await Country.create({ code: "KR", name: "Hàn Quốc", status: "active" });
  const article = await LegalArticle.create({
    countryCode: "KR",
    topicSlug: "test",
    slug: "test",
    title: "Nguồn test",
    status: "published",
    bodyMd: "Nội dung kiểm thử",
    isCurrent: true,
  });
  const chunks = await LegalChunk.create(
    [0, 1].map((order) => ({
      articleId: article._id,
      articleSlug: article.slug,
      articleVersion: 1,
      countryCode: "KR",
      topicSlug: "test",
      status: "published",
      text: `Hướng dẫn kiểm thử ${order}`,
      textNorm: `huong dan ${order}`,
      order,
      embeddingModel: "mock",
    })),
  );
  const hits = chunks.map((chunk) => ({
    ...chunk.toObject(),
    _id: String(chunk._id),
    articleId: String(article._id),
    score: 1,
  }));
  __setSearchDriverForTest({ vectorSearch: async () => hits, keywordSearch: async () => hits });
  return { article, chunks };
}

test("focusArticle không đưa chunk quốc gia khác vào câu trả lời", async () => {
  await seedEvidence();
  const other = await LegalArticle.create({
    countryCode: "JP",
    topicSlug: "test",
    slug: "other",
    title: "Other",
    status: "published",
  });
  await LegalChunk.create({
    articleId: other._id,
    articleSlug: "other",
    articleVersion: 1,
    countryCode: "JP",
    topicSlug: "test",
    status: "published",
    text: "Other country",
    textNorm: "other country",
    order: 0,
    embeddingModel: "mock",
  });
  const result = await retrieve({
    question: "test",
    countryCode: "KR",
    focusArticleId: String(other._id),
  });
  assert.ok(result.passed);
  assert.ok(result.chunks.every((chunk) => chunk.articleId !== String(other._id)));
});

test("chunk cũ của draft/superseded không lọt RAG", async () => {
  const { article } = await seedEvidence();
  for (const status of ["draft", "superseded", "archived"]) {
    await LegalArticle.updateOne({ _id: article._id }, { $set: { status } });
    const result = await retrieve({ question: "test", countryCode: "KR" });
    assert.equal(result.passed, false);
  }
});

test("cache hết hạn không dùng lại; giữ metadata AI và chunkId thật", async () => {
  const { chunks } = await seedEvidence();
  const user = await createUser();
  let calls = 0;
  __setLlmProviderForTest({
    model: "test",
    complete: async () => {
      calls += 1;
      return JSON.stringify({
        answer: "Hướng dẫn tham khảo [S1].",
        usedSources: ["S1"],
        confidence: "high",
        needsOfficialHelp: true,
      });
    },
  });
  const session = await createSession(user._id, "KR");
  const input = { userId: user._id, sessionId: session._id, question: "test" };
  const first = await sendMessage(input);
  assert.equal(first.message.needsOfficialHelp, true);
  assert.equal(first.message.confidence, "high");
  assert.deepEqual(
    first.message.retrieval.chunkIds.map(String).sort(),
    chunks.map((c) => String(c._id)).sort(),
  );
  await sendMessage(input);
  assert.equal(calls, 1);
  await AiCache.updateMany({}, { $set: { expiresAt: new Date(0) } });
  await sendMessage(input);
  assert.equal(calls, 2);
});

test("lỗi embedding trở thành fallback và vẫn lưu assistant message", async () => {
  await seedEvidence();
  const user = await createUser();
  __setEmbeddingProviderForTest({
    model: "broken",
    embedBatch: async () => {
      throw new Error("upstream");
    },
  });
  const session = await createSession(user._id, "KR");
  const { message } = await sendMessage({
    userId: user._id,
    sessionId: session._id,
    question: "test",
  });
  assert.equal(message.fallbackReason, "PROVIDER_ERROR");
});

test("bài đã publish không sửa trực tiếp; hai bản sửa nháp chỉ một bản thắng", async () => {
  const { article } = await seedEvidence();
  await assert.rejects(
    updateArticle(article._id, { title: "changed", updatedAt: article.updatedAt }, null),
    /phiên bản nháp/,
  );
  await LegalArticle.updateOne(
    { _id: article._id },
    { $set: { status: "draft", updatedAt: new Date(0) } },
    { timestamps: false },
  );
  const results = await Promise.allSettled(
    ["A", "B"].map((title) => updateArticle(article._id, { title, updatedAt: new Date(0) }, null)),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
});

test("purge cũ không xóa chunk của bài đã publish lại; draft không được index", async () => {
  const { article, chunks } = await seedEvidence();
  await purgeChunksHandler({ articleId: article._id });
  assert.equal(await LegalChunk.countDocuments({ articleId: article._id }), chunks.length);
  await LegalArticle.updateOne({ _id: article._id }, { $set: { status: "draft" } });
  let calls = 0;
  __setEmbeddingProviderForTest({
    model: "test",
    embedBatch: async () => {
      calls++;
      return [];
    },
  });
  await reindexArticleHandler({ articleId: article._id });
  assert.equal(calls, 0);
});

test("API trả lỗi 400 cho ID và JSON không hợp lệ", async () => {
  const user = await createUser();
  const res = await request(app)
    .get("/api/admin/locations/not-an-id")
    .set("Authorization", `Bearer ${generateAccessToken(user)}`);
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
  const json = await request(app)
    .post("/api/auth/login")
    .set("Content-Type", "application/json")
    .send("{broken");
  assert.equal(json.status, 400);
});

test("JWT cũ không giữ quyền admin hoặc truy cập sau khi tài khoản bị khóa", async () => {
  const user = await createUser();
  const token = generateAccessToken(user);
  await User.updateOne({ _id: user._id }, { $set: { role: "user" } });
  const downgraded = await request(app)
    .get("/api/admin/dashboard")
    .set("Authorization", `Bearer ${token}`);
  assert.equal(downgraded.status, 403);
  await User.updateOne({ _id: user._id }, { $set: { isActive: false } });
  const disabled = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
  assert.equal(disabled.status, 403);
});

test("OTP đúng chỉ cấp một reset token khi xác minh đồng thời", async () => {
  const user = await createUser();
  await PasswordReset.create({
    userId: user._id,
    email: user.email,
    otpHash: crypto.createHash("sha256").update("123456").digest("hex"),
    otpExpiresAt: new Date(Date.now() + 60000),
    expiresAt: new Date(Date.now() + 120000),
  });
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, () => verifyPasswordResetOtp({ email: user.email, otp: "123456" })),
  );
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
});

test("reset mật khẩu không kích hoạt lại tài khoản bị khóa", async () => {
  const user = await createUser();
  await User.updateOne({ _id: user._id }, { $set: { isActive: false } });
  await PasswordReset.create({
    userId: user._id,
    email: user.email,
    otpHash: "unused",
    otpExpiresAt: new Date(Date.now() + 60000),
    expiresAt: new Date(Date.now() + 120000),
    verified: true,
    resetTokenHash: crypto.createHash("sha256").update("reset-token").digest("hex"),
    resetTokenExpiresAt: new Date(Date.now() + 60000),
  });
  await assert.rejects(
    resetPassword({ resetToken: "reset-token", password: "Changed123" }),
    /ACCOUNT_NOT_ACTIVE/,
  );
  assert.equal((await User.findById(user._id)).isActive, false);
});

test("bulk import bỏ từng dòng sai; PATCH không xóa hết thông tin liên hệ", async () => {
  const user = await createUser();
  const token = generateAccessToken(user);
  const valid = {
    countryCode: "KR",
    type: "hospital",
    name: "Test",
    address: "Test",
    phone: "123",
    location: { type: "Point", coordinates: [127, 37] },
  };
  const res = await request(app)
    .post("/api/admin/locations/bulk-import")
    .set("Authorization", `Bearer ${token}`)
    .send({
      rows: [valid, { ...valid, location: { type: "Point", coordinates: [999, 999] } }, null],
    });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.createdCount, 1);
  assert.equal(res.body.data.skipped.length, 2);
  const updated = await request(app)
    .patch(`/api/admin/locations/${res.body.data.createdIds[0]}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ phone: "", website: "" });
  assert.equal(updated.status, 400);
});
