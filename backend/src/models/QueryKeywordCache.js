import mongoose from "mongoose";

/*
 * Từ khoá tìm kiếm đã sinh cho một câu hỏi (RETRIEVAL_MODE=lexical), key = sha256(câu hỏi chuẩn hoá
 * + model rewrite). Giữ lại để: (1) hỏi lại câu giống nhau không tốn thêm một lượt gọi LLM,
 * (2) cùng câu hỏi luôn ra cùng từ khoá --> cùng đoạn luật --> cùng câu trả lời (ổn định).
 * TTL qua index Mongo như AiCache.
 */
const queryKeywordCacheSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    vi: { type: [String], default: [] },
    en: { type: [String], default: [] },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

queryKeywordCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("QueryKeywordCache", queryKeywordCacheSchema);
