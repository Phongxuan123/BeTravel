import mongoose from "mongoose";

/*
 * Điểm trùng lặp nội dung (0-1) do AI chấm giữa hai câu hỏi (G6), key = sha256(model + hai câu đã chuẩn
 * hoá). Lưu lại để mỗi lần admin mở trang đề xuất không phải gọi AI chấm lại các cặp đã chấm.
 */
const questionSimilarityCacheSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    score: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

questionSimilarityCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("QuestionSimilarityCache", questionSimilarityCacheSchema);
