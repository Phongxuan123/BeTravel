import mongoose from "mongoose";

/*
 * Câu trả lời đã được admin duyệt cho nhóm câu hỏi lặp lại (G6, docs/AI_FEATURE_PLAN.md mục 6).
 * Nội dung là NGUYÊN VĂN câu trả lời AI đã sinh và qua guard (admin không sửa). `sources` ghi phiên
 * bản của từng nguồn được trích lúc duyệt; mỗi lần phát phải kiểm lại, nguồn đổi thì chuyển
 * `needs_review` và không phát nữa. `dismissed` = admin bỏ qua đề xuất, giữ lại để nhóm đó
 * không hiện lại trong danh sách đề xuất.
 */
export const FaqStatus = Object.freeze({
  ACTIVE: "active",
  NEEDS_REVIEW: "needs_review",
  RETIRED: "retired",
  DISMISSED: "dismissed",
});

const faqSourceSchema = new mongoose.Schema(
  {
    chunkId: { type: mongoose.Schema.Types.ObjectId, required: true },
    sourceType: { type: String, enum: ["article", "au_legislation"], required: true },
    articleId: { type: mongoose.Schema.Types.ObjectId, default: null },
    articleVersion: { type: Number, default: null },
    titleId: { type: String, default: null },
    registerId: { type: String, default: null },
  },
  { _id: false },
);

const approvedFaqSchema = new mongoose.Schema(
  {
    countryCode: { type: String, required: true, uppercase: true },
    question: { type: String, required: true },
    keywordTerms: { type: [String], default: [] },
    answer: { type: String, default: "" },
    sections: { type: mongoose.Schema.Types.Mixed, default: null },
    citations: { type: [mongoose.Schema.Types.Mixed], default: [] },
    confidence: { type: String, default: "medium" },
    needsOfficialHelp: { type: Boolean, default: false },
    sources: { type: [faqSourceSchema], default: [] },
    status: { type: String, enum: Object.values(FaqStatus), required: true },
    // Lý do trạng thái hiện tại, vd "Nguồn đã đổi phiên bản" khi tự chuyển needs_review.
    statusReason: { type: String, default: "" },
    sourceMessageId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage", required: true },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    decidedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

approvedFaqSchema.index({ countryCode: 1, status: 1 });

export default mongoose.model("ApprovedFaq", approvedFaqSchema);
