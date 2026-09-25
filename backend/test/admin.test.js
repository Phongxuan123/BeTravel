import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";
import { registerAndLogin } from "./helpers.js";

let app;

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
});

after(stopTestDb);
beforeEach(clearTestDb);

const auth = (token) => `Bearer ${token}`;

test("non-admin goi /api/admin/* bi tra ve 403 FORBIDDEN", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "user" });

  const endpoints = [
    ["get", "/api/admin/dashboard"],
    ["get", "/api/admin/countries"],
    ["post", "/api/admin/countries"],
    ["get", "/api/admin/legal/articles"],
    ["get", "/api/admin/locations"],
    ["get", "/api/admin/audit"],
    ["get", "/api/admin/incidents"],
    ["get", "/api/admin/quick-phrases"],
    ["get", "/api/admin/geo-alerts"],
  ];

  for (const [method, path] of endpoints) {
    const res = await request(app)[method](path).set("Authorization", auth(accessToken));
    assert.equal(res.status, 403, `${method.toUpperCase()} ${path} phai tra 403`);
    assert.equal(res.body.error.code, "FORBIDDEN");
  }
});

test("chua dang nhap goi /api/admin/* bi tra ve 401 UNAUTHORIZED", async () => {
  const res = await request(app).get("/api/admin/countries");
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, "UNAUTHORIZED");
});

test("admin CRUD Country hoat dong dung, ghi audit log", async () => {
  const { accessToken, user } = await registerAndLogin(app, { role: "admin" });

  const createRes = await request(app)
    .post("/api/admin/countries")
    .set("Authorization", auth(accessToken))
    .send({ code: "kr", name: "Han Quoc", status: "active" });

  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.data.code, "KR");
  const countryId = createRes.body.data._id;

  const listRes = await request(app)
    .get("/api/admin/countries")
    .set("Authorization", auth(accessToken));
  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.data.length, 1);
  assert.equal(listRes.body.meta.total, 1);

  const updateRes = await request(app)
    .patch(`/api/admin/countries/${countryId}`)
    .set("Authorization", auth(accessToken))
    .send({ name: "Dai Han Dan Quoc" });
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.data.name, "Dai Han Dan Quoc");

  const auditRes = await request(app)
    .get("/api/admin/audit")
    .set("Authorization", auth(accessToken));
  assert.equal(auditRes.status, 200);
  assert.ok(auditRes.body.data.length >= 2, "phai co it nhat 2 dong audit (create + update)");
  assert.equal(auditRes.body.data[0].actorId, user.id);

  const deleteRes = await request(app)
    .delete(`/api/admin/countries/${countryId}`)
    .set("Authorization", auth(accessToken));
  assert.equal(deleteRes.status, 200);
  assert.equal(deleteRes.body.data.deleted, true);
});

// Tao san mot Country + Topic hop le de cac test article dung chung.
const seedCountryAndTopic = async (accessToken) => {
  await request(app)
    .post("/api/admin/countries")
    .set("Authorization", auth(accessToken))
    .send({ code: "KR", name: "Han Quoc", status: "active" });

  await request(app)
    .post("/api/admin/topics")
    .set("Authorization", auth(accessToken))
    .send({ countryCode: "KR", slug: "giao-thong", label: "Giao thong" });
};

test("publish bai luat thieu source bi tu choi voi CONFLICT liet ke field thieu", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  await seedCountryAndTopic(accessToken);

  const createRes = await request(app)
    .post("/api/admin/legal/articles")
    .set("Authorization", auth(accessToken))
    .send({
      countryCode: "KR",
      topicSlug: "giao-thong",
      slug: "quy-dinh-lai-xe",
      title: "Quy dinh lai xe",
    });
  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.data.status, "draft");

  const articleId = createRes.body.data._id;

  const publishRes = await request(app)
    .post(`/api/admin/legal/articles/${articleId}/status`)
    .set("Authorization", auth(accessToken))
    .send({ status: "published" });

  assert.equal(publishRes.status, 409);
  assert.equal(publishRes.body.error.code, "CONFLICT");
  const missingPaths = publishRes.body.error.details.map((d) => d.path);
  assert.ok(missingPaths.includes("sources"));
  assert.ok(missingPaths.includes("summaryVi"));
  assert.ok(missingPaths.includes("effectiveFrom"));
});

