/**
 * Nối SOS map/hub vào API thật (B6). CÙNG CHỮ KÝ mock cho fetchSupportLocations
 * (mở rộng thêm object tham số optional), bổ sung fetchNearbyLocations.
 */
import { apiRequest } from './http';
import { adaptSupportLocation, type ApiSupportLocation } from './adapters';
import { StorageKeys, getJSON, setJSON } from '@/lib/storage';
import type { SupportLocation } from '@/mocks/schemas';

type Envelope<T> = { ok: true; data: T; fromCache?: boolean };
type FetchOpts = { country?: string; type?: SupportLocation['type'] };
type NearbyOpts = FetchOpts & { radiusKm?: number; limit?: number };

function cacheKey(country?: string): string {
  return `${StorageKeys.sosLocationsCachePrefix}${country ?? 'all'}`;
}

async function withOfflineFallback(
  country: string | undefined,
  fetcher: () => Promise<ApiSupportLocation[]>,
): Promise<Envelope<SupportLocation[]>> {
  try {
    const raw = await fetcher();
    const data = raw.map(adaptSupportLocation);
    await setJSON(cacheKey(country), data);
    return { ok: true, data };
  } catch (error) {
    // Tinh huong SOS rat hay mat mang (CLAUDE.md B6 muc 11) -- ngoai mang
    // KHONG duoc phep tra man hinh trang, dung du lieu cache lan cuoi thanh cong.
    const cached = await getJSON<SupportLocation[]>(cacheKey(country));
    if (cached) return { ok: true, data: cached, fromCache: true };
    throw error;
  }
}

export async function fetchSupportLocations(opts?: FetchOpts): Promise<Envelope<SupportLocation[]>> {
  return withOfflineFallback(opts?.country, () => {
    const params = new URLSearchParams();
    if (opts?.country) params.set('country', opts.country);
    if (opts?.type) params.set('type', opts.type);
    return apiRequest<ApiSupportLocation[]>(`/support-locations?${params.toString()}`);
  });
}

export async function fetchNearbyLocations(lat: number, lng: number, opts?: NearbyOpts): Promise<Envelope<SupportLocation[]>> {
  return withOfflineFallback(opts?.country, () => {
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
    if (opts?.country) params.set('country', opts.country);
    if (opts?.type) params.set('type', opts.type);
    if (opts?.radiusKm) params.set('radiusKm', String(opts.radiusKm));
    if (opts?.limit) params.set('limit', String(opts.limit));
    return apiRequest<ApiSupportLocation[]>(`/support-locations/nearby?${params.toString()}`);
  });
}
