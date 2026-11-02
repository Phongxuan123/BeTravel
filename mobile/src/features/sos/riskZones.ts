// Vùng nguy cơ trên bản đồ (tai nạn, đi ngược chiều, trộm cắp): kiểu dữ liệu và nhãn/màu hiển thị.
// Hàm thuần để kiểm thử được mà không cần WebView.

export type RiskZoneCategory = 'road_crash' | 'wrong_way_driving' | 'theft';
export type RiskZoneSeverity = 'info' | 'warn' | 'danger';

export type RiskZone = {
  id: string;
  category: RiskZoneCategory;
  name: string;
  description: string;
  severity: RiskZoneSeverity;
  lat: number;
  lng: number;
  // Đa giác khoanh vùng [lat, lng]; không có thì vẽ hình tròn từ lat/lng + radiusM.
  polygon?: [number, number][];
  radiusM?: number;
  tips: string[];
  source: { name: string; url: string; period: string };
};

export const RISK_ZONE_LABEL: Record<RiskZoneCategory, string> = {
  road_crash: 'Tai nạn giao thông',
  wrong_way_driving: 'Đi ngược chiều',
  theft: 'Trộm cắp',
};

// Màu theo mức nguy cơ (vòng tròn nửa trong suốt); đỏ = danger, cam = warn, xanh = info.
export const RISK_SEVERITY_COLOR: Record<RiskZoneSeverity, string> = {
  danger: '#DC2626',
  warn: '#F59E0B',
  info: '#2563EB',
};

export const RISK_CATEGORIES = Object.keys(RISK_ZONE_LABEL) as RiskZoneCategory[];

// Dạng tối thiểu gửi sang trang Leaflet: chi tiết (mô tả, nguồn) vẫn nằm ở app.
export type OsmZone = { id: string; lat: number; lng: number; radiusM?: number; polygon?: [number, number][]; color: string };

export function toOsmZones(zones: RiskZone[]): OsmZone[] {
  return zones.map((zone) => ({
    id: zone.id,
    lat: zone.lat,
    lng: zone.lng,
    radiusM: zone.radiusM,
    polygon: zone.polygon,
    color: RISK_SEVERITY_COLOR[zone.severity],
  }));
}
