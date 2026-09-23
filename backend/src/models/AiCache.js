import mongoose from "mongoose";

/*
 * Cache cau tra loi AI theo key = sha256(normalize(q) + countryCode +
 * sortedChunkIds) -- xem services/chat.service.js#buildCacheKey. TTL qua
 * index Mongo (expireAfterSeconds), khong can job don rieng.
 */
const aiCacheSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    answer: { type: String, required: true },
    citations: { type: mongoose.Schema.Types.Mixed, default: [] },
    confidence: { type: String, default: "medium" },
    needsOfficialHelp: { type: Boolean, default: false },
    fallbackReason: { type: String, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

aiCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("AiCache", aiCacheSchema);
