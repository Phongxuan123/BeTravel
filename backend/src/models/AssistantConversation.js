import mongoose from "mongoose";

/*
 * Cuoc tro chuyen voi tro ly AI ban 2. Tu xoa theo expireAt (TTL, H2 trong docs/AI_V2_PLAN.md);
 * moi lan co tin nhan moi thi expireAt duoc keo dai.
 */
const assistantConversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    countryCode: { type: String, required: true, uppercase: true },
    title: { type: String, default: "", trim: true },
    expireAt: { type: Date, required: true },
  },
  { timestamps: true },
);

assistantConversationSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
assistantConversationSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model("AssistantConversation", assistantConversationSchema);
