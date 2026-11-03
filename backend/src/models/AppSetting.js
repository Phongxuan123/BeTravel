import mongoose from "mongoose";

/*
 * Cau hinh van hanh doi duoc luc dang chay (vd cong tac tat nhanh tro ly AI, H1) -- dang
 * key/value de them cong tac moi khong can collection moi. KHONG dung cho secret: secret o env.
 */
const appSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

export default mongoose.model("AppSetting", appSettingSchema);
