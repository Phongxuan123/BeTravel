import mongoose from "mongoose";

/*
 * "Da luu" cua nguoi dung (B8) -- mot ban ghi tro toi 1 doi tuong thuoc 1 trong
 * 3 loai. targetId la ObjectId cua LegalArticle/SupportLocation/IncidentType
 * TUY targetType, khong dat ref co dinh (Mongoose ho tro refPath cho dung viec
 * nay). Bai luat sieu quyen (superseded) van luu duoc -- co gan co isOutdated
 * O TANG SERVICE khi doc ra, khong xoa favorite khi bai bi thay the.
 */
const favoriteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetType: { type: String, enum: ["article", "location", "incident"], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);

favoriteSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });
favoriteSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Favorite", favoriteSchema);
