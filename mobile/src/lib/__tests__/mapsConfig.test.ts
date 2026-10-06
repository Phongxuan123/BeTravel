const configure = jest.requireActual('../../../app.config');
const config = jest.requireActual('../../../app.json').expo;
const originalEnv = { ...process.env };
beforeEach(() => {
  delete process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  delete process.env.GOOGLE_MAPS_IOS_API_KEY;
  delete process.env.ANDROID_PACKAGE;
  delete process.env.IOS_BUNDLE_IDENTIFIER;
});
afterAll(() => { process.env = originalEnv; });

test('thiếu key vẫn cấu hình Apple Maps và đánh dấu Android dùng danh sách', () => {
  const result = configure({ config });
  expect(result.extra.androidMapsConfigured).toBe(false);
  expect(result.plugins).toContainEqual(['react-native-maps', {}]);
  expect(JSON.stringify(result)).not.toContain('REPLACE_WITH');
});

test('key chỉ vào config plugin, không vào extra', () => {
  const key = `AIza${'x'.repeat(35)}`;
  process.env.GOOGLE_MAPS_ANDROID_API_KEY = key;
  process.env.ANDROID_PACKAGE = 'com.example.betravel';
  const result = configure({ config });
  expect(result.plugins).toContainEqual(['react-native-maps', { androidGoogleMapsApiKey: key }]);
  expect(result.android.package).toBe('com.example.betravel');
  expect(result.extra.androidMapsConfigured).toBe(true);
  expect(JSON.stringify(result.extra)).not.toContain(key);
});

test('key mẫu không được đưa vào native build', () => {
  process.env.GOOGLE_MAPS_ANDROID_API_KEY = 'REPLACE_WITH_REAL_ANDROID_MAPS_API_KEY';
  expect(() => configure({ config })).toThrow('không hợp lệ');
});

test('Google Maps iOS nhận key riêng và không đưa key vào extra', () => {
  const key = `AIza${'y'.repeat(35)}`;
  process.env.GOOGLE_MAPS_IOS_API_KEY = key;
  process.env.IOS_BUNDLE_IDENTIFIER = 'com.example.betravel';
  const result = configure({ config });
  expect(result.plugins).toContainEqual(['react-native-maps', { iosGoogleMapsApiKey: key }]);
  expect(result.extra.iosGoogleMapsConfigured).toBe(true);
  expect(JSON.stringify(result.extra)).not.toContain(key);
});

test('không build Google Maps với key nhưng thiếu định danh ứng dụng', () => {
  process.env.GOOGLE_MAPS_ANDROID_API_KEY = `AIza${'z'.repeat(35)}`;
  expect(() => configure({ config })).toThrow('ANDROID_PACKAGE');
  delete process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  process.env.GOOGLE_MAPS_IOS_API_KEY = `AIza${'z'.repeat(35)}`;
  expect(() => configure({ config })).toThrow('IOS_BUNDLE_IDENTIFIER');
});
