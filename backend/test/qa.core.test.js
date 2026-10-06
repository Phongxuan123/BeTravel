import crypto from "node:crypto";
import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";
import { registerAndLogin } from "./helpers.js";

/*
 * Dot QA-1 (docs/07_QA_BugHunt.md, M01-M04): test cho cac bat bien CHUA co
 * test chung minh o baseline -- envelope/loi, xac thuc, RBAC, vong doi noi
 * dung. Moi test ghi ma INV tuong ung de doi chieu voi docs/QA_REPORT.md.
 */

let app;
let models;
let articleService;
let passwordResetService;
let httpStatusForCode;
let ErrorCode;

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
  models = {
    User: (await import("../src/models/User.js")).default,
    RefreshToken: (await import("../src/models/RefreshToken.js")).default,
    PasswordReset: (await import("../src/models/PasswordReset.js")).default,
    LegalArticle: (await import("../src/models/LegalArticle.js")).default,
    LegalTopic: (await import("../src/models/LegalTopic.js")).default,
    Country: (await import("../src/models/Country.js")).default,
    Job: (await import("../src/models/Job.js")).default,
  };
  articleService = await import("../src/services/legalArticle.service.js");
  passwordResetService = await import("../src/services/passwordReset.service.js");
  ({ httpStatusForCode, ErrorCode } = await import("../src/core/errors.js"));
});

after(stopTestDb);
beforeEach(clearTestDb);

const auth = (token) => `Bearer ${token}`;
const PASSWORD = "Matkhau123";

const registerBody = (overrides = {}) => ({
  fullName: "Nguoi Kiem Thu",
  email: "qa@example.com",
  phone: "0901234567",
  password: PASSWORD,
  confirmPassword: PASSWORD,
  termsAccepted: true,
  ...overrides,
});

const register = (overrides) =>
  request(app).post("/api/auth/register").send(registerBody(overrides));

const login = (identifier, password = PASSWORD) =>
  request(app).post("/api/auth/login").send({ identifier, password, rememberMe: true });

// Duyet de quy moi key trong response -- password/passwordHash khong duoc xuat
// hien o BAT KY tang long nhau nao, khong chi o data.user.
const collectKeys = (value, keys = new Set()) => {
  if (Array.isArray(value)) value.forEach((item) => collectKeys(item, keys));
  else if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      keys.add(key);
      collectKeys(nested, keys);
    }
  }
  return keys;
};

const VALID_SOURCE = {
  title: "Nguon kiem thu",
  url: "https://example.org/nguon",
  authority: "Co quan kiem thu",
  publishedAt: "2025-01-01",
};

const seedTopic = () =>
  models.LegalTopic.create({ countryCode: "KR", slug: "giao-thong", label: "Giao thong" });

const createArticleDoc = (overrides = {}) =>
  models.LegalArticle.create({
    countryCode: "KR",
    topicSlug: "giao-thong",
    slug: "vuot-den-do",
    title: "Vuot den do",
    summaryVi: "Tom tat kiem thu.",
    effectiveFrom: new Date("2025-01-01"),
    sources: [{ ...VALID_SOURCE, publishedAt: new Date("2025-01-01") }],
    version: 1,
    isCurrent: true,
    status: "draft",
    ...overrides,
  });

// ── M01: envelope, loi, validate ─────────────────────────────────────────

test("INV-01.6 route khong ton tai tra 404 envelope, khong trang HTML", async () => {
  const res = await request(app).get("/api/khong-ton-tai");
  assert.equal(res.status, 404);
  assert.match(res.headers["content-type"], /application\/json/);
  assert.deepEqual(Object.keys(res.body).sort(), ["error", "ok"]);
  assert.equal(res.body.error.code, "NOT_FOUND");
});

test("INV-01.2 moi ErrorCode anh xa dung HTTP status, INSUFFICIENT_EVIDENCE = 200", () => {
  const expected = {
    VALIDATION_ERROR: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    RATE_LIMITED: 429,
    QUOTA_EXCEEDED: 429,
    UPSTREAM_ERROR: 502,
    INSUFFICIENT_EVIDENCE: 200,
    INTERNAL_ERROR: 500,
  };
  assert.deepEqual(Object.keys(ErrorCode).sort(), Object.keys(expected).sort());
  for (const [code, status] of Object.entries(expected)) {
    assert.equal(httpStatusForCode(code), status, code);
  }
});

test("INV-01.8 payload qua 2mb tra loi envelope, khong crash, khong lo stack", async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .set("Content-Type", "application/json")
    .send(JSON.stringify({ identifier: "a", password: "x".repeat(3 * 1024 * 1024) }));
  assert.ok(res.status >= 400 && res.status < 500, `status ${res.status}`);
  assert.equal(res.body.ok, false);
  assert.equal(JSON.stringify(res.body).includes("at "), false);
});

