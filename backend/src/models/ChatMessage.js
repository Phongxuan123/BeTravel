import mongoose from "mongoose";

import { ChatRole } from "../core/constants.js";

const citationSchema = new mongoose.Schema(
  {
    marker: { type: String, required: true }, // "S1", "S2"...
    // Chunk luật gốc (sourceType 'au_legislation') không thuộc legal_articles nên không có articleId.
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: "LegalArticle" },
    articleSlug: { type: String, default: "" },
    title: { type: String, required: true },
    heading: { type: String, default: "" },
    // 'article' = bài Be.Travel đã duyệt; 'au_legislation' = văn bản luật gốc chưa kiểm chứng.
    sourceType: { type: String, enum: ["article", "au_legislation"], default: "article" },
    // URL chính thức của điều luật, chỉ có với luật gốc (bài nội bộ mở trong app).
    officialUrl: { type: String, default: "" },
  },
  { _id: false },
);

// Sinh timelapse cho AC-05/telemetry (docs/00_..., B.12) -- moi truong hop
// chat phai giai thich duoc TAI SAO tra loi/tu choi.
const retrievalMetaSchema = new mongoose.Schema(
  {
    topScore: { type: Number, default: 0 },
    chunkIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    passed: { type: Boolean, default: false },
  },
  { _id: false },
);

const chatMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatSession",
      required: true,
      index: true,
    },
    role: { type: String, enum: Object.values(ChatRole), required: true },
    text: { type: String, required: true },

    // Chi co o message role=assistant.
    // Luong phan loai (rag/scope.js) va 3 phan co cau truc; `text` van la ban markdown ghep san.
    route: { type: String, default: "legal" },
    sections: {
      type: new mongoose.Schema(
        {
          answer: { type: String, default: "" },
          actions: { type: [String], default: [] },
          avoid: { type: [String], default: [] },
        },
        { _id: false },
      ),
      default: null,
    },
    citations: { type: [citationSchema], default: [] },
    retrieval: { type: retrievalMetaSchema, default: () => ({}) },
    fallbackReason: { type: String, default: null },
    confidence: { type: String, enum: ["high", "medium", "low", null], default: null },
    needsOfficialHelp: { type: Boolean, default: false },

    // Telemetry (khong hien thi UI) -- doi chieu chi phi/hieu nang.
    model: { type: String, default: "" },
    latencyMs: { type: Number, default: 0 },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },

    feedback: { type: String, enum: ["up", "down", null], default: null },

    // "approved_faq": câu trả lời lấy nguyên văn từ FAQ admin đã duyệt (G6), không gọi LLM.
    answerSource: { type: String, enum: ["ai", "approved_faq"], default: "ai" },
    faqId: { type: mongoose.Schema.Types.ObjectId, ref: "ApprovedFaq", default: null, index: true },
  },
  { timestamps: true },
);

chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

export default mongoose.model("ChatMessage", chatMessageSchema);
