import mongoose from "mongoose";

const chatSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    countryCode: { type: String, required: true, uppercase: true },
    // Tieu de hien thi trong danh sach phien -- lay tu cau hoi dau tien, cat ngan.
    title: { type: String, default: "" },
  },
  { timestamps: true },
);

chatSessionSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model("ChatSession", chatSessionSchema);
