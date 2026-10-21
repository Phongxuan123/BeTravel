import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { startTestDb, stopTestDb } from "./setup.js";

/*
 * Tim dia diem theo chu (/api/places/search). Test dung PLACES_PROVIDER=mock (xem setup.js) nen KHONG goi
 * Nominatim; phan chuan hoa ket qua duoc kiem tra truc tiep bang JSON mau cua Nominatim.
 */
let app;
let normalizeNominatimResults;

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
  ({ normalizeNominatimResults } = await import("../src/services/geocode.service.js"));
});
after(stopTestDb);

test("normalizeNominatimResults: uu tien ten tieng Viet, GeoJSON [lng, lat], bo ket qua hong", () => {
  const places = normalizeNominatimResults([
    {
      osm_type: "relation",
      osm_id: 2410520,
      lat: "37.5177000",
      lon: "127.0473000",
      name: "강남구",
      namedetails: { name: "강남구", "name:vi": "Quận Gangnam", "name:en": "Gangnam District" },
      display_name: "강남구, Seoul, Hàn Quốc",
      type: "administrative",
    },
    { osm_type: "node", osm_id: 1, lat: "abc", lon: "127", display_name: "Toa do hong" },
    { osm_type: "node", osm_id: 2, lat: "35.1", lon: "129.0", display_name: "Busan, Hàn Quốc" },
  ]);

  assert.equal(places.length, 2);
  assert.equal(places[0].name, "Quận Gangnam");
  assert.deepEqual(places[0].location.coordinates, [127.0473, 37.5177]);
  assert.equal(places[0].verified, false);
  // Khong co namedetails: lay phan dau cua display_name.
  assert.equal(places[1].name, "Busan");
  assert.deepEqual(normalizeNominatimResults(null), []);
});

test("GET /api/places/search: chan q qua ngan/thieu va country khong phai 2 chu cai", async () => {
  const tooShort = await request(app).get("/api/places/search").query({ q: "a" });
  assert.equal(tooShort.status, 400);
  assert.equal(tooShort.body.error.code, "VALIDATION_ERROR");

  const missing = await request(app).get("/api/places/search");
  assert.equal(missing.status, 400);

  const badCountry = await request(app)
    .get("/api/places/search")
    .query({ q: "Seoul", country: "KOR1" });
  assert.equal(badCountry.status, 400);
});

test("GET /api/places/search: chay duoc o che do mock, tra GeoJSON va meta.scope", async () => {
  const res = await request(app).get("/api/places/search").query({ q: "Seoul", country: "kr" });

  assert.equal(res.status, 200);
  assert.equal(res.body.meta.scope, "global");
  const [place] = res.body.data;
  assert.equal(place.verified, false);
  assert.equal(place.location.type, "Point");
  assert.equal(place.location.coordinates.length, 2);
});

// Loi thuc te: dang chon Uc, go "Viet Nam" chi ra cac dia danh trung chu trong Uc, khong thay chinh nuoc Viet Nam.
test("mergeCountrySearch: ten ca mot quoc gia len dau du dang chon nuoc khac", async () => {
  const { mergeCountrySearch } = await import("../src/services/geocode.service.js");
  const place = (id, name, addressType) => ({ placeId: `relation/${id}`, name, addressType });
  const { places, scope } = mergeCountrySearch({
    worldwide: [place(2, "Việt Nam", "country"), place(1, "Vietnam Veterans Museum", "tourism")],
    inCountry: [place(1, "Vietnam Veterans Museum", "tourism")],
  });
  assert.deepEqual(places.map((p) => p.name), ["Việt Nam", "Vietnam Veterans Museum"]);
  assert.equal(scope, "country");
  assert.equal("addressType" in places[0], false);
});
