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
  startDate: z.string(),
  endDate: z.string(),
  isCurrent: z.boolean(),
});
export type Trip = z.infer<typeof tripSchema>;

export const incidentStepSchema = z.object({
  title: z.string(),
  body: z.array(z.string()),
  checklist: z.array(z.object({ label: z.string(), checked: z.boolean() })).optional(),
});

export const incidentSchema = z.object({
  __mock: z.literal(true).optional(),
  slug: z.string(),
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

export const supportLocationSchema = z.object({
  __mock: z.literal(true).optional(),
  id: z.string(),
  type: z.enum(['police', 'hospital', 'embassy', 'other']),
  name: z.string(),
  meta: z.string(),
  distanceKm: z.number(),
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
