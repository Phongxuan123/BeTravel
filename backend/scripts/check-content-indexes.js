// Read-only readiness check. Does not seed, migrate, or create indexes.
import mongoose from "mongoose";
import { env } from "../src/core/env.js";
import LegalArticle from "../src/models/LegalArticle.js";
try {
  await mongoose.connect(env.MONGODB_URI, { autoIndex: false, serverSelectionTimeoutMS: 10000 });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  const indexes = await LegalArticle.collection.indexes();
  const currentUnique = indexes.some(
    (index) =>
      index.unique &&
      index.key.countryCode === 1 &&
      index.key.slug === 1 &&
      Object.keys(index.key).length === 2 &&
      index.partialFilterExpression?.isCurrent === true,
  );
  const replicaSet = Boolean(hello.setName || hello.msg === "isdbgrid");
  console.log(
    JSON.stringify(
      { transactionCapable: replicaSet, currentArticleUniqueIndex: currentUnique },
      null,
      2,
    ),
  );
  if (!replicaSet || !currentUnique) process.exitCode = 1;
} catch (error) {
  console.error("Không hoàn tất kiểm tra:", error.name);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
