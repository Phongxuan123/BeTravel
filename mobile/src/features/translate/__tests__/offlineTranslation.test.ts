import { requireOptionalNativeModule } from 'expo';
import { splitTranslationText, translateOffline } from '../offlineTranslation';

jest.mock('expo', () => ({ requireOptionalNativeModule: jest.fn() }));

test('chia văn bản dài không mất chữ/xuống dòng và không cắt đôi Unicode', () => {
  const text = 'Tôi cần hỗ trợ.\nI need help! 𠮷野へ行きます。'.repeat(100);
  const chunks = splitTranslationText(text);
  expect(chunks.join('')).toBe(text);
  expect(chunks.every((chunk) => chunk.length <= 450)).toBe(true);
  expect(chunks.every((chunk) => !/[\uD800-\uDBFF]$/.test(chunk))).toBe(true);
});

test('thiếu gói không gọi native translate hoặc tự tải model', async () => {
  const native = { installedLanguages: async () => [], translate: jest.fn(), prepare: jest.fn() };
  (requireOptionalNativeModule as jest.Mock).mockReturnValue(native);
  await expect(translateOffline('This unfamiliar sentence includes number 76391.', 'en', 'vi', () => true, jest.fn())).rejects.toThrow(
    'chưa có đủ gói',
  );
  expect(native.translate).not.toHaveBeenCalled();
  expect(native.prepare).not.toHaveBeenCalled();
});

test('hủy lượt dài không dịch tiếp các đoạn hoặc trả bản dịch dở', async () => {
  let current = true;
  const native = {
    installedLanguages: async () => ['vi'],
    translate: jest.fn(async () => {
      current = false;
      return 'old';
    }),
  };
  (requireOptionalNativeModule as jest.Mock).mockReturnValue(native);
  await expect(
    translateOffline('Unknown flight 76391. '.repeat(80), 'en', 'vi', () => current, jest.fn()),
  ).rejects.toThrow('Đã hủy');
  expect(native.translate).toHaveBeenCalledTimes(1);
});
