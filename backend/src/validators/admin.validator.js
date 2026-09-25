import { z } from "zod";

import {
  ContentStatusValues,
  KeyPointSeverity,
  RiskLevel,
  SourceKind,
  CountryStatus,
  FeedbackRating,
  FeedbackStatusValues,
} from "../core/constants.js";

/*
 * Zod schema cho toan bo endpoint /api/admin/*. Tach rieng khoi auth.validator.js
 * vi day la mien nghiep vu khac (quan tri noi dung, khong phai xac thuc).
 */

const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(2, "Ma quoc gia phai la ISO-2 (2 ky tu)");

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Slug khong duoc de trong")
  .regex(/^[a-z0-9-]+$/, "Slug chi duoc chua chu thuong, so va dau gach ngang");

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// ── Country ──────────────────────────────────────────────────────────────
const emergencyNumbersSchema = z
  .object({
    police: z.string().optional(),
    ambulance: z.string().optional(),
    fire: z.string().optional(),
    marine: z.string().optional(),
  })
  .partial()
  .optional();

const embassySchema = z
  .object({
    name: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  })
  .partial()
  .optional();

export const countryCreateSchema = z.object({
  code: countryCodeSchema,
  name: z.string().trim().min(1, "Ten quoc gia khong duoc de trong"),
  nameEn: z.string().trim().optional(),
  language: z.string().trim().optional(),
  emergencyNumbers: emergencyNumbersSchema,
  embassy: embassySchema,
  status: z.enum(Object.values(CountryStatus)).optional(),
});

export const countryUpdateSchema = countryCreateSchema.partial().extend({
  code: countryCodeSchema.optional(),
});

export const countryListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(Object.values(CountryStatus)).optional(),
});

// ── LegalTopic ───────────────────────────────────────────────────────────
export const topicCreateSchema = z.object({
  countryCode: countryCodeSchema,
  slug: slugSchema,
  label: z.string().trim().min(1, "Nhan chu de khong duoc de trong"),
  icon: z.string().trim().optional(),
  order: z.coerce.number().int().optional(),
});

export const topicUpdateSchema = topicCreateSchema.partial();

export const topicListQuerySchema = paginationQuerySchema.extend({
  countryCode: countryCodeSchema.optional(),
});

// ── LegalArticle ─────────────────────────────────────────────────────────
const keyPointSchema = z.object({
  text: z.string().trim().min(1),
  severity: z.enum(Object.values(KeyPointSeverity)).default(KeyPointSeverity.NORMAL),
});

const penaltySchema = z.object({
  behavior: z.string().trim().min(1),
  amountText: z.string().trim().optional(),
  amountMin: z.number().optional(),
  amountMax: z.number().optional(),
  currency: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

const sourceSchema = z.object({
  title: z.string().trim().min(1),
  url: z
    .string()
    .trim()
    .url("URL nguon khong hop le")
    .regex(/^https?:\/\//i, "Nguồn phải dùng HTTP hoặc HTTPS"),
  authority: z.string().trim().min(1),
  kind: z.enum(Object.values(SourceKind)).default(SourceKind.OTHER),
  publishedAt: z.coerce.date().optional(),
  accessedAt: z.coerce.date().optional(),
});

export const articleCreateSchema = z.object({
  countryCode: countryCodeSchema,
  topicSlug: slugSchema,
  slug: slugSchema,
  title: z.string().trim().min(1, "Tieu de khong duoc de trong"),
  summaryVi: z.string().trim().optional(),
  keyPoints: z.array(keyPointSchema).optional(),
  penalties: z.array(penaltySchema).optional(),
  exceptions: z.array(z.string().trim()).optional(),
  foreignerNotes: z.array(z.string().trim()).optional(),
  bodyMd: z.string().optional(),
  sources: z.array(sourceSchema).optional(),
  effectiveFrom: z.coerce.date().optional(),
  effectiveTo: z.coerce.date().optional().nullable(),
  riskLevel: z.enum(Object.values(RiskLevel)).optional(),
  tags: z.array(z.string().trim()).optional(),
});

/*
 * PATCH bai luat: bat buoc kem `updatedAt` cua ban dang xem, de backend phat
 * hien ghi de (hai nguoi cung sua). Xem legalArticle.service.js#updateArticle.
 */
export const articleUpdateSchema = articleCreateSchema.partial().extend({
  updatedAt: z.coerce.date({ required_error: "Thieu updatedAt -- khong the kiem tra ghi de" }),
});

export const articleListQuerySchema = paginationQuerySchema.extend({
  countryCode: countryCodeSchema.optional(),
  topicSlug: slugSchema.optional(),
  status: z.enum(ContentStatusValues).optional(),
  search: z.string().trim().optional(),
});

export const articleStatusChangeSchema = z.object({
  status: z.enum(ContentStatusValues),
  note: z.string().trim().optional(),
});

// ── SupportLocation (B2 CRUD + B6 publish validate/bulk) ────────────────
const LOCATION_TYPES = ["embassy", "hospital", "police", "pharmacy", "other"];

const geoPointSchema = z.object({
  type: z.literal("Point").default("Point"),
  // [lng, lat] -- KHONG phai [lat, lng]. Chan luon toa do vo ly (vi du dao
  // thu tu lat/lng se ra gia tri ngoai khoang, bat duoc ngay o day.
  coordinates: z
    .tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)])
    .describe("[lng, lat] -- KHONG phai [lat, lng]"),
});

