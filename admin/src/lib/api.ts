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
} from './types';

export const countriesApi = createAdminResource<Country>('/admin/countries');
export const topicsApi = createAdminResource<LegalTopic>('/admin/topics');
export const locationsApi = createAdminResource<SupportLocation>('/admin/locations');

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
};
