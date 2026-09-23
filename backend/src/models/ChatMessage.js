import mongoose from "mongoose";

import { ChatRole } from "../core/constants.js";

const citationSchema = new mongoose.Schema(
  {
    marker: { type: String, required: true }, // "S1", "S2"...
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: "LegalArticle", required: true },
    articleSlug: { type: String, required: true },
    title: { type: String, required: true },
    heading: { type: String, default: "" },
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
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatSession", required: true, index: true },
    role: { type: String, enum: Object.values(ChatRole), required: true },
    text: { type: String, required: true },

    // Chi co o message role=assistant.
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
  },
  { timestamps: true },
);

chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

export default mongoose.model("ChatMessage", chatMessageSchema);
