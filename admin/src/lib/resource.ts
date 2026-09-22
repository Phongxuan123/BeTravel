import { apiRequest, type ApiResult } from './apiClient';

export type PagedQuery = { page?: number; limit?: number; [key: string]: string | number | boolean | undefined };

/**
 * Countries/Topics/Locations deu la CRUD don gian voi cung mot khuon endpoint
 * (list/get/create/update/remove). Gom thanh factory dung chung thay vi viet
 * lai 3 lan (Rule 3) -- doi xung voi backend/src/core/adminCrudController.js.
 */
export function createAdminResource<T, TCreate = Partial<T>, TUpdate = Partial<T>>(basePath: string) {
  return {
    list: (query?: PagedQuery) => apiRequest<T[]>(basePath, { query }),
    get: (id: string) => apiRequest<T>(`${basePath}/${id}`),
    create: (payload: TCreate) => apiRequest<T>(basePath, { method: 'POST', body: payload }),
    update: (id: string, payload: TUpdate) => apiRequest<T>(`${basePath}/${id}`, { method: 'PATCH', body: payload }),
    remove: (id: string) => apiRequest<{ deleted: true }>(`${basePath}/${id}`, { method: 'DELETE' }),
  };
}

export type { ApiResult };
