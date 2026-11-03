import mongoose from "mongoose";
import { RiskLevel, RiskZoneCategory } from "../core/constants.js";

/*
 * Vung nguy co tren ban do (tai nan, di nguoc chieu, trom cap...). Khac GeoAlert:
 * khong co han hieu luc va khong phat banner -- chi ve lop vong tron tren SOS map.
 * Moi vung PHAI co nguon + ky so lieu truoc khi published (kiem o tang Zod,
 * xem riskZoneCreateSchema); vung chua co nguon thi de 'draft' (CLAUDE.md 4.1).
 */
const riskZonePointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    // [lng, lat] -- KHONG phai [lat, lng] (CLAUDE.md Phan 6 "Cam bay da biet").
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

// Ranh gioi khoanh vung: GeoJSON Polygon, coordinates[0] la vong ngoai [[lng, lat], ...] va dong kin.
const riskZoneAreaSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Polygon"], default: "Polygon" },
    coordinates: { type: [[[Number]]], required: true },
  },
  { _id: false },
);

const riskZoneSourceSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    url: { type: String, default: "" },
    // Ky so lieu, vi du "2014-2019" -- de nguoi dung biet so lieu cu hay moi.
    period: { type: String, default: "" },
  },
  { _id: false },
);

const riskZoneSchema = new mongoose.Schema(
  {
    countryCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    category: { type: String, enum: Object.values(RiskZoneCategory), required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    severity: { type: String, enum: Object.values(RiskLevel), default: RiskLevel.WARN },
    center: { type: riskZonePointSchema, required: true },
    // Co 'area' thi ve da giac; khong co thi ve hinh tron tu center + radiusM (xem riskZoneCreateSchema).
    area: { type: riskZoneAreaSchema, default: undefined },
    radiusM: { type: Number, default: undefined },
    tips: { type: [String], default: [] },
    source: { type: riskZoneSourceSchema, default: () => ({}) },
    // Ghi chu noi bo cho admin (vi du "can doi chieu lai voi nguon goc"), KHONG tra ra API cong khai.
    reviewNote: { type: String, default: "" },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

riskZoneSchema.index({ countryCode: 1, status: 1, category: 1 });

export default mongoose.model("RiskZone", riskZoneSchema);
