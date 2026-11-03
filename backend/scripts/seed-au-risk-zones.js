import { pathToFileURL } from "node:url";

import mongoose from "mongoose";

import { env } from "../src/core/env.js";
import RiskZone from "../src/models/RiskZone.js";
import { AU_RISK_ZONES, RETIRED_AU_RISK_ZONE_NAMES } from "./data/auRiskZones.js";

/*
 * Nạp vùng nguy cơ ở Úc (scripts/data/auRiskZones.js) vào risk_zones, xuất bản sẵn kèm nguồn và kỳ số liệu (đã ghi rõ phần chưa đối chiếu).
 * Upsert theo (countryCode, name); luôn cập nhật hình dạng, KHÔNG ghi đè status của vùng admin đã gỡ. Dùng: `npm run seed:au-risk-zones`.
 */
export const run = async () => {
  for (const zone of AU_RISK_ZONES) {
    // Du lieu trong repo la nguon su that: ghi de noi dung/nguon moi lan seed de ai chay cung co ban moi nhat.
    // Rieng status chi dat khi tao moi, de admin go vung ve 'draft' thi chay lai seed khong tu bat len.
    const { status, ...content } = zone;
    const result = await RiskZone.updateOne(
      { countryCode: zone.countryCode, name: zone.name },
      { $set: content, $unset: { area: "" }, $setOnInsert: { status } },
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
