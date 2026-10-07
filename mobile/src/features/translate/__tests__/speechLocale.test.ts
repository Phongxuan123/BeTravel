import { speechLocale, matchingVoice } from '../speechLocale';

test('mã locale đúng cho ngôn ngữ dịch, không đoán tiếng Anh khi không hỗ trợ', () => {
  expect(speechLocale('Tiếng Việt')).toBe('vi-VN');
  expect(speechLocale('Tiếng Hàn')).toBe('ko-KR');
  expect(speechLocale('unknown')).toBeNull();
  expect(matchingVoice([{ language: 'en_GB' }, { language: 'ko-KR' }], 'en-US')?.language).toBe(
    'en_GB',
  );
  expect(matchingVoice([{ language: 'en-US' }], 'ja-JP')).toBeUndefined();
});
