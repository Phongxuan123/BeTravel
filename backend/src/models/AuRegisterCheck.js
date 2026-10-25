import mongoose from "mongoose";

/*
 * Mã bản biên soạn hiện hành của một luật Úc, ghi lại mỗi lần tra nguồn THÀNH CÔNG. Giữ qua lần
 * khởi động lại (Render ngủ/thức), để câu hỏi đầu tiên sau khi thức không phải chờ nguồn luật Úc
 * vốn hay chập chờn. Chỉ dùng trong hạn AU_REGISTER_MAX_STALE_HOURS (xem rag/retrieval.js).
 */
const auRegisterCheckSchema = new mongoose.Schema(
  {
    titleId: { type: String, required: true, unique: true },
    registerId: { type: String, required: true },
    verifiedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export default mongoose.model("AuRegisterCheck", auRegisterCheckSchema);
