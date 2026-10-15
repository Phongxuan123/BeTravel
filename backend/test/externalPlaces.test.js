import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";

/*
 * Dia diem bo sung tu Google Maps (SerpApi). Test dung PLACES_PROVIDER=mock (xem setup.js)
 * nen KHONG goi mang; phan chuan hoa ket qua SerpApi duoc kiem tra truc tiep bang JSON mau.
 */
let app;
let normalizeLocalResults;
let describeSerpApiFailure;
let resetExternalPlacesState;
let parseEnv;

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
  ({ normalizeLocalResults, resetExternalPlacesState, describeSerpApiFailure } =
    await import("../src/services/externalPlaces.service.js"));
  ({ parseEnv } = await import("../src/core/env.js"));
  // $geoNear (kiem tra /nearby ben duoi) can index 2dsphere da ton tai that.
  const { default: SupportLocation } = await import("../src/models/SupportLocation.js");
  await SupportLocation.init();
});

after(stopTestDb);
beforeEach(async () => {
  await clearTestDb();
  resetExternalPlacesState();
});

// Toa do THAT cua Dai su quan Viet Nam tai Seoul -- bat loi dao lat/lng, khong dung so gia.
const SEOUL = { lat: 37.5385, lng: 126.9715 };
const SNUH_GPS = { latitude: 37.5796, longitude: 126.9987 };

test("GET /api/support-locations/external tra diem CHUA xac minh, GeoJSON [lng, lat]", async () => {
  const res = await request(app)
    .get("/api/support-locations/external")
    .query({ ...SEOUL, type: "embassy" });

  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  const [place] = res.body.data;
  assert.equal(place.verified, false);
  assert.equal(place.source, "google_maps");
  assert.equal(place.type, "embassy");
  // lng (~127) dung truoc lat (~37.5): dao nguoc la loi kinh dien.
  assert.ok(place.location.coordinates[0] > 100);
  assert.ok(place.location.coordinates[1] < 60);
  assert.equal(typeof place.distanceMeters, "number");
});

test("GET /api/support-locations/external tu choi tham so thieu hoac sai (400 VALIDATION_ERROR)", async () => {
  const invalidQueries = [
    { ...SEOUL },
    { ...SEOUL, type: "other" },
    { ...SEOUL, type: "pizza" },
    { lat: 95, lng: SEOUL.lng, type: "embassy" },
    { lat: SEOUL.lat, type: "embassy" },
  ];

  for (const query of invalidQueries) {
    const res = await request(app).get("/api/support-locations/external").query(query);
    assert.equal(res.status, 400, JSON.stringify(query));
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  }
});

test("diem Google Maps KHONG lot vao danh sach da xac minh /api/support-locations", async () => {
  await request(app)
    .get("/api/support-locations/external")
    .query({ ...SEOUL, type: "embassy" });

  const verified = await request(app).get("/api/support-locations").query({ country: "KR" });
  const nearby = await request(app).get("/api/support-locations/nearby").query(SEOUL);

  assert.deepEqual(verified.body.data, []);
  assert.deepEqual(nearby.body.data, []);
});

test("normalizeLocalResults: giu diem hop le, bo diem thieu ten hoac toa do", () => {
  const json = {
    local_results: [
      {
        title: "Embassy of Viet Nam",
        place_id: "abc",
        type: "Embassy",
        address: "Seoul",
        phone: "+82 2-3141-1400",
        rating: 4.1,
        reviews: 87,
        open_state: "Open - Closes 5 PM",
        gps_coordinates: { latitude: 37.5385, longitude: 126.9715 },
      },
      { title: "Khong co toa do", place_id: "x" },
      { place_id: "y", gps_coordinates: { latitude: 1, longitude: 2 } },
    ],
  };

  const places = normalizeLocalResults(json, "embassy");

  assert.equal(places.length, 1);
  assert.equal(places[0].name, "Embassy of Viet Nam");
  assert.deepEqual(places[0].location.coordinates, [126.9715, 37.5385]);
  assert.equal(places[0].rating, 4.1);
  assert.equal(places[0].verified, false);
});

test("normalizeLocalResults: truy van khop dung 1 dia diem (place_results) va ket qua rong", () => {
  const single = normalizeLocalResults(
    { place_results: { title: "Seoul National University Hospital", gps_coordinates: SNUH_GPS } },
    "hospital",
  );
  assert.equal(single.length, 1);
  assert.equal(single[0].placeId, "");
  assert.deepEqual(normalizeLocalResults({}, "hospital"), []);
  assert.deepEqual(normalizeLocalResults(null, "hospital"), []);
});

test("env: PLACES_PROVIDER=serpapi bat buoc co SERPAPI_KEY", () => {
  const base = {
    NODE_ENV: "test",
    MONGODB_URI: "mongodb://127.0.0.1:1/qa",
    JWT_ACCESS_SECRET: "gia-tri-gia-chi-dung-trong-test-000000000",
  };

  const missingKey = parseEnv({ ...base, PLACES_PROVIDER: "serpapi" });
  assert.equal(missingKey.success, false);
  assert.ok(missingKey.error.issues.some((issue) => issue.path.includes("SERPAPI_KEY")));

  assert.equal(parseEnv({ ...base, PLACES_PROVIDER: "serpapi", SERPAPI_KEY: "k" }).success, true);
  assert.equal(parseEnv(base).data.PLACES_PROVIDER, "mock");
});

