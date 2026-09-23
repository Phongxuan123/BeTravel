import mongoose from "mongoose";

/*
 * Chuyen di cua mot user. Chi duoc phep TOI DA mot ban ghi isCurrent:true moi
 * user tai mot thoi diem -- ep bang partial unique index ben duoi, cung mau
 * phong thu nhu (countryCode,slug,isCurrent) cua LegalArticle. Service tao
 * moi (tripService.createTrip) luon dat isCurrent:false, chi
 * tripService.setCurrentTrip moi doi trang thai "chuyen di chinh".
 */
const tripSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    countryCode: { type: String, required: true, uppercase: true, trim: true },
    // Dia diem do NGUOI DUNG nhap khi tao chuyen di. Tuyet doi khong suy ra
    // tu thu do quoc gia (vi du KR != mac dinh Seoul).
    destinationCity: { type: String, required: true, trim: true, maxlength: 100 },
    destinationDetail: { type: String, trim: true, maxlength: 240, default: "" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isCurrent: { type: Boolean, default: false },
  },
  { timestamps: true },
);

tripSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { isCurrent: true } },
);

export default mongoose.model("Trip", tripSchema);
