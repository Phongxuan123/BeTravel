import mongoose from "mongoose";
import { RiskLevel } from "../core/constants.js";

/*
 * Canh bao theo vi tri (B8) -- admin phat mot canh bao ap dung cho CA NUOC
 * (scope:'country') hoac mot KHU VUC cu the (scope:'area', tam + ban kinh met).
 * Khong co khai niem "da doc" luu server -- dismiss la state CUC BO tren may
 * (AsyncStorage, xem mobile/src/lib/api/alerts.ts), tranh phai dong bo trang
 * thai doc rieng cho tung nguoi dung/tung thiet bi.
 */
const geoAlertPointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    // [lng, lat] -- KHONG phai [lat, lng] (CLAUDE.md Phan 6 "Cam bay da biet").
    coordinates: {
      type: [Number],
      validate: {
        validator: (value) => !value || (Array.isArray(value) && value.length === 2),
        message: "coordinates phai la mang [lng, lat]",
      },
    },
  },
  { _id: false },
);

const geoAlertSchema = new mongoose.Schema(
  {
    countryCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    scope: { type: String, enum: ["country", "area"], required: true },

    // Chi bat buoc khi scope:'area' -- validate o tang Zod (geoAlertCreateSchema),
    // khong ep required o day de scope:'country' khong can gui center/radiusM.
    center: { type: geoAlertPointSchema, default: undefined },
    radiusM: { type: Number, default: undefined },

    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    severity: { type: String, enum: Object.values(RiskLevel), default: RiskLevel.WARN },
    behaviorsToAvoid: { type: [String], default: [] },
    linkedArticleId: { type: mongoose.Schema.Types.ObjectId, ref: "LegalArticle", default: null },

    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null },

    // Nhu IncidentType (B7): 'draft' dang soan khong duoc lot ra API cong khai.
    status: { type: String, enum: ["draft", "published"], default: "draft" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

geoAlertSchema.index({ center: "2dsphere" }, { sparse: true });
geoAlertSchema.index({ countryCode: 1, status: 1, effectiveFrom: 1, effectiveTo: 1 });

export default mongoose.model("GeoAlert", geoAlertSchema);
