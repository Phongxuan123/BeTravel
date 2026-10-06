/*
 * Publish 2 bai mau KR de xem cau truc giao dien moi tren mobile (Explore,
 * chi tiet bai luat). Quyet dinh cua chu du an ngay 2026-10-06.
 *
 * Chi chon bai DA CO nguon chinh phu (`kind: gov`) trong scripts/seed-content.js
 * -- khong tao noi dung moi. Bai van can nguoi that doi chieu nguon lai; ghi
 * ro trong reviewNote de Admin Portal hien canh bao nay.
 *
 * Dung: npm run seed:samples
 */
import mongoose from "mongoose";

import { env } from "../src/core/env.js";
import LegalArticle from "../src/models/LegalArticle.js";
import { ContentStatus } from "../src/core/constants.js";
import { run as seedContent } from "./seed-content.js";

const SAMPLE_SLUGS = ["qua-han-luu-tru", "bang-lai-nuoc-ngoai"];
const SAMPLE_REVIEW_NOTE =
  "[!] Bai mau publish de demo giao dien, CHUA qua doi chieu nguon boi nguoi that. " +
  "Can review lai truoc khi dung that.";

const publishSample = async (slug) => {
  const article = await LegalArticle.findOne({ countryCode: "KR", slug, isCurrent: true });
  if (!article) {
    console.log(`[bo qua] Khong tim thay KR/${slug}`);
    return;
  }
  if (article.status === ContentStatus.PUBLISHED) {
    console.log(`[bo qua] KR/${slug} da published`);
    return;
  }
  article.status = ContentStatus.PUBLISHED;
  article.publishedAt = new Date();
  article.reviewNote = SAMPLE_REVIEW_NOTE;
  await article.save();
  console.log(`[published] KR/${slug}`);
};

const run = async () => {
  await mongoose.connect(env.MONGODB_URI, { maxPoolSize: env.MONGO_MAX_POOL_SIZE });
  await seedContent();
  for (const slug of SAMPLE_SLUGS) await publishSample(slug);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error("Loi seed:samples:", error);
  process.exit(1);
});
