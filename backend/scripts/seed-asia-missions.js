import { pathToFileURL } from "node:url";

import mongoose from "mongoose";

import { env } from "../src/core/env.js";
import Country from "../src/models/Country.js";
import SupportLocation from "../src/models/SupportLocation.js";
import { ASIA_VIETNAM_MISSIONS, toCountryEmbassy } from "./data/asiaVietnamMissions.js";
import { toSupportLocationDoc } from "./seed-au-missions.js";

/*
 * Nạp Đại sứ quán Việt Nam tại JP, TH, SG đã đối chiếu nguồn (scripts/data/asiaVietnamMissions.js).
 * Chỉ cập nhật quốc gia đã có trong DB; chạy lại an toàn. Dùng: `npm run seed:asia-missions`.
 */
export const run = async () => {
  for (const mission of ASIA_VIETNAM_MISSIONS) {
    const country = await Country.findOne({ code: mission.countryCode });
    if (!country) {
      console.log(`[bo qua] chua co quoc gia ${mission.countryCode}: chay npm run seed truoc`);
      continue;
    }
    await Country.updateOne({ code: mission.countryCode }, { $set: { embassy: toCountryEmbassy(mission) } });
    const doc = toSupportLocationDoc(mission);
    const result = await SupportLocation.updateOne(
      { countryCode: doc.countryCode, name: doc.name },
      { $set: doc },
      { upsert: true },
    );
    console.log(`[${result.upsertedCount ? "tao moi" : "cap nhat"}] ${doc.name}`);
  }
};

const isDirectRun = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  await mongoose.connect(env.MONGODB_URI, { maxPoolSize: 2 });
  try {
    await run();
  } finally {
    await mongoose.disconnect();
  }
}
