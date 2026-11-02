import { z } from 'zod';

/**
 * Schema Zod doi chieu voi contracts/fixtures/*.json -- chi dung cho TEST
 * (contracts.test.ts), khong dung o runtime vi apiClient.ts da tin tuong
 * kieu TypeScript tu backend. Muc dich: lech hinh dang response se lam do
 * test o day CUNG LUC voi test backend, phat hien truoc khi tich hop.
 */

export const countryFixtureSchema = z.object({
  _id: z.string(),
  code: z.string().length(2),
  name: z.string(),
  nameEn: z.string().optional(),
  language: z.string().optional(),
  emergencyNumbers: z.record(z.string(), z.string()).optional(),
  embassy: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['active', 'coming_soon', 'hidden']),
  createdBy: z.string(),
  updatedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const legalArticleFixtureSchema = z.object({
  _id: z.string(),
  countryCode: z.string(),
  topicSlug: z.string(),
  slug: z.string(),
  version: z.number(),
  isCurrent: z.boolean(),
  status: z.enum(['draft', 'pending_review', 'published', 'superseded', 'archived']),
  title: z.string(),
  summaryVi: z.string(),
  keyPoints: z.array(z.object({ text: z.string(), severity: z.enum(['normal', 'criminal']) })),
  penalties: z.array(z.record(z.string(), z.unknown())),
  exceptions: z.array(z.string()),
  foreignerNotes: z.array(z.string()),
  bodyMd: z.string(),
  sources: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      authority: z.string(),
      kind: z.string(),
      publishedAt: z.string(),
      accessedAt: z.string(),
    }),
  ),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  riskLevel: z.enum(['info', 'warn', 'danger']),
  tags: z.array(z.string()),
  supersedesId: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  reviewedAt: z.string().nullable(),
  reviewNote: z.string(),
  indexState: z.object({
    status: z.string(),
    chunkCount: z.number(),
    lastIndexedAt: z.string().nullable(),
    embeddingModel: z.string(),
    error: z.string(),
  }),
  createdBy: z.string(),
  updatedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Tro ly AI ban 2 -- Admin (contracts/README.md muc 26).
const assistantKindSchema = z.enum(['answer', 'emergency', 'clarify', 'refuse_scope', 'refuse_harm']);
const assistantSourceTierSchema = z.enum(['official', 'web', 'general']);

export const assistantSettingsFixtureSchema = z.strictObject({
  enabled: z.boolean(),
  envEnabled: z.boolean(),
  active: z.boolean(),
  updatedAt: z.string().nullable(),
});

export const assistantQaItemFixtureSchema = z.strictObject({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  countryCode: z.string().nullable(),
  kind: assistantKindSchema.nullable(),
  sourceTier: assistantSourceTierSchema.nullable(),
  detailed: z.boolean(),
  citations: z.array(z.strictObject({ n: z.number(), title: z.string() })),
  telemetry: z
    .strictObject({
      latencyMs: z.number(),
      promptTokens: z.number(),
      completionTokens: z.number(),
      costEstimateVnd: z.number(),
      guardViolations: z.number(),
    })
    .nullable(),
  createdAt: z.string(),
});

const assistantDayMetricsShape = {
  questions: z.number(),
  costEstimateVnd: z.number(),
  p50LatencyMs: z.number(),
  p90LatencyMs: z.number(),
  refusals: z.number(),
  refusalRate: z.number(),
};

export const assistantMetricsFixtureSchema = z.strictObject({
  days: z.number(),
  from: z.string(),
  to: z.string(),
  totals: z.strictObject({ ...assistantDayMetricsShape, guardViolations: z.number() }),
  daily: z.array(z.strictObject({ date: z.string(), ...assistantDayMetricsShape })),
});

export const errorEnvelopeSchema = z.object({
  code: z.enum([
    'VALIDATION_ERROR',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'CONFLICT',
    'RATE_LIMITED',
    'QUOTA_EXCEEDED',
    'UPSTREAM_ERROR',
    'INSUFFICIENT_EVIDENCE',
    'INTERNAL_ERROR',
  ]),
  message: z.string(),
  details: z.unknown().optional(),
});
