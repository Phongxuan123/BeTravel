/**
 * Nối SOS map/hub vào API thật (B6). CÙNG CHỮ KÝ mock cho fetchSupportLocations
 * (mở rộng thêm object tham số optional), bổ sung fetchNearbyLocations.
 */
import { apiRequest } from './http';
import { adaptSupportLocation, type ApiSupportLocation } from './adapters';
import { StorageKeys, getJSON, setJSON } from '@/lib/storage';
import { haversineKm } from '@/lib/geo';
import type { SupportLocation } from '@/mocks/schemas';
import { supportLocationSchema } from '@/mocks/schemas';
import { validCoordinates } from '@/features/sos/mapHelpers';

type Envelope<T> = { ok: true; data: T; fromCache?: boolean };
type FetchOpts = { country?: string; type?: SupportLocation['type'] };
type NearbyOpts = FetchOpts & { radiusKm?: number; limit?: number };

function cacheKey(country?: string, type?: string): string {
  return `${StorageKeys.sosLocationsCachePrefix}${country ?? 'all'}:${type ?? 'all'}`;
}

async function withOfflineFallback(
  country: string | undefined,
  fetcher: () => Promise<ApiSupportLocation[]>,
  type?: string,
  coordinates?: { lat: number; lng: number },
  nearbyOptions?: NearbyOpts,
): Promise<Envelope<SupportLocation[]>> {
  // Kết quả nearby có limit không được ghi đè danh sách toàn quốc đã tải.
  const key = cacheKey(country, type) + (coordinates ? ':nearby' : '');
  try {
    const raw = await fetcher();
    const data = raw.filter((item) => item.verified === true).map(adaptSupportLocation);
    await setJSON(key, data);
    return { ok: true, data };
  } catch (error) {
    // Tinh huong SOS rat hay mat mang (CLAUDE.md B6 muc 11) -- ngoai mang
    // KHONG duoc phep tra man hinh trang, dung du lieu cache lan cuoi thanh cong.
    const cached = await getJSON<unknown>(cacheKey(country, type)) ??
      await getJSON<unknown>(cacheKey(country, type) + ':nearby');
    if (Array.isArray(cached)) {
      // Cache cũ có thể có điểm chưa verified hoặc bị hỏng; không đưa vào native map.
      const usable = cached.flatMap((item) => {
        const parsed = supportLocationSchema.safeParse(item);
        return parsed.success && parsed.data.verified === true &&
          validCoordinates(parsed.data.lat, parsed.data.lng) ? [parsed.data] : [];
      });
      let data = usable.filter((item) => !type || item.type === type).map((item) => {
        // Khoảng cách cũ không còn đúng nếu người dùng đã di chuyển.
        const distanceKm = coordinates ? haversineKm(coordinates.lat, coordinates.lng, item.lat, item.lng) : undefined;
        return { ...item, distanceKm, meta: item.address ?? '' };
      });
      if (coordinates) {
        data.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
        const withinRadius = data.filter((item) => (item.distanceKm ?? Infinity) <= (nearbyOptions?.radiusKm ?? 20));
        data = (withinRadius.length ? withinRadius : data).slice(0, nearbyOptions?.limit ?? 10);
      }
      return { ok: true, data, fromCache: true };
    }
    throw error;
  }
}

export async function fetchSupportLocations(opts?: FetchOpts): Promise<Envelope<SupportLocation[]>> {
  return withOfflineFallback(opts?.country, () => {
    const params = new URLSearchParams();
    if (opts?.country) params.set('country', opts.country);
    if (opts?.type) params.set('type', opts.type);
    return apiRequest<ApiSupportLocation[]>(`/support-locations?${params.toString()}`);
  }, opts?.type);
}

export async function fetchNearbyLocations(lat: number, lng: number, opts?: NearbyOpts): Promise<Envelope<SupportLocation[]>> {
  return withOfflineFallback(opts?.country, () => {
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
    if (opts?.country) params.set('country', opts.country);
    if (opts?.type) params.set('type', opts.type);
    if (opts?.radiusKm) params.set('radiusKm', String(opts.radiusKm));
    if (opts?.limit) params.set('limit', String(opts.limit));
    return apiRequest<ApiSupportLocation[]>(`/support-locations/nearby?${params.toString()}`);
  }, opts?.type, { lat, lng }, opts);
}