test("publish bai luat hop le -> published, isCurrent=true, enqueue reindex_article", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  await seedCountryAndTopic(accessToken);

  const createRes = await request(app)
    .post("/api/admin/legal/articles")
    .set("Authorization", auth(accessToken))
    .send({
      countryCode: "KR",
      topicSlug: "giao-thong",
      slug: "quy-dinh-lai-xe",
      title: "Quy dinh lai xe",
      summaryVi: "Tom tat quy dinh lai xe tai Han Quoc.",
      effectiveFrom: "2025-01-01",
      sources: [
        {
          title: "Luat giao thong Han Quoc",
          url: "https://law.go.kr/example",
          authority: "Bo Giao thong Han Quoc",
          publishedAt: "2025-01-01",
        },
      ],
    });
  const articleId = createRes.body.data._id;

  const publishRes = await request(app)
    .post(`/api/admin/legal/articles/${articleId}/status`)
    .set("Authorization", auth(accessToken))
    .send({ status: "published" });

  assert.equal(publishRes.status, 200);
  assert.equal(publishRes.body.data.status, "published");
  assert.equal(publishRes.body.data.isCurrent, true);

  const Job = (await import("../src/models/Job.js")).default;
  const jobs = await Job.find({ name: "reindex_article" });
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].payload.articleId, articleId);
});

test("publish version 2 -> version 1 tu dong superseded + isCurrent=false", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  await seedCountryAndTopic(accessToken);

  const validPayload = {
    countryCode: "KR",
    topicSlug: "giao-thong",
    slug: "quy-dinh-lai-xe",
    title: "Quy dinh lai xe",
    summaryVi: "Tom tat.",
    effectiveFrom: "2025-01-01",
    sources: [
      {
        title: "Nguon",
        url: "https://law.go.kr/example",
        authority: "Co quan",
        publishedAt: "2025-01-01",
      },
    ],
  };

  const v1Res = await request(app)
    .post("/api/admin/legal/articles")
    .set("Authorization", auth(accessToken))
    .send(validPayload);
  const v1Id = v1Res.body.data._id;

  await request(app)
    .post(`/api/admin/legal/articles/${v1Id}/status`)
    .set("Authorization", auth(accessToken))
    .send({ status: "published" });

  const newVersionRes = await request(app)
    .post(`/api/admin/legal/articles/${v1Id}/new-version`)
    .set("Authorization", auth(accessToken));
  assert.equal(newVersionRes.status, 201);
  assert.equal(newVersionRes.body.data.version, 2);
  assert.equal(newVersionRes.body.data.isCurrent, false);
  assert.equal(newVersionRes.body.data.status, "draft");

  const v2Id = newVersionRes.body.data._id;

  await request(app)
    .patch(`/api/admin/legal/articles/${v2Id}`)
    .set("Authorization", auth(accessToken))
    .send({
      title: "Quy dinh lai xe (ban cap nhat)",
      updatedAt: newVersionRes.body.data.updatedAt,
    });

  const publishV2Res = await request(app)
    .post(`/api/admin/legal/articles/${v2Id}/status`)
    .set("Authorization", auth(accessToken))
    .send({ status: "published" });
  assert.equal(publishV2Res.status, 200);
  assert.equal(publishV2Res.body.data.isCurrent, true);

  const v1AfterRes = await request(app)
    .get(`/api/admin/legal/articles/${v1Id}`)
    .set("Authorization", auth(accessToken));
  assert.equal(v1AfterRes.body.data.status, "superseded");
  assert.equal(v1AfterRes.body.data.isCurrent, false);

  const Job = (await import("../src/models/Job.js")).default;
  const purgeJobs = await Job.find({ name: "purge_chunks", "payload.articleId": v1Id });
  assert.equal(purgeJobs.length, 1);
});

