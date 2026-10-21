import { test } from "node:test";
import assert from "node:assert/strict";

import { AU_SUPPORT_PLACES } from "../scripts/data/auSupportPlaces.js";

// Toạ độ phải nằm trong nước Úc (bắt lỗi đảo lat/lng), mỗi điểm có nguồn và ghi rõ chưa gọi điện.
test("bệnh viện và đồn cảnh sát Úc: toạ độ đúng nước, loại hợp lệ, có nguồn", () => {
  const types = new Set(AU_SUPPORT_PLACES.map((place) => place.type));
  assert.deepEqual([...types].sort(), ["hospital", "police"]);
  const names = AU_SUPPORT_PLACES.map((place) => place.name);
  assert.equal(new Set(names).size, names.length, "tên trùng sẽ ghi đè nhau khi upsert");
  for (const place of AU_SUPPORT_PLACES) {
    assert.ok(place.lat < -10 && place.lat > -45, `${place.name}: lat ${place.lat}`);
    assert.ok(place.lng > 112 && place.lng < 155, `${place.name}: lng ${place.lng}`);
    assert.match(place.phone, /^\+61 \d \d{4} \d{4}$/);
    assert.match(place.source, /\[OSM\]/);
    assert.match(place.source, /CHƯA gọi điện/);
  }
});
