import { test } from "node:test";
import assert from "node:assert/strict";

import { ASIA_VIETNAM_MISSIONS } from "../scripts/data/asiaVietnamMissions.js";

// Toạ độ phải nằm trong đúng nước (bắt lỗi đảo lat/lng) và nguồn không được giả vờ đã gọi điện.
const BOUNDS = {
  JP: { lat: [24, 46], lng: [122, 146] },
  TH: { lat: [5, 21], lng: [97, 106] },
  SG: { lat: [1, 1.5], lng: [103.6, 104.1] },
};

test("cơ quan đại diện Châu Á: toạ độ đúng nước, có nguồn, ghi rõ chưa gọi điện", () => {
  assert.equal(ASIA_VIETNAM_MISSIONS.length, 3);
  for (const mission of ASIA_VIETNAM_MISSIONS) {
    const { lat, lng } = BOUNDS[mission.countryCode];
    assert.ok(mission.lat >= lat[0] && mission.lat <= lat[1], `${mission.name}: lat ${mission.lat}`);
    assert.ok(mission.lng >= lng[0] && mission.lng <= lng[1], `${mission.name}: lng ${mission.lng}`);
    assert.match(mission.phone, /^\+\d+ /);
    assert.match(mission.source, /\[SITE\]/);
    assert.match(mission.source, /CHƯA gọi điện/);
  }
});
