import mongoose from "mongoose";

/*
 * Telemetry moi lan goi RAG (ca khi tu choi) -- dung de doi soat chi phi va
 * debug chat luong retrieval sau nay. KHONG dung de hien thi cho nguoi dung.
 */
const aiEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatSession" },
    countryCode: { type: String, required: true },
    questionHash: { type: String, required: true },
    // Luu ca van ban goc (khong chi hash) -- "TOP CAU HOI BI FALLBACK" (A01)
    // can hien thi duoc cho doi noi dung doc, hash mot chieu khong dung duoc.
    question: { type: String, default: "" },
    chunkIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    topScore: { type: Number, default: 0 },
    model: { type: String, default: "" },
    embeddingModel: { type: String, default: "" },
    latencyMs: { type: Number, default: 0 },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    costEstimateUsd: { type: Number, default: 0 },
    fallbackReason: { type: String, default: null },
    cacheHit: { type: Boolean, default: false },
  },
  { timestamps: true },
);

aiEventSchema.index({ createdAt: -1 });

export default mongoose.model("AiEvent", aiEventSchema);
