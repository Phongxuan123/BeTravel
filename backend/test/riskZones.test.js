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

// Tam Melbourne CBD that: [lng, lat] -- so gia se khong bat duoc loi dao toa do.
const MELBOURNE = [144.9631, -37.8136];
const zone = {
  countryCode: "AU",
  category: "theft",
  name: "Melbourne CBD",
  description: "Mô tả thử",
  center: { type: "Point", coordinates: MELBOURNE },
  radiusM: 2000,
  reviewNote: "ghi chu noi bo",
  source: { name: "CSA", url: "https://example.org/csa", period: "2025" },
};
const auth = (token) => `Bearer ${token}`;
const create = (token, body) =>
  request(app).post("/api/admin/risk-zones").set("Authorization", auth(token)).send(body);

test("API cong khai chi tra vung published va khong lo reviewNote", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  await create(accessToken, { ...zone, status: "published" });
  await create(accessToken, { ...zone, name: "Ban nhap", status: "draft" });

  const res = await request(app).get("/api/risk-zones?country=AU");
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].name, "Melbourne CBD");
  assert.equal(res.body.data[0].center.coordinates[0], MELBOURNE[0]);
  assert.equal("reviewNote" in res.body.data[0], false);
});

test("Khong publish duoc vung thieu nguon (create va patch)", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  const noSource = { ...zone, source: undefined };

  const rejected = await create(accessToken, { ...noSource, status: "published" });
  assert.equal(rejected.status, 400);
  assert.equal(rejected.body.error.code, "VALIDATION_ERROR");

  const draft = await create(accessToken, { ...noSource, status: "draft" });
  assert.equal(draft.status, 201);
  const patched = await request(app)
    .patch(`/api/admin/risk-zones/${draft.body.data._id}`)
    .set("Authorization", auth(accessToken))
    .send({ status: "published" });
  assert.equal(patched.status, 400);
});

test("Vung khoanh bang da giac: nhan polygon hop le, tu choi vong khong khep kin hoac thieu ca area lan radiusM", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });
  const ring = [
    [144.95, -37.82],
    [144.97, -37.82],
    [144.97, -37.81],
    [144.95, -37.82],
  ];
  const { radiusM: _radiusM, ...noRadius } = zone;

  const okRes = await create(accessToken, {
    ...noRadius,
    area: { type: "Polygon", coordinates: [ring] },
  });
  assert.equal(okRes.status, 201);
  assert.deepEqual(okRes.body.data.area.coordinates[0][0], [144.95, -37.82]);

  const open = await create(accessToken, {
    ...noRadius,
    area: { coordinates: [ring.slice(0, 3)] },
  });
  assert.equal(open.status, 400);
  const neither = await create(accessToken, noRadius);
  assert.equal(neither.status, 400);
});

test("Nguoi dung thuong khong goi duoc /api/admin/risk-zones", async () => {
  const { accessToken } = await registerAndLogin(app);
  const res = await create(accessToken, zone);
  assert.equal(res.status, 403);
});
