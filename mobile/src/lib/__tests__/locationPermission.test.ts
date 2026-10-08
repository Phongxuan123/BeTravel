import * as Location from 'expo-location';
import { requestLocationDetailed, requestLocationWithExplanation } from '../locationPermission';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);
  (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValue(null);
  (Location.getCurrentPositionAsync as jest.Mock).mockImplementation(async () => ({
    coords: { latitude: 37, longitude: 127, accuracy: 10 }, timestamp: Date.now(),
  }));
});
afterEach(() => jest.useRealTimers());

test('quyền bị khóa hoặc dịch vụ tắt không gọi GPS', async () => {
  (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied', canAskAgain: false });
  expect(await requestLocationWithExplanation()).toBeNull();
  (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(false);
  expect(await requestLocationWithExplanation()).toBeNull();
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
});

test('lỗi native permission được xử lý; có thể thử lại', async () => {
  (Location.getForegroundPermissionsAsync as jest.Mock).mockRejectedValueOnce(new Error('native failure'));
  expect(await requestLocationWithExplanation()).toBeNull();
  expect(await requestLocationWithExplanation()).toMatchObject({ latitude: 37, longitude: 127 });
});

test('bỏ tọa độ cũ hoặc không hợp lệ', async () => {
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValueOnce({
    coords: { latitude: 37, longitude: 127, accuracy: 10 }, timestamp: Date.now() - 120_000,
  });
  expect(await requestLocationWithExplanation()).toBeNull();
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValueOnce({
    coords: { latitude: NaN, longitude: 127, accuracy: 10 }, timestamp: Date.now(),
  });
  expect(await requestLocationWithExplanation()).toBeNull();
});

test('GPS treo kết thúc sau timeout và không nhận kết quả muộn', async () => {
  jest.useFakeTimers();
  (Location.getCurrentPositionAsync as jest.Mock).mockImplementation(() => new Promise(() => {}));
  const pending = requestLocationWithExplanation();
  await jest.advanceTimersByTimeAsync(15_001);
  expect(await pending).toBeNull();
  expect(jest.getTimerCount()).toBe(0);
});

// B07: GPS trong nhà không trả kịp -> dùng vị trí máy đã biết gần đây, quá cũ thì báo lý do.
test('GPS hết giờ dùng vị trí đã biết trong 5 phút', async () => {
  jest.useFakeTimers();
  (Location.getCurrentPositionAsync as jest.Mock).mockImplementation(() => new Promise(() => {}));
  (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValue({
    coords: { latitude: 37.56, longitude: 126.97, accuracy: 30 }, timestamp: Date.now() - 2 * 60_000,
  });
  const pending = requestLocationDetailed();
  await jest.advanceTimersByTimeAsync(15_001);
  expect(await pending).toMatchObject({ coords: { latitude: 37.56, longitude: 126.97 }, failure: null });
});

test('không có vị trí dùng được thì trả lý do thay vì im lặng', async () => {
  (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error('GPS timeout'));
  (Location.getLastKnownPositionAsync as jest.Mock).mockResolvedValue({
    coords: { latitude: 37.56, longitude: 126.97, accuracy: 30 }, timestamp: Date.now() - 10 * 60_000,
  });
  expect(await requestLocationDetailed()).toEqual({ coords: null, failure: 'unavailable' });
  (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(false);
  expect(await requestLocationDetailed()).toEqual({ coords: null, failure: 'services-off' });
  (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied', canAskAgain: false });
  expect(await requestLocationDetailed()).toEqual({ coords: null, failure: 'denied' });
});
