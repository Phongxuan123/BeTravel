import { adaptRiskZone } from '../riskZones';

test('adaptRiskZone đổi GeoJSON [lng, lat] sang lat/lng đúng thứ tự', () => {
  // Melbourne: lat ~ -37.8 phải là lat, lng ~ 144.9 phải là lng (đảo ngược là lỗi kinh điển).
  const zone = adaptRiskZone({
    _id: 'z1', category: 'theft', name: 'Melbourne', description: 'd', severity: 'warn',
    center: { coordinates: [144.9631, -37.8136] }, radiusM: 2000, tips: [],
  });

  expect(zone.lat).toBe(-37.8136);
  expect(zone.lng).toBe(144.9631);
  expect(zone.source).toEqual({ name: '', url: '', period: '' });
});

test('adaptRiskZone đổi đa giác GeoJSON sang [lat, lng] và để trống khi không có area', () => {
  const base = {
    _id: 'z2', category: 'theft' as const, name: 'Khu', description: 'd', severity: 'warn' as const,
    center: { coordinates: [144.96, -37.81] as [number, number] }, tips: [],
  };
  const withArea = adaptRiskZone({ ...base, area: { coordinates: [[[144.95, -37.82], [144.97, -37.82], [144.97, -37.81], [144.95, -37.82]]] } });

  expect(withArea.polygon?.[0]).toEqual([-37.82, 144.95]);
  expect(adaptRiskZone(base).polygon).toBeUndefined();
});
