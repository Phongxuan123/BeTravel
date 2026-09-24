import mongoose from "mongoose";

/*
 * Huong dan xu ly su co (mat ho chieu, tai nan giao thong...). CTA tung buoc
 * (goi dien/mo ban do da loc/hoi AI/lien ket ngoai) NHUNG cung buoc, khong
 * tach bang rieng vi luon duoc doc/sua theo tron incident cha (Rule 9 KISS).
 */
const incidentCtaSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["map", "call", "ai", "link"], required: true },
    label: { type: String, required: true, trim: true },
    // map: {locationType?}; call: {phone?} (rong = dung SDT dai su quan);
    // ai: {question?} prefill man hinh chat; link: {url}.
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const incidentChecklistItemSchema = new mongoose.Schema(
  { label: { type: String, required: true, trim: true } },
  { _id: false },
);

const incidentStepSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    body: { type: [String], default: [] },
    checklist: { type: [incidentChecklistItemSchema], default: [] },
    // Tham chieu lay nhanh trong Admin -- khong bat buoc ton tai (co the tro
    // toi dia diem/bai luat chua nhap ngay tai thoi diem soan workflow).
    contactRefs: { type: [mongoose.Schema.Types.ObjectId], ref: "SupportLocation", default: [] },
    articleRefs: { type: [mongoose.Schema.Types.ObjectId], ref: "LegalArticle", default: [] },
    ctas: { type: [incidentCtaSchema], default: [] },
  },
  { _id: false },
);

const incidentTypeSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    // null = ap dung cho MOI quoc gia (vi du "mat ho chieu" giong nhau khap noi).
    countryCode: { type: String, uppercase: true, trim: true, default: null },
    title: { type: String, required: true, trim: true },
    iconKey: { type: String, default: "IdCard" },
    tone: { type: String, enum: ["blue", "red", "orange", "green"], default: "blue" },
    urgent: { type: Boolean, default: false },
    reassurance: { type: String, default: "" },
    steps: { type: [incidentStepSchema], default: [] },
    // Nhu legal_articles (CLAUDE.md 4.1 "Pre-filter noi dung"): API cong khai
    // CHI duoc tra ve status:'published', tranh lo workflow dang soan do.
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

incidentTypeSchema.index({ countryCode: 1, status: 1 });

export default mongoose.model("IncidentType", incidentTypeSchema);
