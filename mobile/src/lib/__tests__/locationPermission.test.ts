import * as Location from 'expo-location';
import { requestLocationWithExplanation } from '../locationPermission';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);
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
