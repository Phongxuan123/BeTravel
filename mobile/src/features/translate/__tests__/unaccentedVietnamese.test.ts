import { looksLikeUnaccentedVietnamese } from '../unaccentedVietnamese';

test('nhận ra câu tiếng Việt gõ không dấu, bỏ qua câu có dấu và tiếng Anh', () => {
  expect(looksLikeUnaccentedVietnamese('Toi can mot chiec xe taxi den san bay luc sau gio sang')).toBe(true);
  expect(looksLikeUnaccentedVietnamese('Tôi cần một chiếc xe taxi đến sân bay')).toBe(false);
  expect(looksLikeUnaccentedVietnamese('I need a taxi to the airport please')).toBe(false);
  expect(looksLikeUnaccentedVietnamese('toi can')).toBe(false);
});
