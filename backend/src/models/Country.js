import mongoose from "mongoose";

import { CountryStatus } from "../core/constants.js";

/*
 * Danh sach quoc gia ho tro. code la ISO-2 (vi du 'KR', 'JP'). Khong hard-code
 * quoc gia trong business logic o bat ky dau khac -- moi thu di qua bang nay.
 */
const emergencyNumbersSchema = new mongoose.Schema(
  {
    police: { type: String, default: "" },
    ambulance: { type: String, default: "" },
    fire: { type: String, default: "" },
    marine: { type: String, default: "" },
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
    language: { type: String, default: "" },

    emergencyNumbers: { type: emergencyNumbersSchema, default: () => ({}) },
    embassy: { type: embassySchema, default: () => ({}) },

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
