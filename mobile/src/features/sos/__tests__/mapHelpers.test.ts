import { directionsUrl, searchLocations, validCoordinates } from '../mapHelpers';
import type { SupportLocation } from '@/lib/data';

const locations: SupportLocation[] = [
  { id: '1', name: 'Đồn cảnh sát', nameLocal: 'Police', address: 'Seoul Gangnam',
    type: 'police', meta: '', lat: 37, lng: 127 },
  { id: '2', name: 'Bệnh viện', address: 'Busan', type: 'hospital', meta: '', lat: 35, lng: 129 },
];

test('tìm không dấu, nhiều từ, tên bản địa và địa chỉ', () => {
  expect(searchLocations(locations, 'don SEOUL').map((l) => l.id)).toEqual(['1']);
  expect(searchLocations(locations, 'Police')).toEqual([locations[0]]);
  expect(searchLocations(locations, '  ')).toEqual(locations);
  expect(searchLocations(locations, 'không có')).toEqual([]);
});

test('chỉ đường giữ thứ tự lat/lng và từ chối tọa độ sai', () => {
  expect(directionsUrl(37, 127)).toContain('destination=37,127');
  expect(validCoordinates(0, 0)).toBe(true);
  expect(validCoordinates(NaN, 127)).toBe(false);
  expect(() => directionsUrl(127, 37)).toThrow();
});
