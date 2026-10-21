import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { startTestDb, stopTestDb, clearTestDb } from "./setup.js";
import { AU_EMBASSY, AU_VIETNAM_MISSIONS } from "../scripts/data/auVietnamMissions.js";
import { haversineMeters } from "../src/utils/geo.js";

/*
 * Dữ liệu SOS là tài sản đắt: kiểm tính toàn vẹn của danh sách cơ quan đại diện Việt Nam tại Úc
 * (toạ độ không bị đảo lat/lng, đúng số lượng theo DFAT, có nguồn và ghi rõ phương pháp xác minh)
 * và đường nạp vào DB -> API công khai chỉ trả điểm verified.
 */
let app;
let run;
let Country;

before(async () => {
  await startTestDb();
  ({ default: app } = await import("../src/app.js"));
  ({ run } = await import("../scripts/seed-au-missions.js"));
  ({ default: Country } = await import("../src/models/Country.js"));
  const { default: SupportLocation } = await import("../src/models/SupportLocation.js");
  await SupportLocation.init();
});
after(stopTestDb);
beforeEach(async () => {
  await clearTestDb();
  await Country.create({ code: "AU", name: "Úc", status: "active" });
});

const byCity = (city) => AU_VIETNAM_MISSIONS.find((mission) => mission.name.includes(city));

test("danh sách đúng theo DFAT: 1 Đại sứ quán + 2 Tổng lãnh sự quán, không có Melbourne", () => {
  assert.equal(AU_VIETNAM_MISSIONS.length, 3);
  assert.ok(byCity("Canberra") && byCity("Sydney") && byCity("Perth"));
  assert.equal(byCity("Melbourne"), undefined);
  for (const mission of AU_VIETNAM_MISSIONS) {
    assert.match(mission.phone, /^\+61 \d (\d{4}) \d{4}$/);
    assert.match(mission.website, /^https:\/\//);
    assert.match(mission.source, /\[DFAT\]/);
    // Không được giả vờ đã gọi điện xác nhận.
    assert.match(mission.source, /CHƯA gọi điện/);
  }
});

test("toạ độ nằm trong nước Úc, đúng thứ tự và khoảng cách Sydney-Canberra-Perth hợp lý", () => {
  for (const { lat, lng } of AU_VIETNAM_MISSIONS) {
    assert.ok(lat < -10 && lat > -45, `lat ${lat} ngoài nước Úc (đảo lat/lng?)`);
    assert.ok(lng > 112 && lng < 155, `lng ${lng} ngoài nước Úc (đảo lat/lng?)`);
  }
  const [canberra, sydney, perth] = ["Canberra", "Sydney", "Perth"].map(byCity);
  const sydneyToCanberraKm =
    haversineMeters(sydney.lat, sydney.lng, canberra.lat, canberra.lng) / 1000;
  assert.ok(
    sydneyToCanberraKm > 200 && sydneyToCanberraKm < 260,
    `Sydney-Canberra ${sydneyToCanberraKm} km`,
  );
  assert.ok(haversineMeters(perth.lat, perth.lng, sydney.lat, sydney.lng) / 1000 > 3000);
  // Country.embassy phải là chính Đại sứ quán Canberra.
  assert.equal(AU_EMBASSY.lat, canberra.lat);
  assert.equal(AU_EMBASSY.lng, canberra.lng);
});

test("nạp vào DB: API công khai trả 3 điểm verified, chạy lại không tạo trùng, Country.embassy được cập nhật", async () => {
  await run();
  await run();

  const list = await request(app)
    .get("/api/support-locations")
    .query({ country: "AU", type: "embassy" });
  assert.equal(list.status, 200);
  assert.equal(list.body.data.length, 3);
  assert.ok(list.body.data.every((item) => item.verified === true && item.verifiedAt));

  // Gần Sydney: TLSQ Sydney phải đứng đầu, GeoJSON [lng, lat] được lưu đúng thứ tự.
  const nearby = await request(app)
    .get("/api/support-locations/nearby")
    .query({ lat: -33.87, lng: 151.21, country: "AU", radiusKm: 20 });
  assert.equal(nearby.status, 200);
  assert.match(nearby.body.data[0].name, /Sydney/);

  const country = await Country.findOne({ code: "AU" }).lean();
  assert.equal(country.embassy.address, "47 Culgoa Circuit, O'Malley ACT 2606, Úc");
});
