/*
 * seed + reindex toan bo bai da published+isCurrent, cho moi truong demo
 * (PROMPT B9 muc 1). Chi index duoc bai DA PUBLISHED -- ngay sau `npm run
 * seed` lan dau, 8 bai luat KR van la 'draft' (chua co nguon xac nhan boi
 * nguoi that) nen buoc reindex se khong co gi de lam, dieu nay LA DUNG,
 * khong phai loi (xem chu thich dau scripts/seed-content.js).
 *
 * Goi truc tiep handler cua job thay vi enqueueJob() + startJobWorker() --
 * day la script chay mot lan roi thoat, khong co worker nen dang chay ngam
 * de xu ly hang doi (Rule 9 KISS).
 *
 * Dung: npm run seed:demo
 */
import mongoose from "mongoose";

import { env } from "../src/core/env.js";
import Country from "../src/models/Country.js";
import LegalArticle from "../src/models/LegalArticle.js";
import { ContentStatus } from "../src/core/constants.js";
import { reindexArticleHandler } from "../src/rag/jobs/reindexArticle.job.js";
import { run as seedContent } from "./seed-content.js";

const run = async () => {
  await mongoose.connect(env.MONGODB_URI, { maxPoolSize: env.MONGO_MAX_POOL_SIZE });

  await seedContent();

  const countries = await Country.find({}).select("code");
  let indexed = 0;

  for (const country of countries) {
    const articles = await LegalArticle.find({
      countryCode: country.code,
      status: ContentStatus.PUBLISHED,
      isCurrent: true,
    }).select("_id slug");

    for (const article of articles) {
      await reindexArticleHandler({ articleId: article._id.toString() });
      console.log(`[reindex] ${country.code}/${article.slug}`);
      indexed += 1;
    }
  }

  console.log(`\nHoan tat: ${indexed} bai da duoc index lai.`);
  if (indexed === 0) {
    console.log(
      "Chua co bai nao o trang thai published -- dung binh thuong sau lan seed dau. " +
        "Vao Admin Portal, doi chieu nguon 8 bai luat KR (draft) roi chuyen sang " +
        "published de RAG co du lieu tra loi.",
    );
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error("Loi seed:demo:", error);
  process.exit(1);
});