const locationBaseSchema = z.object({
  countryCode: countryCodeSchema,
  type: z.enum(LOCATION_TYPES),
  name: z.string().trim().min(1, "Ten dia diem khong duoc de trong"),
  nameLocal: z.string().trim().optional(),
  address: z.string().trim().min(1, "Dia chi khong duoc de trong"),
  phone: z.string().trim().optional(),
  website: z
    .string()
    .trim()
    .url("Website khong hop le")
    .regex(/^https?:\/\//i, "Website phải dùng HTTP hoặc HTTPS")
    .optional()
    .or(z.literal("")),
  openHours: z.string().trim().optional(),
  location: geoPointSchema,
  verified: z.boolean().optional(),
  source: z.string().trim().optional(),
});

// Diem hien thi cho nguoi dung PHAI co it nhat 1 kenh lien lac (goi hoac tra
// cuu website) -- mot dia diem chi co ten+dia chi thi khong the "Goi ngay"
// duoc, giam gia tri cua tinh nang SOS (CLAUDE.md B6 prompt muc 3).
export const locationCreateSchema = locationBaseSchema.refine(
  (data) => Boolean(data.phone?.trim()) || Boolean(data.website?.trim()),
  { message: "Can it nhat 1 trong 2: so dien thoai hoac website", path: ["phone"] },
);

export const locationUpdateSchema = locationBaseSchema.partial();

export const locationListQuerySchema = paginationQuerySchema.extend({
  countryCode: countryCodeSchema.optional(),
  type: z.enum(LOCATION_TYPES).optional(),
});

// Moi dong CSV co the thieu truong (nguoi nhap lieu go tay) -- de tat ca
// optional o tang schema, phan xu ly rieng tung dong o service quyet dinh
// tao hay bo qua + ghi ly do, thay vi 1 dong sai lam VALIDATION_ERROR ca file.
export const locationBulkImportSchema = z.object({
  rows: z.array(z.unknown()).min(1).max(200),
});

export const locationBulkVerifySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
});

// ── AuditLog ─────────────────────────────────────────────────────────────
export const auditListQuerySchema = paginationQuerySchema.extend({
  entityType: z.string().trim().optional(),
  actorId: z.string().trim().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// ── RAG (B4) ─────────────────────────────────────────────────────────────
export const ragReindexCountrySchema = z.object({
  countryCode: countryCodeSchema,
});

export const ragStatusQuerySchema = z.object({
  countryCode: countryCodeSchema.optional(),
});

// ── Feedback queue (B5, A08) ────────────────────────────────────────────
export const feedbackListQuerySchema = paginationQuerySchema.extend({
  rating: z.enum(Object.values(FeedbackRating)).optional(),
  status: z.enum(FeedbackStatusValues).optional(),
  countryCode: countryCodeSchema.optional(),
});

export const feedbackStatusUpdateSchema = z.object({
  status: z.enum(FeedbackStatusValues),
  reviewerNote: z.string().trim().max(1000).optional(),
});

// ── Analytics (B5, A01 nang cap) ────────────────────────────────────────
export const analyticsOverviewQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).optional(),
});

// ── IncidentType (B7, A07 Incident Workflow Builder) ────────────────────
const incidentCtaSchema = z.object({
  type: z.enum(["map", "call", "ai", "link"]),
  label: z.string().trim().min(1, "Nhan CTA khong duoc de trong"),
  payload: z.record(z.string(), z.unknown()).optional().default({}),
});

const incidentChecklistItemSchema = z.object({
  label: z.string().trim().min(1, "Noi dung checklist khong duoc de trong"),
});

const incidentStepSchema = z.object({
  title: z.string().trim().min(1, "Tieu de buoc khong duoc de trong"),
  body: z.array(z.string().trim()).optional().default([]),
  checklist: z.array(incidentChecklistItemSchema).optional().default([]),
  contactRefs: z.array(z.string().min(1)).optional().default([]),
  articleRefs: z.array(z.string().min(1)).optional().default([]),
  ctas: z.array(incidentCtaSchema).optional().default([]),
});

export const incidentCreateSchema = z.object({
  slug: slugSchema,
  // null = ap dung cho moi quoc gia -- nullable rieng vi countryCodeSchema
  // (length 2) khong chap nhan gia tri rong.
  countryCode: countryCodeSchema.nullable().optional(),
  title: z.string().trim().min(1, "Tieu de khong duoc de trong"),
  iconKey: z.string().trim().optional(),
  tone: z.enum(["blue", "red", "orange", "green"]).optional(),
  urgent: z.boolean().optional(),
  reassurance: z.string().trim().optional(),
  steps: z.array(incidentStepSchema).optional().default([]),
  status: z.enum(["draft", "published"]).optional(),
});

export const incidentUpdateSchema = incidentCreateSchema.partial();

export const incidentListQuerySchema = paginationQuerySchema.extend({
  countryCode: countryCodeSchema.optional(),
  status: z.enum(["draft", "published"]).optional(),
});

// ── QuickPhrase (B7 Translator) ──────────────────────────────────────────
export const quickPhraseCreateSchema = z.object({
  countryCode: countryCodeSchema,
  vi: z.string().trim().min(1, "Cau tieng Viet khong duoc de trong"),
  translated: z.string().trim().min(1, "Ban dich khong duoc de trong"),
  phonetic: z.string().trim().optional(),
  order: z.coerce.number().int().optional(),
});

export const quickPhraseUpdateSchema = quickPhraseCreateSchema.partial();

export const quickPhraseListQuerySchema = paginationQuerySchema.extend({
  countryCode: countryCodeSchema.optional(),
});
