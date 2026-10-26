import mongoose from "mongoose";

import { AnswerSource } from "../core/constants.js";

/*
 * Bộ nhớ câu hỏi lặp lại (services/answerMemory.service.js): câu trả lời đã qua guard, dùng lại
 * NGAY cho câu hỏi trùng (cùng quốc gia) trước khi tạo từ khoá, tra kho hay gọi AI. Khác AiCache
 * (khoá theo câu hỏi + chunk truy hồi, chỉ đọc được SAU truy hồi). TTL qua index Mongo.
 * `sources` ghi phiên bản từng nguồn kho được trích; mỗi lần dùng lại phải kiểm còn hiệu lực.
 */
const memorySourceSchema = new mongoose.Schema(
  {
    chunkId: { type: mongoose.Schema.Types.ObjectId, ref: "LegalChunk" },
    sourceType: { type: String, default: "article" },
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: "LegalArticle", default: null },
    articleVersion: { type: Number, default: null },
    titleId: { type: String, default: null },
    registerId: { type: String, default: null },
    // Bài sửa tại chỗ (không lên version) vẫn đổi updatedAt: khi đó cũng không được phát lại.
    articleUpdatedAt: { type: Date, default: null },
  },
  { _id: false },
);

const answerMemorySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    countryCode: { type: String, required: true },
    keywordTerms: { type: [String], default: [] },
    answer: { type: String, required: true },
    sections: { type: mongoose.Schema.Types.Mixed, default: null },
    citations: { type: mongoose.Schema.Types.Mixed, default: [] },
    retrieval: { type: mongoose.Schema.Types.Mixed, default: null },
    confidence: { type: String, default: "medium" },
    needsOfficialHelp: { type: Boolean, default: false },
    answerSource: { type: String, enum: Object.values(AnswerSource), required: true },
    model: { type: String, default: "" },
    sources: { type: [memorySourceSchema], default: [] },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

answerMemorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
answerMemorySchema.index({ countryCode: 1, keywordTerms: 1 });

export default mongoose.model("AnswerMemory", answerMemorySchema);
