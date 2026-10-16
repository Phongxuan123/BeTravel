import externalPlaceFixture from '../../../../../contracts/fixtures/public.externalPlace.json';
import { adaptExternalPlace, type ApiExternalPlace } from '../adapters';

// Fixture dung chung voi backend (contracts/fixtures): lech shape se vo o day truoc khi len may that.
const apiPlace = externalPlaceFixture.data[0] as unknown as ApiExternalPlace;

test('adaptExternalPlace doi GeoJSON [lng, lat] thanh lat/lng dung thu tu', () => {
  const place = adaptExternalPlace(apiPlace);

  // Dai su quan Viet Nam tai Seoul: lat ~37.5, lng ~127 -- dao nguoc la loi kinh dien.
  expect(place.lat).toBeCloseTo(37.5385, 4);
  expect(place.lng).toBeCloseTo(126.9715, 4);
});

test('adaptExternalPlace luon danh dau CHUA xac minh va tach id khoi diem da xac minh', () => {
  const place = adaptExternalPlace(apiPlace);

  expect(place.verified).toBe(false);
  expect(place.source).toBe('google_maps');
  expect(place.id.startsWith('ext:')).toBe(true);
  expect(place.distanceKm).toBeCloseTo(0.45, 2);
});

test('adaptExternalPlace tao id on dinh tu toa do khi thieu placeId', () => {
  const place = adaptExternalPlace({ ...apiPlace, placeId: '' });

  expect(place.id).toBe('ext:37.5385,126.9715');
});