test("INV-01.10 limit qua lon va page=0 bi tu choi 400 thay vi quet ca collection", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  for (const query of ["limit=100000", "page=0", "limit=0"]) {
    const res = await request(app)
      .get(`/api/admin/countries?${query}`)
      .set("Authorization", auth(accessToken));
    assert.equal(res.status, 400, query);
    assert.equal(res.body.error.code, "VALIDATION_ERROR", query);
  }
  const ok = await request(app)
    .get("/api/admin/countries?limit=100&page=2")
    .set("Authorization", auth(accessToken));
  assert.deepEqual(ok.body.meta, { page: 2, limit: 100, total: 0 });
});

test("INV-01.5 trung khoa ngoai users tra 409 voi thong bao dung doi tuong", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  const create = () =>
    request(app)
      .post("/api/admin/countries")
      .set("Authorization", auth(accessToken))
      .send({ code: "KR", name: "Han Quoc" });
  await create();
  const duplicated = await create();
  assert.equal(duplicated.status, 409);
  assert.equal(duplicated.body.error.code, "CONFLICT");
  assert.doesNotMatch(duplicated.body.error.message, /Username|E11000|index/i);
});

test("H-01.c PATCH /auth/me khong cho mass-assign role, isActive, email", async () => {
  await register();
  const { body } = await login("qa@example.com");
  const res = await request(app)
    .patch("/api/auth/me")
    .set("Authorization", auth(body.data.accessToken))
    .send({ fullName: "Ten Moi", role: "admin", isActive: false, email: "evil@example.com" });
  assert.equal(res.status, 200);
  const stored = await models.User.findOne({ fullName: "Ten Moi" }).lean();
  assert.equal(stored.role, "user");
  assert.equal(stored.isActive, true);
  assert.equal(stored.email, "qa@example.com");
});

// ── M02: xac thuc ────────────────────────────────────────────────────────

test("INV-02.1 password khong xuat hien o register/login/me/refresh", async () => {
  const registered = await register();
  const logged = await login("qa@example.com");
  const me = await request(app)
    .get("/api/auth/me")
    .set("Authorization", auth(logged.body.data.accessToken));
  const refreshed = await request(app)
    .post("/api/auth/refresh")
    .send({ refreshToken: logged.body.data.refreshToken });
  for (const res of [registered, logged, me, refreshed]) {
    assert.equal(res.body.ok, true);
    const keys = collectKeys(res.body);
    assert.equal(keys.has("password"), false);
    assert.equal(keys.has("passwordHash"), false);
  }
});

test("INV-02.2 refresh token chi luu hash trong DB, token tho khong nam trong DB", async () => {
  await register();
  const { body } = await login("qa@example.com");
  const raw = body.data.refreshToken;
  const stored = await models.RefreshToken.find().lean();
  assert.equal(stored.length, 1);
  assert.equal(JSON.stringify(stored).includes(raw), false);
  assert.equal(stored[0].tokenHash, crypto.createHash("sha256").update(raw).digest("hex"));
});

test("INV-02.7 logout qua cookie thu hoi family va goi lai van idempotent", async () => {
  await register();
  const { body } = await login("qa@example.com");
  const raw = body.data.refreshToken;
  const viaCookie = await request(app)
    .post("/api/auth/logout")
    .set("Cookie", `refreshToken=${raw}`);
  assert.equal(viaCookie.status, 200);
  const again = await request(app).post("/api/auth/logout").send({ refreshToken: raw });
  assert.equal(again.status, 200);
  const empty = await request(app).post("/api/auth/logout");
  assert.equal(empty.status, 200);
  const refresh = await request(app).post("/api/auth/refresh").send({ refreshToken: raw });
  assert.equal(refresh.status, 401);
});

test("INV-02.8 access token het han, sai chu ky, alg none deu bi 401", async () => {
  await register();
  const user = await models.User.findOne({ email: "qa@example.com" });
  const secret = process.env.JWT_ACCESS_SECRET;
  const payload = { sub: user._id.toString(), role: "admin" };
  const tokens = {
    expired: jwt.sign({ ...payload, exp: Math.floor(Date.now() / 1000) - 60 }, secret),
    wrongSecret: jwt.sign(payload, "khoa-sai-hoan-toan-khac-voi-server"),
    algNone: jwt.sign(payload, null, { algorithm: "none" }),
  };
  for (const [name, token] of Object.entries(tokens)) {
    const res = await request(app).get("/api/auth/me").set("Authorization", auth(token));
    assert.equal(res.status, 401, name);
    assert.equal(res.body.error.code, "UNAUTHORIZED", name);
  }
});

