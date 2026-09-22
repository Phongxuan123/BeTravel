import mongoose from "mongoose";

import {
  ContentStatus,
  ContentStatusValues,
  KeyPointSeverity,
  RiskLevel,
  SourceKind,
  IndexStateStatus,
} from "../core/constants.js";

/*
 * legal_articles la trung tam cua san pham: noi dung phap ly da kiem chung,
 * hien thi truc tiep cho nguoi dung VA la nguon de chunk cho RAG (B4).
 * Vong doi: draft -> pending_review -> published -> superseded/archived.
 * Xem docs/00_BeTravel_MasterPlan_v2.md Phan C.3 cho day du field.
 */

const keyPointSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    severity: {
      type: String,
      enum: Object.values(KeyPointSeverity),
      default: KeyPointSeverity.NORMAL,
    },
  },
  { _id: false },
);

const penaltySchema = new mongoose.Schema(
  {
    behavior: { type: String, required: true, trim: true },
    amountText: { type: String, default: "" },
    amountMin: { type: Number },
    amountMax: { type: Number },
    currency: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  { _id: false },
);

const sourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    authority: { type: String, required: true, trim: true },
    kind: { type: String, enum: Object.values(SourceKind), default: SourceKind.OTHER },
    publishedAt: { type: Date },
    accessedAt: { type: Date },
  },
  { _id: false },
);

// B4 doc field nay de biet chunk da danh index chua, khong tin field status
// copy tren chunk (xem CLAUDE.md Phan 4.2 -- hau kiem bang code).
const indexStateSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(IndexStateStatus),
      default: IndexStateStatus.NOT_INDEXED,
    },
    chunkCount: { type: Number, default: 0 },
    lastIndexedAt: { type: Date, default: null },
    embeddingModel: { type: String, default: "" },
    error: { type: String, default: "" },
  },
  { _id: false },
);

const legalArticleSchema = new mongoose.Schema(
  {
    countryCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    topicSlug: { type: String, required: true, trim: true, lowercase: true },
    slug: { type: String, required: true, trim: true, lowercase: true },

    version: { type: Number, required: true, default: 1, min: 1 },
    // Chi mot version moi (countryCode,slug) duoc isCurrent:true tai mot thoi diem
    // -- ep bang partial unique index ben duoi, khong chi dua vao logic ung dung.
    isCurrent: { type: Boolean, default: true },

    status: {
      type: String,
      enum: ContentStatusValues,
      default: ContentStatus.DRAFT,
      index: true,
    },

    title: { type: String, required: true, trim: true },
    summaryVi: { type: String, default: "" },

    keyPoints: { type: [keyPointSchema], default: [] },
    penalties: { type: [penaltySchema], default: [] },
    exceptions: { type: [String], default: [] },
    foreignerNotes: { type: [String], default: [] },

    // Noi dung day du, dung de chunk cho RAG.
    bodyMd: { type: String, default: "" },

    sources: { type: [sourceSchema], default: [] },

    effectiveFrom: { type: Date },
    effectiveTo: { type: Date, default: null },

    riskLevel: { type: String, enum: Object.values(RiskLevel), default: RiskLevel.INFO },
    tags: { type: [String], default: [] },

    supersedesId: { type: mongoose.Schema.Types.ObjectId, ref: "LegalArticle", default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    // Ghi chu kem theo lan doi trang thai gan nhat (vi du ly do tu choi publish).
    reviewNote: { type: String, default: "" },

    indexState: { type: indexStateSchema, default: () => ({}) },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Moi (countryCode, slug, version) la duy nhat -- khong hai ban ghi cung version.
legalArticleSchema.index({ countryCode: 1, slug: 1, version: 1 }, { unique: true });

// PARTIAL UNIQUE: chi ap dung cho ban ghi co isCurrent:true -- cho phep nhieu
// version cua cung (countryCode,slug) cung ton tai (lich su), nhung DUY NHAT
// mot ban duoc coi la "hien hanh" tai moi thoi diem. Day la lop phong thu
// chinh chong hai version cung isCurrent (Rui ro R-DATA trong master plan).
legalArticleSchema.index(
  { countryCode: 1, slug: 1 },
  { unique: true, partialFilterExpression: { isCurrent: true } },
);

legalArticleSchema.index({ countryCode: 1, status: 1 });
legalArticleSchema.index({ title: "text", summaryVi: "text" });

export default mongoose.model("LegalArticle", legalArticleSchema);
