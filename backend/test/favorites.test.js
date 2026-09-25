import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";
import { registerAndLogin } from "./helpers.js";

let app;
let LegalArticle;
let SupportLocation;

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
  ({ default: LegalArticle } = await import("../src/models/LegalArticle.js"));
  ({ default: SupportLocation } = await import("../src/models/SupportLocation.js"));
});

after(stopTestDb);
beforeEach(clearTestDb);

const auth = (token) => `Bearer ${token}`;

async function createArticle(overrides = {}) {
  return LegalArticle.create({
    countryCode: "KR",
    topicSlug: "giao-thong",
    slug: "vuot-den-do",
    version: 1,
    isCurrent: true,
    status: "published",
    title: "Vượt đèn đỏ",
    summaryVi: "Tóm tắt",
    sources: [{ title: "Nguồn", url: "https://gov.kr", authority: "Bộ GTVT", kind: "gov" }],
    ...overrides,
  });
}

test("Tao/xoa/danh sach favorite loai article, rieng tung user", async () => {
  const article = await createArticle();
  const userA = await registerAndLogin(app, { role: "user" });
  const userB = await registerAndLogin(app, { role: "user" });

  const createRes = await request(app)
    .post("/api/users/favorites")
    .set("Authorization", auth(userA.accessToken))
    .send({ targetType: "article", targetId: String(article._id) });
  assert.equal(createRes.status, 201);

  const listA = await request(app).get("/api/users/favorites").set("Authorization", auth(userA.accessToken));
  assert.equal(listA.body.data.length, 1);
  assert.equal(listA.body.data[0].article.slug, "vuot-den-do");
  assert.equal(listA.body.data[0].isOutdated, false);

  const listB = await request(app).get("/api/users/favorites").set("Authorization", auth(userB.accessToken));
  assert.equal(listB.body.data.length, 0, "favorite khong duoc chia se giua 2 user");

  const removeRes = await request(app)
    .delete(`/api/users/favorites/article/${article._id}`)
    .set("Authorization", auth(userA.accessToken));
  assert.equal(removeRes.status, 200);

  const listAfter = await request(app).get("/api/users/favorites").set("Authorization", auth(userA.accessToken));
  assert.equal(listAfter.body.data.length, 0);
});

test("Favorite bai da bi thay the (superseded) van tra ve, kem co isOutdated + currentArticleId", async () => {
  const oldArticle = await createArticle({ version: 1, isCurrent: false, status: "superseded" });
  const newArticle = await createArticle({ version: 2, isCurrent: true, status: "published" });

  const { accessToken } = await registerAndLogin(app, { role: "user" });
  await request(app)
    .post("/api/users/favorites")
    .set("Authorization", auth(accessToken))
    .send({ targetType: "article", targetId: String(oldArticle._id) });

  const res = await request(app).get("/api/users/favorites").set("Authorization", auth(accessToken));
  assert.equal(res.body.data[0].isOutdated, true);
  assert.equal(res.body.data[0].currentArticleId, String(newArticle._id));
});

test("Favorite loai location tra ve kem thong tin dia diem", async () => {
  const location = await SupportLocation.create({
    countryCode: "KR",
    type: "embassy",
    name: "Đại sứ quán Việt Nam",
    address: "Seoul",
    phone: "+82234181400",
    location: { type: "Point", coordinates: [127.0016, 37.5407] },
  });
  const { accessToken } = await registerAndLogin(app, { role: "user" });

  await request(app)
    .post("/api/users/favorites")
    .set("Authorization", auth(accessToken))
    .send({ targetType: "location", targetId: String(location._id) });

  const res = await request(app).get("/api/users/favorites").set("Authorization", auth(accessToken));
  assert.equal(res.body.data[0].targetType, "location");
  assert.equal(res.body.data[0].location.name, "Đại sứ quán Việt Nam");
});

test("Luu trung 1 muc khong loi, khong tao 2 ban ghi", async () => {
  const article = await createArticle();
  const { accessToken } = await registerAndLogin(app, { role: "user" });
  const body = { targetType: "article", targetId: String(article._id) };

  const first = await request(app).post("/api/users/favorites").set("Authorization", auth(accessToken)).send(body);
  const second = await request(app).post("/api/users/favorites").set("Authorization", auth(accessToken)).send(body);
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);

  const list = await request(app).get("/api/users/favorites").set("Authorization", auth(accessToken));
  assert.equal(list.body.data.length, 1);
});

test("Luu ID khong ton tai bi NOT_FOUND", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "user" });
  const res = await request(app)
    .post("/api/users/favorites")
    .set("Authorization", auth(accessToken))
    .send({ targetType: "article", targetId: "000000000000000000000000" });
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, "NOT_FOUND");
});

test("chua dang nhap goi /api/users/favorites bi 401 UNAUTHORIZED", async () => {
  const res = await request(app).get("/api/users/favorites");
  assert.equal(res.status, 401);
});