test("INV-02.9 tai khoan bi vo hieu hoa khong refresh duoc va family bi thu hoi", async () => {
  await register();
  const { body } = await login("qa@example.com");
  await models.User.updateOne({ email: "qa@example.com" }, { $set: { isActive: false } });
  const res = await request(app)
    .post("/api/auth/refresh")
    .send({ refreshToken: body.data.refreshToken });
  assert.equal(res.status, 403);
  assert.equal(await models.RefreshToken.countDocuments({ revokedAt: null }), 0);
});

test("INV-02.11 email hoa/thuong va so +84/0 duoc chuan hoa truoc khi kiem trung", async () => {
  await register();
  const upperEmail = await register({ email: "  QA@Example.COM ", phone: "0912345678" });
  assert.equal(upperEmail.status, 409);
  const intlPhone = await register({ email: "khac@example.com", phone: "+84901234567" });
  assert.equal(intlPhone.status, 409);
  const loginUpper = await login("QA@EXAMPLE.COM");
  assert.equal(loginUpper.status, 200);
});

test("INV-02.12 dang nhap sai khong phan biet tai khoan khong ton tai, sai mat khau, bi khoa", async () => {
  await register();
  await register({ email: "locked@example.com", phone: "0912345678" });
  await models.User.updateOne({ email: "locked@example.com" }, { $set: { isActive: false } });

  const unknown = await login("khong-co@example.com", "SaiMatKhau1");
  const wrongPassword = await login("qa@example.com", "SaiMatKhau1");
  const lockedWrongPassword = await login("locked@example.com", "SaiMatKhau1");

  for (const res of [unknown, wrongPassword, lockedWrongPassword]) {
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, "UNAUTHORIZED");
    assert.equal(res.body.error.message, unknown.body.error.message);
  }
  // Dung mat khau thi moi duoc biet tai khoan da bi khoa.
  const lockedRightPassword = await login("locked@example.com");
  assert.equal(lockedRightPassword.status, 403);
});

test("INV-02.13 OTP sai 5 lan thi khoa, ke ca OTP dung sau do", async () => {
  const user = await models.User.create({
    username: "otp_user",
    fullName: "OTP User",
    email: "otp@example.com",
    password: "khong-dung",
  });
  await models.PasswordReset.create({
    userId: user._id,
    email: user.email,
    otpHash: crypto.createHash("sha256").update("123456").digest("hex"),
    otpExpiresAt: new Date(Date.now() + 60_000),
    expiresAt: new Date(Date.now() + 120_000),
  });
  for (let attempt = 0; attempt < 5; attempt++) {
    await assert.rejects(
      passwordResetService.verifyPasswordResetOtp({ email: user.email, otp: "000000" }),
      /RESET_OTP_INVALID/,
    );
  }
  await assert.rejects(
    passwordResetService.verifyPasswordResetOtp({ email: user.email, otp: "123456" }),
    /RESET_OTP_MAX_ATTEMPTS/,
  );
});

test("INV-02.13 forgot-password voi email khong ton tai tra cung dang {sent:true}", async () => {
  // Chi dung email KHONG ton tai: email ton tai se kich hoat gui SMTP that.
  const res = await request(app)
    .post("/api/auth/forgot-password")
    .send({ email: "khong-ton-tai@example.com" });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true, data: { sent: true } });
});

test("H-02.c PATCH /auth/me doi so dien thoai: chuan hoa +84 va kiem trung", async () => {
  await register();
  await register({ email: "b@example.com", phone: "0912345678" });
  const { body } = await login("b@example.com");
  const token = body.data.accessToken;
  const taken = await request(app)
    .patch("/api/auth/me")
    .set("Authorization", auth(token))
    .send({ phone: "+84 901 234 567" });
  assert.equal(taken.status, 409);
  const normalized = await request(app)
    .patch("/api/auth/me")
    .set("Authorization", auth(token))
    .send({ phone: "+84987654321" });
  assert.equal(normalized.status, 200);
  assert.equal(normalized.body.data.user.phone, "0987654321");
});

test("D04 seed khong tao admin voi mat khau mac dinh khi chua khai SEED_ADMIN_PASSWORD", async () => {
  const { ensureSeedAdmin } = await import("../scripts/seed-content.js");
  // Goi truc tiep, khong doc .env cua may dev (co the chua secret that).
  for (const password of [undefined, ""]) {
    assert.equal(await ensureSeedAdmin({ email: "admin@example.com", password }), null);
  }
  assert.equal(await models.User.countDocuments({ email: "admin@example.com" }), 0);
});

