import mongoose from "mongoose";

/*
 * Cau dich san dung o man hinh Dich khan cap (B7) -- vua hien thi de bam
 * nhanh, vua la nguon offline (mobile cache ca danh sach vao AsyncStorage).
 */
const quickPhraseSchema = new mongoose.Schema(
  {
    countryCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    vi: { type: String, required: true, trim: true },
    translated: { type: String, required: true, trim: true },
    phonetic: { type: String, default: "" },
    order: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

quickPhraseSchema.index({ countryCode: 1, order: 1 });

export default mongoose.model("QuickPhrase", quickPhraseSchema);
