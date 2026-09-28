import { buildLocationMessage, isFreshLocation } from '../locationShare';

const now = Date.UTC(2026, 8, 28, 12);
const location = { latitude: 10.1234567, longitude: 106.7654321, accuracy: 15.2, timestamp: now };

test('tin gửi có tọa độ, thời gian UTC, sai số và link bản đồ chuẩn', () => {
  const message = buildLocationMessage(location, now);
  expect(message).toContain('query=10.123457%2C106.765432');
  expect(message).toContain('2026-09-28T12:00:00.000Z');
  expect(message).toContain('16 m');
  expect(message).toContain('không cập nhật trực tiếp');
});

test.each([
  { latitude: NaN }, { longitude: Infinity }, { latitude: 91 }, { longitude: -181 },
  { timestamp: now - 60_001 }, { timestamp: NaN }, { timestamp: now + 5001 },
])('không tạo tin từ vị trí sai hoặc cũ: %o', (patch) => {
  expect(() => buildLocationMessage({ ...location, ...patch }, now)).toThrow();
});

test('tọa độ 0 hợp lệ; sai số không biết không được trình bày như GPS chính xác', () => {
  expect(buildLocationMessage({ ...location, latitude: 0, longitude: 0, accuracy: null }, now)).toContain('Chưa xác định');
  expect(buildLocationMessage({ ...location, accuracy: -1 }, now)).toContain('Chưa xác định');
  expect(isFreshLocation(location, now + 60_000)).toBe(true);
  expect(isFreshLocation(location, now + 60_001)).toBe(false);
});