// ── M03: RBAC ────────────────────────────────────────────────────────────

test("INV-03.3 admin bi vo hieu hoa mat quyen /api/admin ngay request ke tiep", async () => {
  const { accessToken, user } = await registerAndLogin(app, { role: "admin" });
  const before = await request(app)
    .get("/api/admin/dashboard")
    .set("Authorization", auth(accessToken));
  assert.equal(before.status, 200);
  await models.User.updateOne({ _id: user.id }, { $set: { isActive: false } });
  const afterDisable = await request(app)
    .get("/api/admin/dashboard")
    .set("Authorization", auth(accessToken));
  assert.equal(afterDisable.status, 403);
});

// ── M04: vong doi noi dung phap ly ───────────────────────────────────────

test("INV-04.9 PATCH title/summaryVi cap nhat lai titleNorm/summaryNorm", async () => {
  const article = await createArticleDoc();
  const updated = await articleService.updateArticle(
    article._id,
    { title: "Uống rượu lái xe", summaryVi: "Phạt nặng", updatedAt: article.updatedAt },
    null,
  );
  assert.equal(updated.titleNorm, "uong ruou lai xe");
  assert.equal(updated.summaryNorm, "phat nang");
});

test("INV-04.4 PATCH khong doi duoc slug/countryCode cua mot phien ban", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  const article = await createArticleDoc();
  for (const change of [{ slug: "slug-khac" }, { countryCode: "JP" }]) {
    const res = await request(app)
      .patch(`/api/admin/legal/articles/${article._id}`)
      .set("Authorization", auth(accessToken))
      .send({ ...change, updatedAt: article.updatedAt.toISOString() });
    assert.equal(res.status, 409, JSON.stringify(change));
  }
});

test("INV-04.10 khong xoa duoc Country/Topic con bai luat tham chieu", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  const country = await models.Country.create({ code: "KR", name: "Han Quoc" });
  const topic = await seedTopic();
  await createArticleDoc();

  const deleteTopic = await request(app)
    .delete(`/api/admin/topics/${topic._id}`)
    .set("Authorization", auth(accessToken));
  assert.equal(deleteTopic.status, 409);
  assert.equal(await models.LegalTopic.countDocuments(), 1);

  const deleteCountry = await request(app)
    .delete(`/api/admin/countries/${country._id}`)
    .set("Authorization", auth(accessToken));
  assert.equal(deleteCountry.status, 409);
  assert.equal(await models.Country.countDocuments(), 1);

  // Khong con bai tham chieu thi xoa binh thuong.
  await models.LegalArticle.deleteMany({});
  const freed = await request(app)
    .delete(`/api/admin/topics/${topic._id}`)
    .set("Authorization", auth(accessToken));
  assert.equal(freed.status, 200);
});

test("INV-04.6 roi khoi published enqueue purge_chunks, publish lai enqueue reindex", async () => {
  await seedTopic();
  const article = await createArticleDoc();
  await articleService.changeArticleStatus(article._id, { status: "pending_review" }, null);
  await articleService.changeArticleStatus(article._id, { status: "published" }, null);
  await articleService.changeArticleStatus(article._id, { status: "archived" }, null);
  const jobs = await models.Job.find().sort({ createdAt: 1 }).lean();
  assert.deepEqual(
    jobs.map((job) => job.name),
    ["reindex_article", "purge_chunks"],
  );
});

test("H-04.b publish dong thoi 2 ban nhap cung slug: dung 1 ban hien hanh, khong ban nao lo", async () => {
  // Bao dam duy nhat mot ban hien hanh DUA VAO partial unique index (production
  // tao luc khoi dong qua autoIndex) -- chay le file nay thi index chua kip tao.
  await models.LegalArticle.init();
  await seedTopic();
  await createArticleDoc({ status: "published" });
  const drafts = await Promise.all(
    [2, 3].map((version) =>
      createArticleDoc({
        version,
        status: "pending_review",
        isCurrent: false,
        title: `Ban ${version}`,
      }),
    ),
  );
  await Promise.allSettled(
    drafts.map((draft) =>
      articleService.changeArticleStatus(draft._id, { status: "published" }, null),
    ),
  );
  const current = await models.LegalArticle.find({ slug: "vuot-den-do", isCurrent: true }).lean();
  assert.equal(current.length, 1, "phai con dung 1 ban isCurrent");
  assert.equal(current[0].status, "published");
  const publishedNotCurrent = await models.LegalArticle.countDocuments({
    slug: "vuot-den-do",
    status: "published",
    isCurrent: false,
  });
  assert.equal(publishedNotCurrent, 0, "khong duoc co ban published ma khong hien hanh");
});
