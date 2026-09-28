import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";
import { registerAndLogin } from "./helpers.js";

/*
 * Hoi quy cho cac loi tim ra trong dot viet test toan du an (28/09):
 * - tim kiem khong dau voi chu "đ" (ca du lieu moi lan du lieu cu con "đ")
 * - dang nhap Google voi email co phan truoc "@" ngan hon 3 ky tu
 * - chat tu choi nham khi ten nuoc khac la chuoi con cua tu thuong ("Lào"/"lao động")
 */

let app;
let Country;
let LegalTopic;
let LegalArticle;
let ChatSession;
let authService;
let chatService;

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
  ({ default: Country } = await import("../src/models/Country.js"));
  ({ default: LegalTopic } = await import("../src/models/LegalTopic.js"));
  ({ default: LegalArticle } = await import("../src/models/LegalArticle.js"));
  ({ default: ChatSession } = await import("../src/models/ChatSession.js"));
  authService = await import("../src/services/auth.service.js");
  chatService = await import("../src/services/chat.service.js");
});

after(stopTestDb);
beforeEach(clearTestDb);

const seedKr = async () => {
  await Country.create({ code: "KR", name: "Hàn Quốc", language: "Tiếng Hàn", status: "active" });
  await LegalTopic.create({ countryCode: "KR", slug: "cu-tru", label: "Cư trú", order: 1 });
};

const createPublished = (overrides) =>
  LegalArticle.create({
    countryCode: "KR",
    topicSlug: "cu-tru",
    version: 1,
    isCurrent: true,
    status: "published",
    summaryVi: "Tóm tắt",
    sources: [
      {
        title: "Nguồn",
        url: "https://example.go.kr",
        authority: "Bộ Tư pháp Hàn Quốc",
        kind: "gov",
        publishedAt: new Date("2024-01-01"),
      },
    ],
    effectiveFrom: new Date("2024-01-01"),
    ...overrides,
  });

test("search 'dang ky' khop bai 'Đăng ký' (chu đ duoc chuan hoa thanh d)", async () => {
  await seedKr();
  await createPublished({ slug: "dang-ky-tam-tru", title: "Đăng ký tạm trú cho người nước ngoài" });

  for (const q of ["dang ky", "đăng ký", "ĐĂNG KÝ"]) {
    const res = await request(app).get("/api/legal/search").query({ q, country: "KR" });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1, `q="${q}" phai tim thay bai`);
  }
});

test("search van tim thay bai cu co titleNorm luu 'đ' truoc khi sua chuan hoa", async () => {
  await seedKr();
  const article = await createPublished({ slug: "bai-cu", title: "Đăng ký cư trú" });
  await LegalArticle.collection.updateOne(
    { _id: article._id },
    { $set: { titleNorm: "đang ky cu tru", summaryNorm: "tom tat" } },
  );

  const res = await request(app).get("/api/legal/search").query({ q: "dang ky", country: "KR" });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
});

test("dang nhap Google voi email 'ab@gmail.com' tao duoc tai khoan (username >= 3 ky tu)", async () => {
  const session = await authService.loginWithGoogle({
    googleId: "google-short-prefix",
    email: "ab@gmail.com",
    fullName: "A B",
  });
  assert.ok(session.accessToken);
  assert.ok(session.user.username.length >= 3);

  // Lan thu hai cung email prefix nhung googleId/email khac van khong trung username.
  const other = await authService.loginWithGoogle({
    googleId: "google-short-prefix-2",
    email: "ab@yahoo.com",
    fullName: "A B",
  });
  assert.notEqual(other.user.username, session.user.username);
});

test("chat khong tu choi nham cau hoi 'lao động' khi co quoc gia 'Lào' trong DB", async () => {
  await seedKr();
  await Country.create({ code: "LA", name: "Lào", language: "Tiếng Lào", status: "coming_soon" });
  const { user } = await registerAndLogin(app);
  const session = await ChatSession.create({ userId: user.id, countryCode: "KR" });

  const { message } = await chatService.sendMessage({
    userId: user.id,
    sessionId: session._id,
    question: "Luật lao động ở Hàn Quốc quy định giờ làm thế nào?",
  });
  assert.doesNotMatch(message.text, /Để xem thông tin về Lào/);

  const { message: laosMessage } = await chatService.sendMessage({
    userId: user.id,
    sessionId: session._id,
    question: "Đi Lào có cần visa không?",
  });
  assert.match(laosMessage.text, /Để xem thông tin về Lào/);
});