test("describeSerpApiFailure doc loi serpapi dang chuoi JSON, Error va gia tri la", () => {
  assert.equal(
    describeSerpApiFailure('{"error": "Invalid API key. Your API key should be here"}'),
    "Invalid API key. Your API key should be here",
  );
  assert.equal(describeSerpApiFailure(new Error("PLACES_TIMEOUT")), "PLACES_TIMEOUT");
  assert.equal(describeSerpApiFailure("khong phai json"), "khong phai json");
  assert.equal(describeSerpApiFailure({ error: "boom" }), "boom");
  assert.equal(describeSerpApiFailure(undefined), "unknown");
});

test("buildOverpassQuery: the OSM dat TRUOC around, khop chinh xac, chi chua so da validate", async () => {
  const { buildOverpassQuery } = await import("../src/services/externalPlaces.service.js");

  const embassy = buildOverpassQuery({ ...SEOUL, type: "embassy" });
  const hospital = buildOverpassQuery({ ...SEOUL, type: "hospital" });

  // Dai su va lanh su Viet Nam; the truoc, around sau (dao thu tu hoac dung regex thi Overpass tra 504).
  assert.match(
    embassy,
    /nwr\["diplomatic"="embassy"\]\["country"="VN"\]\(around:\d+,37\.5385,126\.9715\);/,
  );
  assert.match(embassy, /nwr\["diplomatic"="consulate"\]\["country"="VN"\]/);
  assert.match(hospital, /nwr\["amenity"="hospital"\]\(around:\d+,37\.5385,126\.9715\);/);
  assert.doesNotMatch(embassy + hospital, /~/);
  assert.ok(embassy.endsWith("out center tags;"));
});

test("normalizeOverpassElements: node va way (center), bo diem khong ten hoac toa do hong", async () => {
  const { normalizeOverpassElements } = await import("../src/services/externalPlaces.service.js");
  const json = {
    elements: [
      {
        type: "node",
        id: 8198255435,
        lat: 37.57298,
        lon: 126.9802494,
        tags: {
          name: "주한베트남대사관",
          "name:vi": "Đại sứ quán Việt Nam tại Hàn Quốc",
          diplomatic: "embassy",
          phone: "+82 02-725-2487",
          opening_hours: "Mo-Fr 09:00-17:00",
          "addr:housenumber": "123",
          "addr:street": "Bukchon-ro",
          "addr:city": "Seoul",
        },
      },
      {
        type: "way",
        id: 7,
        center: { lat: 37.5, lon: 127 },
        tags: { name: "Seoul Hospital", amenity: "hospital" },
      },
      { type: "node", id: 8, lat: 37.5, lon: 127, tags: { amenity: "hospital" } },
      { type: "node", id: 9, tags: { name: "Khong co toa do" } },
    ],
  };

  const places = normalizeOverpassElements(json, "embassy");

  assert.equal(places.length, 2);
  assert.equal(places[0].placeId, "node/8198255435");
  // Uu tien ten tieng Viet de nguoi dung de nhan ra, ten ban dia khong lam mat dia diem.
  assert.equal(places[0].name, "Đại sứ quán Việt Nam tại Hàn Quốc");
  assert.equal(places[0].address, "123, Bukchon-ro, Seoul");
  assert.equal(places[0].openState, "Mo-Fr 09:00-17:00");
  // GeoJSON [lng, lat]: lng (~127) dung truoc lat (~37.5).
  assert.deepEqual(places[0].location.coordinates, [126.9802494, 37.57298]);
  assert.equal(places[0].verified, false);
  assert.equal(places[0].source, "openstreetmap");
  assert.deepEqual(places[1].location.coordinates, [127, 37.5]);
  assert.deepEqual(normalizeOverpassElements(null, "embassy"), []);
});

test("env: PLACES_PROVIDER=osm khong can key va chap nhan cau hinh mac dinh Overpass", () => {
  const base = {
    NODE_ENV: "test",
    MONGODB_URI: "mongodb://127.0.0.1:1/qa",
    JWT_ACCESS_SECRET: "gia-tri-gia-chi-dung-trong-test-000000000",
  };

  const parsed = parseEnv({ ...base, PLACES_PROVIDER: "osm" });

  assert.equal(parsed.success, true);
  assert.equal(parsed.data.PLACES_OVERPASS_URL, "https://overpass-api.de/api/interpreter");
  assert.equal(parsed.data.PLACES_USER_AGENT, "BeTravel/1.0");
});

test("GET /api/support-locations/external?country=KR&type=embassy chay duoc khong can toa do, distanceMeters null", async () => {
  const res = await request(app)
    .get("/api/support-locations/external")
    .query({ country: "kr", type: "embassy" });

  assert.equal(res.status, 200);
  const [place] = res.body.data;
  assert.equal(place.verified, false);
  assert.equal(place.distanceMeters, null);
});

test("external: country chi hop le voi type=embassy, lat/lng phai di cung nhau, country chi gom chu cai", async () => {
  const invalidQueries = [
    { country: "KR", type: "hospital" },
    { country: "KR" },
    { lat: SEOUL.lat, type: "embassy" },
    { lng: SEOUL.lng, country: "KR", type: "embassy" },
    { country: "K1", type: "embassy" },
    { country: 'K"', type: "embassy" },
  ];

  for (const query of invalidQueries) {
    const res = await request(app).get("/api/support-locations/external").query(query);
    assert.equal(res.status, 400, JSON.stringify(query));
    assert.equal(res.body.error.code, "VALIDATION_ERROR");
  }
});

test("buildOverpassQuery theo quoc gia: loc target=<ISO2> thay cho around", async () => {
  const { buildOverpassQuery } = await import("../src/services/externalPlaces.service.js");

  const query = buildOverpassQuery({ country: "KR", type: "embassy" });

  assert.match(query, /nwr\["diplomatic"="embassy"\]\["country"="VN"\]\["target"="KR"\];/);
  assert.doesNotMatch(query, /around/);
});
