// Khop 1-1 voi backend/src/models/*.js va backend/src/core/constants.js.
// Doi field o day thi doi ca hai phia trong CUNG mot commit (contracts/README.md).

export type ContentStatus = 'draft' | 'pending_review' | 'published' | 'superseded' | 'archived';
export type CountryStatus = 'active' | 'coming_soon';
export type RiskLevel = 'info' | 'warn' | 'danger';
export type SourceKind = 'gov' | 'news' | 'legal_text' | 'embassy' | 'other';
export type KeyPointSeverity = 'normal' | 'criminal';
export type LocationType = 'embassy' | 'hospital' | 'police' | 'pharmacy' | 'other';

export type Country = {
  _id: string;
  code: string;
  name: string;
  nameEn?: string;
  language?: string;
  emergencyNumbers?: { police?: string; ambulance?: string; fire?: string; marine?: string };
  embassy?: { name?: string; address?: string; phone?: string; lat?: number; lng?: number };
  status: CountryStatus;
  createdAt: string;
  updatedAt: string;
};

export type LegalTopic = {
  _id: string;
  countryCode: string;
  slug: string;
  label: string;
  icon?: string;
  order?: number;
  createdAt: string;
  updatedAt: string;
};

export type KeyPoint = { text: string; severity: KeyPointSeverity };
export type Penalty = {
  behavior: string;
  amountText?: string;
  amountMin?: number;
  amountMax?: number;
  currency?: string;
  note?: string;
};
export type ArticleSource = {
  title: string;
  url: string;
  authority: string;
  kind: SourceKind;
  publishedAt?: string;
  accessedAt?: string;
};

export type IndexState = {
  status: 'not_indexed' | 'queued' | 'indexing' | 'indexed' | 'failed';
  chunkCount: number;
  lastIndexedAt: string | null;
  embeddingModel: string;
  error: string;
};

export type LegalArticle = {
  _id: string;
  countryCode: string;
  topicSlug: string;
  slug: string;
  version: number;
  isCurrent: boolean;
  status: ContentStatus;
  title: string;
  summaryVi: string;
  keyPoints: KeyPoint[];
  penalties: Penalty[];
  exceptions: string[];
  foreignerNotes: string[];
  bodyMd: string;
  sources: ArticleSource[];
  effectiveFrom?: string;
  effectiveTo?: string | null;
  riskLevel: RiskLevel;
  tags: string[];
  supersedesId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string;
  indexState: IndexState;
  createdAt: string;
  updatedAt: string;
};

export type SupportLocation = {
  _id: string;
  countryCode: string;
  type: LocationType;
  name: string;
  nameLocal?: string;
  address?: string;
  phone?: string;
  website?: string;
  openHours?: string;
  location: { type: 'Point'; coordinates: [number, number] };
  verified: boolean;
  verifiedAt: string | null;
  source?: string;
  createdAt: string;
  updatedAt: string;
};

// B6 -- ket qua bulk import CSV (backend/src/services/supportLocation.service.js#bulkImportLocations).
export type LocationBulkImportResult = {
  createdCount: number;
  createdIds: string[];
  skipped: { index: number; name: string; reason: string }[];
};

export type AuditLog = {
  _id: string;
  actorId: string;
  actorUsername?: string;
  action: string;
  entityType: string;
  entityId: string;
  diff: { before: unknown; after: unknown };
  ip: string;
  createdAt: string;
};

export type DashboardSummary = {
  articlesByStatus: Record<ContentStatus, number>;
  articlesTotal: number;
  countryCount: number;
  locationCount: number;
  failedJobCount: number;
};

// B4 -- trang thai index RAG cua tung bai luat (chi bai published+isCurrent moi
// duoc index, xem backend/src/services/ragAdmin.service.js).
export type RagIndexState = {
  status: 'not_indexed' | 'queued' | 'indexing' | 'indexed' | 'failed';
  chunkCount: number;
  lastIndexedAt: string | null;
  embeddingModel: string;
  error: string;
};

export type RagArticleStatus = {
  _id: string;
  title: string;
  slug: string;
  countryCode: string;
  topicSlug: string;
  indexState: RagIndexState;
  updatedAt: string;
};

// B5 -- module feedback (A08). Rieng voi ChatMessage.feedback (thumbs nhanh).
export type FeedbackRating = 'up' | 'down';
export type FeedbackStatus = 'pending' | 'resolved' | 'dismissed';

export type Feedback = {
  _id: string;
  userId: string;
  targetType: 'chat_message';
  targetId: string;
  rating: FeedbackRating;
  note: string;
  context: { countryCode: string; question: string };
  status: FeedbackStatus;
  reviewerId: string | null;
  reviewerNote: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatCitation = {
  marker: string;
  articleId: string;
  articleSlug: string;
  title: string;
  heading: string;
};

export type FeedbackDetail = {
  feedback: Feedback;
  message: {
    text: string;
    citations: ChatCitation[];
    retrieval: { topScore: number; chunkIds: string[]; passed: boolean };
    fallbackReason: string | null;
    model: string;
    createdAt: string;
  } | null;
};

// B5 -- A01 Dashboard nang cap, tu ai_events (backend/src/services/analytics.service.js).
export type AnalyticsOverview = {
  days: number;
  totalChats: number;
  fallbackCount: number;
  fallbackRate: number;
  avgLatencyMs: number;
  costEstimateUsd: number;
  pendingFeedbackCount: number;
  topFallbackQuestions: { question: string; count: number }[];
};

// B7 -- A07 Incident Workflow Builder (backend/src/models/IncidentType.js).
export type IncidentTone = 'blue' | 'red' | 'orange' | 'green';
export type IncidentCtaType = 'map' | 'call' | 'ai' | 'link';
export type IncidentStatus = 'draft' | 'published';

export type IncidentCta = { type: IncidentCtaType; label: string; payload: Record<string, unknown> };
export type IncidentChecklistItem = { label: string };
export type IncidentStep = {
  order: number;
  title: string;
  body: string[];
  checklist: IncidentChecklistItem[];
  contactRefs: string[];
  articleRefs: string[];
  ctas: IncidentCta[];
};

export type IncidentType = {
  _id: string;
  slug: string;
  countryCode: string | null;
  title: string;
  iconKey: string;
  tone: IncidentTone;
  urgent: boolean;
  reassurance: string;
  steps: IncidentStep[];
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
};

// B7 -- Translator (backend/src/models/QuickPhrase.js).
export type QuickPhrase = {
  _id: string;
  countryCode: string;
  vi: string;
  translated: string;
  phonetic?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};
