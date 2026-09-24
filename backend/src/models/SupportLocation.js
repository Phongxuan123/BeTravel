import mongoose from "mongoose";

/*
 * Diem ho tro (dai su quan, benh vien, don canh sat...) dung cho SOS map (B6).
 * GeoJSON Point: coordinates LUON la [lng, lat] -- dao nguoc la loi kinh dien
 * (xem CLAUDE.md Phan 6 "Cam bay da biet"). $geoNear can index 2dsphere.
 */
const locationPointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    // [lng, lat] -- KHONG phai [lat, lng].
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length === 2,
        message: "coordinates phai la mang [lng, lat]",
      },
    },
  },
  { _id: false },
);

const supportLocationSchema = new mongoose.Schema(
  {
    countryCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    type: {
      type: String,
      enum: ["embassy", "hospital", "police", "pharmacy", "other"],
      required: true,
    },

    name: { type: String, required: true, trim: true },
    // Ten theo ngon ngu ban dia (vi du tieng Han) -- huu ich khi dua man hinh
    // cho tai xe taxi/nguoi dia phuong xem, khong phai luc nao ten tieng Viet
    // cung nhan ra duoc dia diem.
    nameLocal: { type: String, default: "" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    website: { type: String, default: "" },
    openHours: { type: String, default: "" },

    location: { type: locationPointSchema, required: true },

    // Diem hien thi tren SOS map phai da duoc kiem chung thu cong (goi dien xac minh).
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
    source: { type: String, default: "" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

supportLocationSchema.index({ location: "2dsphere" });
supportLocationSchema.index({ countryCode: 1, type: 1 });

export default mongoose.model("SupportLocation", supportLocationSchema);
