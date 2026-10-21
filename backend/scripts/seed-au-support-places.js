import { pathToFileURL } from "node:url";

import mongoose from "mongoose";

import { env } from "../src/core/env.js";
import SupportLocation from "../src/models/SupportLocation.js";
import { AU_SUPPORT_PLACES } from "./data/auSupportPlaces.js";
import { toSupportLocationDoc } from "./seed-au-missions.js";

/*
 * Nạp bệnh viện và đồn cảnh sát ở Úc đã đối chiếu nguồn (scripts/data/auSupportPlaces.js) vào support_locations.
 * Upsert theo (countryCode, name), chạy lại an toàn. Dùng: `npm run seed:au-places`.
 */
export const run = async () => {
  for (const place of AU_SUPPORT_PLACES) {
    const doc = toSupportLocationDoc(place);
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