test("hai lan sua cung mot bai voi updatedAt cu -> CONFLICT, khong ghi de", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  await seedCountryAndTopic(accessToken);

  const createRes = await request(app)
    .post("/api/admin/legal/articles")
    .set("Authorization", auth(accessToken))
    .send({
      countryCode: "KR",
      topicSlug: "giao-thong",
      slug: "quy-dinh-lai-xe",
      title: "Quy dinh lai xe",
    });
  const articleId = createRes.body.data._id;
  const staleUpdatedAt = createRes.body.data.updatedAt;

  const firstEditRes = await request(app)
    .patch(`/api/admin/legal/articles/${articleId}`)
    .set("Authorization", auth(accessToken))
    .send({ title: "Sua lan 1", updatedAt: staleUpdatedAt });
  assert.equal(firstEditRes.status, 200);

  // Tab thu hai van dang xem updatedAt CU (chua biet ve lan sua thu nhat).
  const secondEditRes = await request(app)
    .patch(`/api/admin/legal/articles/${articleId}`)
    .set("Authorization", auth(accessToken))
    .send({ title: "Sua lan 2 (ghi de)", updatedAt: staleUpdatedAt });

  assert.equal(secondEditRes.status, 409);
  assert.equal(secondEditRes.body.error.code, "CONFLICT");
});

test("partial unique index chan duoc 2 ban cung (countryCode,slug) cung isCurrent:true", async () => {
  // Kiem tra lop phong thu O TANG DATABASE, khong qua API -- de chac chan
  // rang buoc nam trong chinh index Mongo, khong chi dua vao logic ung dung
  // (logic ung dung co the co bug, index thi khong).
  const LegalArticle = (await import("../src/models/LegalArticle.js")).default;
  await LegalArticle.init(); // dam bao index da duoc tao truoc khi test (mongodb-memory-server tao lazy)

  await LegalArticle.create({
    countryCode: "KR",
    topicSlug: "giao-thong",
    slug: "trung-slug",
    version: 1,
    isCurrent: true,
    status: "draft",
    title: "Ban 1",
  });

  await assert.rejects(
    () =>
      LegalArticle.create({
        countryCode: "KR",
        topicSlug: "giao-thong",
        slug: "trung-slug",
        version: 2,
        isCurrent: true, // TRUNG voi ban tren -- phai bi partial unique index chan
        status: "draft",
        title: "Ban 2",
      }),
    /duplicate key|E11000/,
  );
});

test("admin tao SupportLocation voi GeoJSON [lng, lat]", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });

  const res = await request(app)
    .post("/api/admin/locations")
    .set("Authorization", auth(accessToken))
    .send({
      countryCode: "KR",
      type: "embassy",
      name: "Dai su quan Viet Nam tai Seoul",
      address: "123 Yeongdong-daero, Gangnam-gu, Seoul",
      phone: "+82234181400",
      location: { type: "Point", coordinates: [127.0016, 37.5407] },
      verified: true,
    });

  assert.equal(res.status, 201);
  assert.deepEqual(res.body.data.location.coordinates, [127.0016, 37.5407]);
  assert.ok(res.body.data.verifiedAt);
});

test("GET /api/admin/dashboard tra ve thong ke that", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  await seedCountryAndTopic(accessToken);

  await request(app)
    .post("/api/admin/legal/articles")
    .set("Authorization", auth(accessToken))
    .send({ countryCode: "KR", topicSlug: "giao-thong", slug: "bai-1", title: "Bai 1" });

  const res = await request(app)
    .get("/api/admin/dashboard")
    .set("Authorization", auth(accessToken));

  assert.equal(res.status, 200);
  assert.equal(res.body.data.articlesByStatus.draft, 1);
  assert.equal(res.body.data.countryCount, 1);
});
