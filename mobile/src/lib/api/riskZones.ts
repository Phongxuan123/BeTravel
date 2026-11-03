/**
 * Vùng nguy cơ công khai (/api/risk-zones). Backend chỉ trả vùng đã published có nguồn;
 * adapter đổi GeoJSON [lng, lat] sang lat/lng phẳng cho màn bản đồ.
 */
import { apiRequest } from './http';
import type { RiskZone, RiskZoneCategory, RiskZoneSeverity } from '@/features/sos/riskZones';

type ApiRiskZone = {
  _id: string;
  category: RiskZoneCategory;
  name: string;
  description: string;
  severity: RiskZoneSeverity;
  center: { coordinates: [number, number] };
  area?: { coordinates: [number, number][][] };
  radiusM?: number;
  tips: string[];
  source?: { name?: string; url?: string; period?: string };
};

export function adaptRiskZone(api: ApiRiskZone): RiskZone {
  const [lng, lat] = api.center.coordinates;
  return {
    id: api._id,
    category: api.category,
    name: api.name,
    description: api.description,
    severity: api.severity,
    lat,
    lng,
    // GeoJSON [lng, lat] -> [lat, lng]; chỉ lấy vòng ngoài.
    polygon: api.area?.coordinates[0]?.map(([lngValue, latValue]) => [latValue, lngValue] as [number, number]),
    radiusM: api.radiusM,
    tips: api.tips ?? [],
    source: { name: api.source?.name ?? '', url: api.source?.url ?? '', period: api.source?.period ?? '' },
  };
}

export async function fetchRiskZones(country: string): Promise<{ ok: true; data: RiskZone[] }> {
  const raw = await apiRequest<ApiRiskZone[]>(`/risk-zones?country=${encodeURIComponent(country)}`);
  return { ok: true, data: raw.map(adaptRiskZone) };
}
