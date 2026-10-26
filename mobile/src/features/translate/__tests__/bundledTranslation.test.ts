import { requireOptionalNativeModule } from 'expo';
import { translateBundled, travelPhrases, hasBundledPair } from '../bundledTranslation';
import { translateOffline } from '../offlineTranslation';

jest.mock('expo', () => ({ requireOptionalNativeModule: jest.fn() }));
beforeEach(() => jest.clearAllMocks());

test('cài lần đầu/Expo Go: từ và câu hoạt động không module, mạng hoặc tải gói', async () => {
  (requireOptionalNativeModule as jest.Mock).mockReturnValue(null);
  for (const [text, source, target, expected] of [
    ['hộ chiếu', 'vi', 'en', 'passport'],
    ['passport', 'en', 'vi', 'hộ chiếu'],
    ['airport', 'en', 'vi', 'sân bay'],
    ['taxi', 'en', 'vi', 'xe taxi'],
    ['cảnh sát', 'vi', 'en', 'police'],
    ['Tôi cần giúp đỡ', 'vi', 'en', 'I need help.'],
    ["I don't need help.", 'en', 'vi', 'Tôi không cần giúp đỡ.'],
  ]) {
    const result = await translateOffline(text, source, target, () => true, jest.fn());
    expect(result.translated).toContain(expected);
    expect(result.engine).toMatch(/^bundled-/);
  }
  expect(requireOptionalNativeModule).not.toHaveBeenCalled();
});

test('câu thông dụng tra hai chiều, giữ dấu tiếng Việt và phủ định', () => {
  for (const phrase of travelPhrases) {
    expect(translateBundled(phrase.vi, 'vi', 'en')?.translated).toBe(phrase.en);
    expect(translateBundled(phrase.en, 'en', 'vi')?.translated).toBe(phrase.vi);
  }
  expect(translateBundled('  TÔI CẦN GIÚP ĐỠ.  '.normalize('NFD'), 'vi', 'en')?.translated).toBe(
    'I need help.',
  );
  expect(translateBundled('Toi can giup do', 'vi', 'en')).toBeNull();
});

test('đoạn dài dịch đủ câu, không bỏ qua câu lạ/số hoặc ghép từ', () => {
  const text = 'Tôi cần giúp đỡ. Tôi bị mất hộ chiếu.\n'.repeat(25);
  const result = translateBundled(text, 'vi', 'en');
  expect(result?.translated).toBe(Array(25).fill('I need help. I lost my passport.').join(' '));
  expect(translateBundled('Tôi cần giúp đỡ. Chuyến bay 76391 bị hủy.', 'vi', 'en')).toBeNull();
  expect(translateBundled('hotel passport hospital', 'en', 'vi')).toBeNull();
  expect(translateBundled('Tôi cần giúp đỡ.', 'vi', 'ko')).toBeNull();
  expect(hasBundledPair('vi', 'en')).toBe(true);
});

test('từ nhiều nghĩa giữ các nghĩa và nguồn thay vì tự đoán ngữ cảnh', () => {
  const result = translateBundled('nước', 'vi', 'en');
  expect(result?.engine).toBe('bundled-dictionary');
  expect(result?.translated).toContain('water');
  expect(result?.translated).toContain(';');
  expect(result?.sourceTerms).toContain('nước');
});

test('không trả kết quả bundled đã hủy, quá dài hoặc trống', async () => {
  await expect(translateOffline('hộ chiếu', 'vi', 'en', () => false, jest.fn())).rejects.toThrow(
    'Đã hủy',
  );
  await expect(
    translateOffline('Xin chào. '.repeat(600), 'vi', 'en', () => true, jest.fn()),
  ).rejects.toThrow('5.000');
  await expect(translateOffline(' ', 'vi', 'en', () => true, jest.fn())).rejects.toThrow('Nhập');
});
