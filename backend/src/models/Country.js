import mongoose from "mongoose";

import { CountryStatus } from "../core/constants.js";

/*
 * Danh sach quoc gia ho tro. code la ISO-2 (vi du 'KR', 'JP'). Khong hard-code
 * quoc gia trong business logic o bat ky dau khac -- moi thu di qua bang nay.
 */
// Số hữu ích ngoài bốn số chính (ví dụ đường dây cảnh sát không khẩn cấp, tư vấn y tế). `group` cho biết số này xếp vào ô
// Cảnh sát hay Cấp cứu ở trang chủ để gọi nhanh.
const extraNumberSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    number: { type: String, required: true, trim: true },
    group: { type: String, enum: ["police", "ambulance"], default: "police" },
  },
  { _id: false },
);

const emergencyNumbersSchema = new mongoose.Schema(
  {
    police: { type: String, default: "" },
    ambulance: { type: String, default: "" },
    fire: { type: String, default: "" },
    marine: { type: String, default: "" },
    extra: { type: [extraNumberSchema], default: [] },
  },
  { _id: false },
);

const embassySchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    lat: { type: Number },
    lng: { type: Number },
  },
  { _id: false },
);

const countrySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 2,
    },

    name: { type: String, required: true, trim: true },
    nameEn: { type: String, default: "" },
    aliases: { type: [String], default: [] },
    language: { type: String, default: "" },

    emergencyNumbers: { type: emergencyNumbersSchema, default: () => ({}) },
    embassy: { type: embassySchema, default: () => ({}) },

    // Goi y thanh pho lon cho wizard tao chuyen di (mobile) -- chi la du lieu
    // dia ly tham khao, khong phai noi dung phap ly nen khong ap luat "8 bai
    // co nguon that" cua Rule noi dung. Nguoi dung van go tu do, danh sach
    // nay chi goi y de gom nhanh, khong rang buoc gia tri destinationCity.
    majorCities: { type: [String], default: [] },

    // Tên miền chính phủ mà AI được phép tra web khi kho chưa đủ dữ liệu (rag/webAnswer.js), vd
    // "gov.au" (khớp cả tên miền con). Rỗng = quốc gia này không có tầng tra web.
    officialWebDomains: { type: [String], default: [] },

    status: {
      type: String,
      enum: Object.values(CountryStatus),
      default: CountryStatus.COMING_SOON,
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model("Country", countrySchema);
