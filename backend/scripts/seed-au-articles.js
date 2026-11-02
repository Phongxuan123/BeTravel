/*
 * Seed bai cam nang Uc (tro ly AI ban 2, giai doan 2) o trang thai DRAFT.
 * Doc moi file JSON trong scripts/data/au-articles/ (soan theo BRIEF.md, nguon gov.au that).
 * Chi TAO MOI -- bai da ton tai (cung countryCode + slug) bi bo qua, khong ghi de cong admin.
 * Dung: npm run seed:au-articles            (xem truoc, khong ghi DB)
 *       node scripts/seed-au-articles.js --apply
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

import { env } from "../src/core/env.js";
import { ContentStatus } from "../src/core/constants.js";
import LegalTopic from "../src/models/LegalTopic.js";
import LegalArticle from "../src/models/LegalArticle.js";
import { buildBodyMd } from "./seed-content.js";

const COUNTRY_CODE = "AU";
const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "data", "au-articles");

export const AU_TOPICS = [
  { slug: "nhap-canh", label: "Nhập cảnh & visa", order: 1 },
  { slug: "hai-quan", label: "Hải quan & kiểm dịch", order: 2 },
  { slug: "giao-thong", label: "Giao thông", order: 3 },
  { slug: "noi-cong-cong", label: "Nơi công cộng", order: 4 },
  { slug: "khan-cap", label: "Khẩn cấp & an toàn", order: 5 },
  { slug: "y-te", label: "Y tế", order: 6 },
  { slug: "hoc-tap-lam-viec", label: "Học tập & làm việc", order: 7 },
  { slug: "nha-o", label: "Nhà ở", order: 8 },
];

export const loadAuArticles = () =>
  readdirSync(DATA_DIR)
    .filter((file) => file.endsWith(".json"))
    .flatMap((file) => JSON.parse(readFileSync(path.join(DATA_DIR, file), "utf8")));

// verification/unverified chi phuc vu nguoi duyet -- gom vao reviewNote (truong noi bo, khong
// tra qua API cong khai) thay vi luu thanh field rieng ngoai schema.
const buildReviewNote = (article) => {
  const lines = ["Ban nhap do AI soan tu nguon gov.au, can nguoi doi chieu truoc khi xuat ban."];
  for (const item of article.verification ?? []) {
    lines.push(`[v] ${item.claim} -- ${item.url} -- "${item.quote}"`);
  }
  for (const item of article.unverified ?? []) lines.push(`[X] Chua xac minh: ${item}`);
  return lines.join("\n");
};

const toDocument = (article) => {
  const { verification: _verification, unverified: _unverified, ...content } = article;
  return {
    ...content,
    countryCode: COUNTRY_CODE,
    version: 1,
    isCurrent: true,
    status: ContentStatus.DRAFT,
    bodyMd: buildBodyMd(content),
    reviewNote: buildReviewNote(article),
  };
};

const validateTopics = (articles) => {
  const known = new Set(AU_TOPICS.map((t) => t.slug));
  const invalid = articles.filter((a) => !known.has(a.topicSlug)).map((a) => a.slug);
  if (invalid.length) throw new Error(`topicSlug khong hop le: ${invalid.join(", ")}`);
};

const run = async () => {
  const shouldApply = process.argv.includes("--apply");
  const articles = loadAuArticles();
  validateTopics(articles);
  await mongoose.connect(env.MONGODB_URI);

  for (const topic of AU_TOPICS) {
    const exists = await LegalTopic.exists({ countryCode: COUNTRY_CODE, slug: topic.slug });
    if (!exists && shouldApply) await LegalTopic.create({ countryCode: COUNTRY_CODE, ...topic });
    console.log(`${exists ? "[bo qua]" : "[tao moi]"} LegalTopic AU/${topic.slug}`);
  }

  for (const article of articles) {
    const exists = await LegalArticle.exists({ countryCode: COUNTRY_CODE, slug: article.slug });
    if (!exists && shouldApply) await LegalArticle.create(toDocument(article));
    console.log(`${exists ? "[bo qua]" : "[tao moi]"} LegalArticle AU/${article.slug} (draft)`);
  }

  if (!shouldApply) console.log("Xem truoc, chua ghi DB. Chay lai voi --apply de ghi.");
  await mongoose.disconnect();
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  });
}
