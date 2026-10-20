import { apiRequest } from './apiClient';
import { createAdminResource } from './resource';
import type {
  Country,
  LegalTopic,
  LegalArticle,
  SupportLocation,
  AuditLog,
  DashboardSummary,
  ContentStatus,
  RagArticleStatus,
  AuLawRagStatus,
  Feedback,
  FeedbackDetail,
  FeedbackRating,
  FeedbackStatus,
  AnalyticsOverview,
  LocationBulkImportResult,
  IncidentType,
  QuickPhrase,
  GeoAlert,
  AuLawSummary,
  AuLawTopic,
  AuLawOverview,
  AuLawDetail,
  AuLawVersion,
  AuLawContent,
  FaqCandidate,
  ApprovedFaq,
  FaqStatus,
} from './types';

export const countriesApi = createAdminResource<Country>('/admin/countries');
export const topicsApi = createAdminResource<LegalTopic>('/admin/topics');
export const locationsApi = {
  ...createAdminResource<SupportLocation>('/admin/locations'),

  bulkImport: (rows: Partial<SupportLocation>[]) =>
    apiRequest<LocationBulkImportResult>('/admin/locations/bulk-import', { method: 'POST', body: { rows } }),

  bulkVerify: (ids: string[]) =>
    apiRequest<{ verifiedCount: number }>('/admin/locations/bulk-verify', { method: 'POST', body: { ids } }),
};

/**
 * LegalArticle KHONG dung factory chung: co logic rieng (optimistic
 * concurrency o update, may trang thai, versioning) khac han CRUD don gian --
 * doi xung voi backend/src/services/legalArticle.service.js.
 */
export const articlesApi = {
  list: (query?: { countryCode?: string; topicSlug?: string; status?: ContentStatus; search?: string; page?: number; limit?: number }) =>
    apiRequest<LegalArticle[]>('/admin/legal/articles', { query }),

  get: (id: string) => apiRequest<LegalArticle>(`/admin/legal/articles/${id}`),

  create: (payload: Partial<LegalArticle>) =>
    apiRequest<LegalArticle>('/admin/legal/articles', { method: 'POST', body: payload }),

  // Bat buoc kem updatedAt cua ban dang xem -- backend so sanh de chan ghi de (Rule 11).
  update: (id: string, payload: Partial<LegalArticle> & { updatedAt: string }) =>
    apiRequest<LegalArticle>(`/admin/legal/articles/${id}`, { method: 'PATCH', body: payload }),

  changeStatus: (id: string, status: ContentStatus, note?: string) =>
    apiRequest<LegalArticle>(`/admin/legal/articles/${id}/status`, { method: 'POST', body: { status, note } }),

  newVersion: (id: string) =>
    apiRequest<LegalArticle>(`/admin/legal/articles/${id}/new-version`, { method: 'POST' }),
};

export const auditApi = {
  list: (query?: { entityType?: string; actorId?: string; page?: number; limit?: number }) =>
    apiRequest<AuditLog[]>('/admin/audit', { query }),
};

export const dashboardApi = {
  get: () => apiRequest<DashboardSummary>('/admin/dashboard'),
};

export const ragApi = {
  status: (countryCode?: string) => apiRequest<RagArticleStatus[]>('/admin/rag/status', { query: { countryCode } }),
  reindexCountry: (countryCode: string) =>
    apiRequest<{ queued: number }>('/admin/rag/reindex-country', { method: 'POST', body: { countryCode } }),
  auLaws: () => apiRequest<AuLawRagStatus[]>('/admin/rag/au-laws'),
  indexAuLaws: (titleIds: string[]) =>
    apiRequest<{ queued: string[]; skipped: string[] }>('/admin/rag/au-laws/index', { method: 'POST', body: { titleIds } }),
  removeAuLaw: (titleId: string) =>
    apiRequest<{ titleId: string; deleted: number }>(`/admin/rag/au-laws/${titleId}`, { method: 'DELETE' }),
};

export const feedbackApi = {
  list: (query?: { rating?: FeedbackRating; status?: FeedbackStatus; countryCode?: string; page?: number; limit?: number }) =>
    apiRequest<Feedback[]>('/admin/feedback', { query }),

  get: (id: string) => apiRequest<FeedbackDetail>(`/admin/feedback/${id}`),

  updateStatus: (id: string, payload: { status: FeedbackStatus; reviewerNote?: string }) =>
    apiRequest<Feedback>(`/admin/feedback/${id}`, { method: 'PATCH', body: payload }),
};

export const faqApi = {
  candidates: (countryCode?: string) => apiRequest<FaqCandidate[]>('/admin/faq/candidates', { query: { countryCode } }),
  list: (status?: FaqStatus) => apiRequest<ApprovedFaq[]>('/admin/faq', { query: { status } }),
  decide: (sourceMessageId: string, decision: 'approve' | 'dismiss') =>
    apiRequest<ApprovedFaq>('/admin/faq', { method: 'POST', body: { sourceMessageId, decision } }),
  setStatus: (id: string, status: 'active' | 'retired') =>
    apiRequest<ApprovedFaq>(`/admin/faq/${id}`, { method: 'PATCH', body: { status } }),
};

export const analyticsApi = {
  overview: (days?: number) => apiRequest<AnalyticsOverview>('/admin/analytics/overview', { query: { days } }),
};

export const incidentsApi = createAdminResource<IncidentType>('/admin/incidents');
export const quickPhrasesApi = createAdminResource<QuickPhrase>('/admin/quick-phrases');
export const geoAlertsApi = createAdminResource<GeoAlert>('/admin/geo-alerts');

/** Luat lien bang Uc: endpoint cong khai, chi doc, khong thuoc /admin. */
export const australiaLawsApi = {
  topics: () => apiRequest<AuLawTopic[]>('/laws/australia/topics', { skipAuth: true }),

  list: (query: { q?: string; inForce: boolean; collection?: string; topic?: string; page: number; limit: number }) =>
    apiRequest<AuLawSummary[]>(query.q ? '/laws/australia/search' : '/laws/australia', { query, skipAuth: true }),

  get: (id: string) => apiRequest<AuLawDetail>(`/laws/australia/${id}`, { skipAuth: true }),

  versions: (id: string, query: { page: number; limit: number }) =>
    apiRequest<AuLawVersion[]>(`/laws/australia/${id}/versions`, { query, skipAuth: true }),

  // Dịch theo yêu cầu: offset phải là bội số của 25.
  contentVi: (id: string, query: { offset: number; limit: number }) =>
    apiRequest<AuLawContent>(`/laws/australia/${id}/content-vi`, { query, skipAuth: true }),

  summary: (id: string) => apiRequest<AuLawOverview>(`/laws/australia/${id}/summary`, { skipAuth: true }),

  content: (id: string, query: { offset: number; limit: number }) =>
    apiRequest<AuLawContent>(`/laws/australia/${id}/content`, { query, skipAuth: true }),
};
