import { pathToFileURL } from "node:url";

import mongoose from "mongoose";

import { env } from "../src/core/env.js";
import Country from "../src/models/Country.js";
import SupportLocation from "../src/models/SupportLocation.js";
import { AU_EMBASSY, AU_VIETNAM_MISSIONS, VERIFIED_ON } from "./data/auVietnamMissions.js";

/*
 * Nạp cơ quan đại diện của Việt Nam tại Úc đã đối chiếu nguồn chính thức (scripts/data/auVietnamMissions.js):
 *   - cập nhật Country AU.embassy (Đại sứ quán Canberra, hiển thị ở màn SOS và thẻ liên hệ của AI);
 *   - upsert support_locations theo (countryCode, name), verified:true kèm source ghi rõ phương pháp.
 * Chạy lại an toàn (không tạo trùng). Dùng: `npm run seed:au-missions`.
 * Điểm chưa gọi điện xác nhận được ghi ngay trong `source`: đừng coi đây là kiểm chứng qua điện thoại.
 */

export const toSupportLocationDoc = (mission) => ({
  countryCode: mission.countryCode,
  type: mission.type,
  name: mission.name,
  nameLocal: mission.nameLocal,
  address: mission.address,
  phone: mission.phone,
  website: mission.website,
  openHours: mission.openHours,
  // GeoJSON luôn là [lng, lat].
  location: { type: "Point", coordinates: [mission.lng, mission.lat] },
  verified: true,
  verifiedAt: new Date(`${VERIFIED_ON}T00:00:00Z`),
  source: mission.source,
});

export const run = async () => {
  const country = await Country.findOne({ code: "AU" });
  if (!country) throw new Error("Chưa có quốc gia AU: chạy `npm run seed` trước.");
  await Country.updateOne({ code: "AU" }, { $set: { embassy: AU_EMBASSY } });
  console.log("[cap nhat] Country AU.embassy");

  for (const mission of AU_VIETNAM_MISSIONS) {
    const doc = toSupportLocationDoc(mission);
    const result = await SupportLocation.updateOne(
      { countryCode: doc.countryCode, name: doc.name },
      { $set: doc },
      { upsert: true },
    );
    console.log(`[${result.upsertedCount ? "tao moi" : "cap nhat"}] ${doc.name}`);
  }
};

// Chỉ chạy khi gọi trực tiếp bằng node (import trong test không tự kết nối DB).
const isDirectRun = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  await mongoose.connect(env.MONGODB_URI, { maxPoolSize: 2 });
  try {
    await run();
  } finally {
    await mongoose.disconnect();
  }
}
