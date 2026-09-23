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
    lat: z.number().optional(),
    lng: z.number().optional(),
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
  url: z.string().trim().url("URL nguon khong hop le"),
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

// ── SupportLocation ──────────────────────────────────────────────────────
const geoPointSchema = z.object({
  type: z.literal("Point").default("Point"),
  coordinates: z.tuple([z.number(), z.number()]).describe("[lng, lat] -- KHONG phai [lat, lng]"),
});

export const locationCreateSchema = z.object({
  countryCode: countryCodeSchema,
  type: z.enum(["embassy", "hospital", "police", "pharmacy", "other"]),
  name: z.string().trim().min(1, "Ten dia diem khong duoc de trong"),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  openHours: z.string().trim().optional(),
  location: geoPointSchema,
  verified: z.boolean().optional(),
  source: z.string().trim().optional(),
});

export const locationUpdateSchema = locationCreateSchema.partial();

export const locationListQuerySchema = paginationQuerySchema.extend({
  countryCode: countryCodeSchema.optional(),
  type: z.enum(["embassy", "hospital", "police", "pharmacy", "other"]).optional(),
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
