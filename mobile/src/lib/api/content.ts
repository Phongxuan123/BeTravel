/**
 * Nối tầng nội dung (countries/topics/legal articles/search/trips) vào API
 * thật. CÙNG CHỮ KÝ HÀM với mocks/client.ts để lib/data.ts chuyển đổi qua lại
 * mà không phải sửa màn hình (CLAUDE.md B3 mục 9).
 */
import { apiRequest, ApiError } from './http';
import {
  adaptArticle,
  adaptCountry,
  adaptSearchHit,
  adaptTopic,
  adaptTrip,
  type ApiArticle,
  type ApiCountry,
  type ApiSearchHit,
  type ApiTopic,
  type ApiTrip,
} from './adapters';
import type { Article, Country, SearchResultItem, Topic, Trip } from '@/mocks/schemas';

type Envelope<T> = { ok: true; data: T };

async function fetchOrNull<T>(path: string): Promise<T | null> {
  try {
    return await apiRequest<T>(path);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'NOT_FOUND') return null;
    throw error;
  }
}

export async function fetchCountries(): Promise<Envelope<Country[]>> {
  const raw = await apiRequest<ApiCountry[]>('/countries');
  return { ok: true, data: raw.map(adaptCountry) };
}

export async function fetchCountry(code: string): Promise<Envelope<Country | null>> {
  const raw = await fetchOrNull<ApiCountry>(`/countries/${code}`);
  return { ok: true, data: raw ? adaptCountry(raw) : null };
}

export async function fetchTopics(countryCode: string): Promise<Envelope<Topic[]>> {
  const raw = await apiRequest<ApiTopic[]>(`/legal/topics?country=${countryCode}`);
  return { ok: true, data: raw.map(adaptTopic) };
}

export async function fetchArticles(
  countryCode: string,
  opts?: { topicKey?: string; savedOnly?: boolean },
): Promise<Envelope<Article[]>> {
  // "Da luu" (favorites) la B8, API that chua ho tro -- tra rong thay vi bia
  // ket qua hoac goi API khong can thiet.
  if (opts?.savedOnly) return { ok: true, data: [] };

  const params = new URLSearchParams({ country: countryCode, limit: '100' });
  if (opts?.topicKey) params.set('topic', opts.topicKey);

  const raw = await apiRequest<ApiArticle[]>(`/legal/articles?${params.toString()}`);
  return { ok: true, data: raw.map(adaptArticle) };
}

export async function fetchArticle(countryCode: string, slug: string): Promise<Envelope<Article | null>> {
  const raw = await fetchOrNull<ApiArticle>(`/legal/articles/${countryCode}/${slug}`);
  return { ok: true, data: raw ? adaptArticle(raw) : null };
}

export async function searchArticles(query: string, countryCode: string): Promise<Envelope<SearchResultItem[]>> {
  const q = query.trim();
  if (!q) return { ok: true, data: [] };

  const params = new URLSearchParams({ q, country: countryCode });
  const raw = await apiRequest<ApiSearchHit[]>(`/legal/search?${params.toString()}`);
  return { ok: true, data: raw.map(adaptSearchHit) };
}

export async function fetchTrips(): Promise<Envelope<Trip[]>> {
  const raw = await apiRequest<ApiTrip[]>('/users/trips');
  return { ok: true, data: raw.map(adaptTrip) };
}

export type TripInput = {
  countryCode: string;
  destinationCity: string;
  destinationDetail?: string;
  locationAlerts?: boolean;
  regulationAlerts?: boolean;
  startDate: string;
  endDate: string;
};

export async function createTrip(input: TripInput): Promise<Envelope<Trip>> {
  const raw = await apiRequest<ApiTrip>('/users/trips', { method: 'POST', body: input });
  return { ok: true, data: adaptTrip(raw) };
}

export async function updateTrip(id: string, input: TripInput): Promise<Envelope<Trip>> {
  const raw = await apiRequest<ApiTrip>(`/users/trips/${id}`, { method: 'PUT', body: input });
  return { ok: true, data: adaptTrip(raw) };
}

export async function setCurrentTrip(id: string): Promise<Envelope<Trip | null>> {
  try {
    const raw = await apiRequest<ApiTrip>(`/users/trips/${id}/current`, { method: 'PUT' });
    return { ok: true, data: adaptTrip(raw) };
  } catch (error) {
    if (error instanceof ApiError && error.code === 'NOT_FOUND') return { ok: true, data: null };
    throw error;
  }
}

export async function deleteTrip(id: string): Promise<Envelope<null>> {
  await apiRequest<{ deleted: true }>(`/users/trips/${id}`, { method: 'DELETE' });
  return { ok: true, data: null };
}
