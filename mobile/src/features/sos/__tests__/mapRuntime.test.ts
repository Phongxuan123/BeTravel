import { mapRuntime } from '../mapRuntime';
const { checkMapsConfig } = jest.requireActual('../../../../scripts/check-maps-config.cjs');

test('native Android cần key, iOS dùng Apple dự phòng; Expo Go không dùng key iOS của JS', () => {
  expect(mapRuntime('android', 'standalone', {})).toEqual({ available: false, google: true });
  expect(mapRuntime('android', 'standalone', { androidMapsConfigured: true })).toEqual({ available: true, google: true });
  expect(mapRuntime('ios', 'standalone', {})).toEqual({ available: true, google: false });
  expect(mapRuntime('ios', 'standalone', { iosGoogleMapsConfigured: true })).toEqual({ available: true, google: true });
  expect(mapRuntime('ios', 'storeClient', { iosGoogleMapsConfigured: true })).toEqual({ available: true, google: false });
  expect(mapRuntime('android', 'storeClient', {})).toEqual({ available: true, google: true });
  expect(mapRuntime('web', undefined)).toEqual({ available: false, google: false });
});

test('preflight phát hiện thiếu cấu hình cả hai nền tảng, không in key', () => {
  expect(checkMapsConfig({}).every((item: { readyForBuild: boolean }) => !item.readyForBuild)).toBe(true);
  const key = `AIza${'x'.repeat(35)}`;
  const results = checkMapsConfig({ GOOGLE_MAPS_ANDROID_API_KEY: key, GOOGLE_MAPS_IOS_API_KEY: key,
    ANDROID_PACKAGE: 'com.example.betravel', IOS_BUNDLE_IDENTIFIER: 'com.example.betravel' });
  expect(results.every((item: { readyForBuild: boolean }) => item.readyForBuild)).toBe(true);
  expect(JSON.stringify(results)).not.toContain(key);
  expect(() => checkMapsConfig({}, 'web')).toThrow('platform');
});
