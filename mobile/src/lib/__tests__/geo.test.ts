import { haversineKm } from '../geo';

describe('haversineKm', () => {
  it('khoang cach tu 1 diem den chinh no la 0', () => {
    expect(haversineKm(37.5385, 126.9715, 37.5385, 126.9715)).toBeCloseTo(0, 5);
  });

  it('khoang cach Seoul -- Busan xap xi 320km (sai so cho phep 20km)', () => {
    // Toa do that, dung trong test backend $geoNear (xem backend/test/supportLocation.test.js).
    const seoul = { lat: 37.5385, lng: 126.9715 };
    const busan = { lat: 35.1796, lng: 129.0756 };
    const km = haversineKm(seoul.lat, seoul.lng, busan.lat, busan.lng);
    expect(km).toBeGreaterThan(300);
    expect(km).toBeLessThan(340);
  });
});
