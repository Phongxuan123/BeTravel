import mongoose from "mongoose";

import { env } from "../src/core/env.js";
import RiskZone from "../src/models/RiskZone.js";

/*
 * CHI DUNG DE THU TREN MAY DEV: xuat ban cac vung nguy cao o Uc con 'draft' va chua co ky so lieu,
 * ghi ro "chua doi chieu" de nguoi dung khong hieu nham la so lieu da kiem chung. Truoc khi ra san pham
 * that phai doi chieu nguon goc, sua source.period roi publish theo quy trinh. Hoan nguyen: dat status ve 'draft'.
 * Dung: `node scripts/publish-au-risk-zones-demo.js`.
 */
const UNVERIFIED_PERIOD = "Chua doi chieu (ban thu)";

await mongoose.connect(env.MONGODB_URI, { maxPoolSize: 2 });
try {
  const result = await RiskZone.updateMany(
    { countryCode: "AU", status: "draft", "source.period": "" },
    { $set: { status: "published", "source.period": UNVERIFIED_PERIOD } },
  );
  console.log(`Da xuat ban ${result.modifiedCount} vung`);
} finally {
  await mongoose.disconnect();
}
