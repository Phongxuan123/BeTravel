import type { SupportLocation } from '@/lib/data';

export const MAP_RADIUS_OPTIONS = [5, 20, 50] as const;
export const MAP_LOCATION_LIMIT = 50;

export function validCoordinates(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Math.abs(lat) <= 90 &&
    Number.isFinite(lng) && Math.abs(lng) <= 180;
}

function foldText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().trim();
}

// Tìm trong danh sách đã kiểm chứng; không gọi Places, không phát sinh phí tìm kiếm.
export function searchLocations(locations: SupportLocation[], search: string): SupportLocation[] {
  const terms = foldText(search).split(/\s+/).filter(Boolean);
  return locations.filter((location) => {
    const text = foldText([location.name, location.nameLocal, location.address].join(' '));
    return terms.every((term) => text.includes(term));
  });
}

export function directionsUrl(lat: number, lng: number): string {
  if (!validCoordinates(lat, lng)) throw new Error('Tọa độ không hợp lệ.');
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
