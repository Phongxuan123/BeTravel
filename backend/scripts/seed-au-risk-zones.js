import { pathToFileURL } from "node:url";

import mongoose from "mongoose";

import { env } from "../src/core/env.js";
import RiskZone from "../src/models/RiskZone.js";
import { AU_RISK_ZONES, RETIRED_AU_RISK_ZONE_NAMES } from "./data/auRiskZones.js";

/*
 * Nạp vùng nguy cơ ở Úc (scripts/data/auRiskZones.js) vào risk_zones, TẤT CẢ ở trạng thái draft.
 * Upsert theo (countryCode, name); luôn cập nhật hình dạng, KHÔNG ghi đè status/source của vùng admin đã chỉnh. Dùng: `npm run seed:au-risk-zones`.
 */
export const run = async () => {
  for (const zone of AU_RISK_ZONES) {
    // Hinh dang (tam, ban kinh) luon cap nhat theo file du lieu; status/source do admin chinh thi giu nguyen.
    const { center, radiusM, ...rest } = zone;
    const result = await RiskZone.updateOne(
      { countryCode: zone.countryCode, name: zone.name },
      { $set: { center, radiusM }, $unset: { area: "" }, $setOnInsert: rest },
      { upsert: true },
    );
    console.log(`[${result.upsertedCount ? "tao moi" : "giu nguyen"}] ${zone.name}`);
  }

  const retired = await RiskZone.updateMany(
    { countryCode: "AU", name: { $in: RETIRED_AU_RISK_ZONE_NAMES } },
    { $set: { status: "draft" } },
  );
  console.log(`Da go ${retired.modifiedCount} vung cu qua rong`);
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
