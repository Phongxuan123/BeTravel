import mongoose from "mongoose";

import { AssistantKind, AssistantRole, SourceTier } from "../core/constants.js";

const citationSchema = new mongoose.Schema(
  {
    n: { type: Number, required: true },
    title: { type: String, default: "" },
    url: { type: String, default: "" },
    authority: { type: String, default: "" },
    articleSlug: { type: String, default: "" },
  },
  { _id: false },
);

// Tin nhan trong cuoc tro chuyen; tu xoa cung moc expireAt voi cuoc tro chuyen (H2).
const assistantMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssistantConversation",
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: Object.values(AssistantRole), required: true },
    content: { type: String, default: "" },
    kind: { type: String, enum: [...Object.values(AssistantKind), null], default: null },
    sourceTier: { type: String, enum: [...Object.values(SourceTier), null], default: null },
    citations: { type: [citationSchema], default: [] },
    clarifyOptions: { type: [String], default: [] },
    emergencyNumber: { type: String, default: null },
    detailed: { type: Boolean, default: false },
    // Ngu canh chuyen di da dung (D2) -- hien cho nguoi dung thay.
    tripContext: { type: String, default: null },
    expireAt: { type: Date, required: true },
  },
  { timestamps: true },
);

assistantMessageSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("AssistantMessage", assistantMessageSchema);
