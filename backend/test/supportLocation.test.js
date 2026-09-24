import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";
import { registerAndLogin } from "./helpers.js";

let app;
let SupportLocation;

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
  ({ default: SupportLocation } = await import("../src/models/SupportLocation.js"));
  // $geoNear doi hoi index 2dsphere da TON TAI THAT su trong Mongo -- Mongoose
  // xay index nen (autoIndex) khong dong bo voi connect(), nen phai cho xong
  // truoc khi chay test, neu khong se an "requires a 2d or 2dsphere index".
  await SupportLocation.init();
});

after(stopTestDb);
beforeEach(clearTestDb);

const auth = (token) => `Bearer ${token}`;

// Toa do THAT cua Dai su quan Viet Nam tai Seoul (CLAUDE.md prompt B6 muc 1 --
// bat buoc dung toa do that de bat loi dao lat/lng, khong duoc dung so gia).
const EMBASSY_SEOUL = { lat: 37.5385, lng: 126.9715 };
const BUSAN_FAR = { lat: 35.1796, lng: 129.0756 }; // cach Seoul ~320km

test("GET /api/support-locations/nearby dung $geoNear, KHONG dao lat/lng", async () => {
  await SupportLocation.create([
    {
      countryCode: "KR",
      type: "embassy",
      name: "Dai su quan Viet Nam tai Seoul",
      address: "123 Yeongdong-daero, Gangnam-gu, Seoul",
      phone: "+82234181400",
      location: { type: "Point", coordinates: [EMBASSY_SEOUL.lng, EMBASSY_SEOUL.lat] },
      verified: true,
    },
    {
      countryCode: "KR",
      type: "hospital",
      name: "Benh vien o Busan (xa)",
      address: "Busan",
      phone: "0512345678",
      location: { type: "Point", coordinates: [BUSAN_FAR.lng, BUSAN_FAR.lat] },
      verified: true,
    },
  ]);

  const res = await request(app)
    .get("/api/support-locations/nearby")
    .query({ lat: EMBASSY_SEOUL.lat, lng: EMBASSY_SEOUL.lng, country: "KR", radiusKm: 10 });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1, "chi diem trong ban kinh 10km moi duoc tra ve");
  assert.equal(res.body.data[0].name, "Dai su quan Viet Nam tai Seoul");
  assert.ok(res.body.data[0].distanceMeters < 1000, "diem trung toa do phai co distanceMeters rat nho");
});

test("GET /api/support-locations/nearby -- khong co diem trong ban kinh thi tu mo rong ra toan bo quoc gia", async () => {
  await SupportLocation.create({
    countryCode: "KR",
    type: "police",
    name: "Don canh sat o Busan",
    address: "Busan",
    phone: "112",
    location: { type: "Point", coordinates: [BUSAN_FAR.lng, BUSAN_FAR.lat] },
    verified: true,
  });

  // Nguoi dung dang o Seoul, ban kinh 5km -- khong co diem nao trong KR gan Seoul.
  const res = await request(app)
    .get("/api/support-locations/nearby")
    .query({ lat: EMBASSY_SEOUL.lat, lng: EMBASSY_SEOUL.lng, country: "KR", radiusKm: 5 });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1, "phai tu mo rong va tra ve diem o Busan thay vi mang rong");
  assert.equal(res.body.data[0].name, "Don canh sat o Busan");
});

test("GET /api/support-locations -- fallback theo quoc gia khi khong co GPS", async () => {
  await SupportLocation.create({
    countryCode: "KR",
    type: "hospital",
    name: "Benh vien KR",
    address: "Seoul",
    phone: "0212345678",
    location: { type: "Point", coordinates: [EMBASSY_SEOUL.lng, EMBASSY_SEOUL.lat] },
  });

  const res = await request(app).get("/api/support-locations").query({ country: "KR" });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
  assert.equal(res.body.data[0].name, "Benh vien KR");
});

test("POST /api/admin/locations -- tu choi neu thieu dia chi hoac ca phone+website", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });

  const missingAddress = await request(app)
    .post("/api/admin/locations")
    .set("Authorization", auth(accessToken))
    .send({
      countryCode: "KR",
      type: "hospital",
      name: "Thieu dia chi",
      phone: "0212345678",
      location: { type: "Point", coordinates: [126.9, 37.5] },
    });
  assert.equal(missingAddress.status, 400);
  assert.equal(missingAddress.body.error.code, "VALIDATION_ERROR");

  const missingContact = await request(app)
    .post("/api/admin/locations")
    .set("Authorization", auth(accessToken))
    .send({
      countryCode: "KR",
      type: "hospital",
      name: "Thieu lien lac",
      address: "Seoul",
      location: { type: "Point", coordinates: [126.9, 37.5] },
    });
  assert.equal(missingContact.status, 400);
  assert.equal(missingContact.body.error.code, "VALIDATION_ERROR");
});

test("POST /api/admin/locations/bulk-import -- tao dong hop le, bo qua dong thieu du lieu kem ly do", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });

  const res = await request(app)
    .post("/api/admin/locations/bulk-import")
    .set("Authorization", auth(accessToken))
    .send({
      rows: [
        {
          countryCode: "KR",
          type: "pharmacy",
          name: "Nha thuoc hop le",
          address: "Seoul",
          phone: "0299999999",
          location: { type: "Point", coordinates: [126.9, 37.5] },
        },
        {
          countryCode: "KR",
          type: "pharmacy",
          name: "Thieu toa do",
          address: "Seoul",
          phone: "0299999999",
        },
      ],
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.createdCount, 1);
  assert.equal(res.body.data.skipped.length, 1);
  assert.equal(res.body.data.skipped[0].reason, "Thieu toa do hop le");

  const count = await SupportLocation.countDocuments();
  assert.equal(count, 1);
});

test("POST /api/admin/locations/bulk-verify -- danh dau verified hang loat, ghi audit log", async () => {
  const { accessToken } = await registerAndLogin(app, { role: "admin" });

  const locations = await SupportLocation.create([
    { countryCode: "KR", type: "police", name: "A", address: "Seoul", phone: "112", location: { type: "Point", coordinates: [126.9, 37.5] } },
    { countryCode: "KR", type: "police", name: "B", address: "Seoul", phone: "112", location: { type: "Point", coordinates: [126.9, 37.5] } },
  ]);

  const res = await request(app)
    .post("/api/admin/locations/bulk-verify")
    .set("Authorization", auth(accessToken))
    .send({ ids: locations.map((l) => String(l._id)) });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.verifiedCount, 2);

  const reloaded = await SupportLocation.find({ _id: { $in: locations.map((l) => l._id) } });
  assert.ok(reloaded.every((l) => l.verified === true && l.verifiedAt));

  const auditRes = await request(app).get("/api/admin/audit").set("Authorization", auth(accessToken));
  const entry = auditRes.body.data.find((a) => a.action === "BULK_VERIFY");
  assert.ok(entry, "phai co audit log cho bulk verify");
});
