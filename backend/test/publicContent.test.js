import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";

let app;
let Country;
let LegalTopic;
let LegalArticle;

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
  ({ default: Country } = await import("../src/models/Country.js"));
  ({ default: LegalTopic } = await import("../src/models/LegalTopic.js"));
  ({ default: LegalArticle } = await import("../src/models/LegalArticle.js"));
});

after(stopTestDb);
beforeEach(clearTestDb);

const seedKrBasics = async () => {
  await Country.create({ code: "KR", name: "Hàn Quốc", language: "Tiếng Hàn", status: "active" });
  await Country.create({ code: "JP", name: "Nhật Bản", language: "Tiếng Nhật", status: "coming_soon" });
  await LegalTopic.create({ countryCode: "KR", slug: "giao-thong", label: "Giao thông", order: 1 });
};

const validSource = () => [
  { title: "Nguồn gốc", url: "https://example.go.kr", authority: "Bộ Tư pháp Hàn Quốc", kind: "gov", publishedAt: new Date("2024-01-01") },
];

test("GET /api/countries tra ve ca active lan coming_soon, khong bi loi", async () => {
  await seedKrBasics();

  const res = await request(app).get("/api/countries");

  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  const codes = res.body.data.map((c) => c.code);
  assert.ok(codes.includes("KR"));
  assert.ok(codes.includes("JP"));
  const jp = res.body.data.find((c) => c.code === "JP");
  assert.equal(jp.status, "coming_soon");
});

test("GET /api/legal/articles CHI tra ve bai published+isCurrent -- draft/superseded khong duoc lot ra", async () => {
  await seedKrBasics();

  await LegalArticle.create({
    countryCode: "KR", topicSlug: "giao-thong", slug: "bai-published", version: 1, isCurrent: true,
    status: "published", title: "Bài đã xuất bản", summaryVi: "Tóm tắt", sources: validSource(),
    effectiveFrom: new Date("2024-01-01"),
  });
  await LegalArticle.create({
    countryCode: "KR", topicSlug: "giao-thong", slug: "bai-draft", version: 1, isCurrent: true,
    status: "draft", title: "Bài nháp", summaryVi: "Chưa xong",
  });
  await LegalArticle.create({
    countryCode: "KR", topicSlug: "giao-thong", slug: "bai-superseded", version: 1, isCurrent: false,
    status: "superseded", title: "Bài đã thay thế", summaryVi: "Cũ",
  });

  const res = await request(app).get("/api/legal/articles?country=KR");

  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].slug, "bai-published");
  assert.equal(res.body.meta.total, 1);
});

test("GET /api/legal/articles/:country/:slug tra 404 cho bai draft (chua publish)", async () => {
  await seedKrBasics();
  await LegalArticle.create({
    countryCode: "KR", topicSlug: "giao-thong", slug: "bai-draft", version: 1, isCurrent: true,
    status: "draft", title: "Bài nháp", summaryVi: "Chưa xong",
  });

  const res = await request(app).get("/api/legal/articles/KR/bai-draft");

  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, "NOT_FOUND");
});

test("GET /api/legal/articles/:country/:slug tra kem relatedArticles cung topic, toi da 4", async () => {
  await seedKrBasics();
  await LegalArticle.create({
    countryCode: "KR", topicSlug: "giao-thong", slug: "bai-chinh", version: 1, isCurrent: true,
    status: "published", title: "Bài chính", summaryVi: "Tóm tắt", sources: validSource(),
    effectiveFrom: new Date("2024-01-01"),
  });
  for (let i = 0; i < 5; i += 1) {
    await LegalArticle.create({
      countryCode: "KR", topicSlug: "giao-thong", slug: `bai-lien-quan-${i}`, version: 1, isCurrent: true,
      status: "published", title: `Bài liên quan ${i}`, summaryVi: "Tóm tắt", sources: validSource(),
      effectiveFrom: new Date("2024-01-01"),
    });
  }

  const res = await request(app).get("/api/legal/articles/KR/bai-chinh");

  assert.equal(res.status, 200);
  assert.equal(res.body.data.slug, "bai-chinh");
  assert.equal(res.body.data.relatedArticles.length, 4);
});

test("GET /api/legal/search tim khong dau van ra ket qua co dau", async () => {
  await seedKrBasics();
  await LegalArticle.create({
    countryCode: "KR", topicSlug: "giao-thong", slug: "phat-vape", version: 1, isCurrent: true,
    status: "published", title: "Mức phạt vi phạm hút thuốc lá điện tử (vape)", summaryVi: "Bị phạt khi hút vape nơi công cộng",
    sources: validSource(), effectiveFrom: new Date("2024-01-01"),
  });

  const res = await request(app).get("/api/legal/search").query({ q: "phat vape", country: "KR" });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].slug, "phat-vape");
});

test("GET /api/legal/search khong tra ve bai draft du khop tu khoa", async () => {
  await seedKrBasics();
  await LegalArticle.create({
    countryCode: "KR", topicSlug: "giao-thong", slug: "bai-draft-vape", version: 1, isCurrent: true,
    status: "draft", title: "Vape nháp chưa publish", summaryVi: "chưa xong",
  });

  const res = await request(app).get("/api/legal/search").query({ q: "vape", country: "KR" });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 0);
});
