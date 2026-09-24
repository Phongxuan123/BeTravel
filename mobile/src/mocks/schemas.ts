import { z } from 'zod';

// Envelope chuẩn {ok, data} theo spec mục 0.2 (Q2) — giữ nguyên khi nối API thật.
export function envelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({ ok: z.literal(true), data });
}

export const emergencyNumbersSchema = z.object({
  police: z.string(),
  ambulance: z.string(),
  fire: z.string(),
  marine: z.string(),
});

export const embassySchema = z.object({
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  lat: z.number(),
  lng: z.number(),
  openTime: z.string(),
  closeTime: z.string(),
  distanceKm: z.number(),
});

export const countrySchema = z.object({
  __mock: z.literal(true).optional(),
  code: z.string(),
  name: z.string(),
  region: z.string(),
  language: z.string(),
  regulationsCount: z.number(),
  currentCity: z.string(),
  // Chi API that (B3) moi dat field nay -- 'coming_soon' nghia la da co du
  // lieu trong DB nhung chua mo cho nguoi dung (xem adapters.ts#adaptCountry).
  status: z.enum(['active', 'coming_soon']).optional(),
  emergencyNumbers: emergencyNumbersSchema,
  embassy: embassySchema,
});
export type Country = z.infer<typeof countrySchema>;

export const topicSchema = z.object({
  __mock: z.literal(true).optional(),
  key: z.string(),
  countryCode: z.string(),
  label: z.string(),
  iconKey: z.enum(['entry', 'traffic', 'public', 'documents', 'fines', 'security']),
  count: z.number(),
});
export type Topic = z.infer<typeof topicSchema>;

export const articleKeyPointSchema = z.object({
  text: z.string(),
  severity: z.enum(['normal', 'criminal']),
});

export const articleSchema = z.object({
  __mock: z.literal(true).optional(),
  id: z.string(),
  slug: z.string(),
  countryCode: z.string(),
  topicKey: z.string(),
  title: z.string(),
  summary: z.string(),
  status: z.literal('active'),
  updatedAt: z.string(),
  source: z.object({ name: z.string(), agency: z.string(), url: z.string() }),
  keyPoints: z.array(articleKeyPointSchema),
  fines: z.array(z.string()),
  exceptions: z.array(z.string()),
  foreignerNotes: z.array(z.string()),
  saved: z.boolean(),
});
export type Article = z.infer<typeof articleSchema>;

export const tripSchema = z.object({
  __mock: z.literal(true).optional(),
  id: z.string(),
  countryCode: z.string(),
  destinationCity: z.string(),
  destinationDetail: z.string().optional(),
  locationAlerts: z.boolean().default(true),
  regulationAlerts: z.boolean().default(true),
  startDate: z.string(),
  endDate: z.string(),
  isCurrent: z.boolean(),
});
export type Trip = z.infer<typeof tripSchema>;

// cta.type: 'map' (mo SOS map da loc theo payload.locationType) · 'call'
// (goi payload.phone, rong = dung SDT dai su quan) · 'ai' (prefill man hinh
// chat voi payload.question) · 'link' (mo payload.url). Them cho B7.
export const incidentCtaSchema = z.object({
  type: z.enum(['map', 'call', 'ai', 'link']),
  label: z.string(),
  payload: z.record(z.string(), z.unknown()),
});

export const incidentStepSchema = z.object({
  // order + contactRefs/articleRefs/ctas la field MO RONG cho B7 (tien do
  // luu server theo step.order, CTA ngu canh tung buoc) -- optional de fixture
  // cu (neu con) khong vo type, nhung du lieu that/moi luon co day du.
  order: z.number().optional(),
  title: z.string(),
  body: z.array(z.string()),
  checklist: z.array(z.object({ label: z.string() })).optional(),
  contactRefs: z.array(z.string()).optional(),
  articleRefs: z.array(z.string()).optional(),
  ctas: z.array(incidentCtaSchema).optional(),
});

export const incidentSchema = z.object({
  __mock: z.literal(true).optional(),
  // _id can cho API tien do (/users/incident-progress/:incidentId) -- rong o
  // du lieu gia lap cu, luon co that o API/fixture moi.
  _id: z.string().optional(),
  slug: z.string(),
  countryCode: z.string().nullable().optional(),
  title: z.string(),
  iconKey: z.string(),
  tone: z.enum(['blue', 'red', 'orange', 'green']),
  urgent: z.boolean(),
  reassurance: z.string(),
  steps: z.array(incidentStepSchema),
});
export type Incident = z.infer<typeof incidentSchema>;

export const alertSchema = z.object({
  __mock: z.literal(true).optional(),
  id: z.string(),
  category: z.enum(['legal', 'safety', 'trip']),
  title: z.string(),
  body: z.string(),
  meta: z.string(),
  read: z.boolean(),
  createdAt: z.string(),
});
export type Alert = z.infer<typeof alertSchema>;

export const quickPhraseSchema = z.object({
  __mock: z.literal(true).optional(),
  id: z.string(),
  countryCode: z.string(),
  vi: z.string(),
  translated: z.string(),
  phonetic: z.string(),
});
export type QuickPhrase = z.infer<typeof quickPhraseSchema>;

// nameLocal/address/openHours/website/verified/verifiedAt la field MO RONG cho
// B6 (man hinh chi tiet diem SOS) -- optional de khong pha vo du lieu gia lap cu.
// distanceKm chuyen thanh optional vi API that co endpoint KHONG gan voi vi tri
// nguoi dung (GET /support-locations theo quoc gia, khong co khai niem "khoang cach").
export const supportLocationSchema = z.object({
  __mock: z.literal(true).optional(),
  id: z.string(),
  type: z.enum(['police', 'hospital', 'embassy', 'pharmacy', 'other']),
  name: z.string(),
  nameLocal: z.string().optional(),
  meta: z.string(),
  address: z.string().optional(),
  openHours: z.string().optional(),
  website: z.string().optional(),
  verified: z.boolean().optional(),
  verifiedAt: z.string().nullable().optional(),
  distanceKm: z.number().optional(),
  phone: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  featured: z.boolean().optional(),
});
export type SupportLocation = z.infer<typeof supportLocationSchema>;

export const searchResultSchema = z.object({
  __mock: z.literal(true).optional(),
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  topicLabel: z.string(),
  source: z.string(),
  countryCode: z.string(),
  slug: z.string(),
});
export type SearchResultItem = z.infer<typeof searchResultSchema>;
