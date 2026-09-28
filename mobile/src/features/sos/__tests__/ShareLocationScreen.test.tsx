import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import * as Location from 'expo-location';
import ShareLocationScreen from '@/app/sos/share-location';

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => (() => void)) => jest.requireActual('react').useEffect(callback, []),
}));
jest.mock('@/components/common/PageHeader', () => ({ PageHeader: () => null }));
jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted', canAskAgain: true });
  (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);
  (Location.getCurrentPositionAsync as jest.Mock).mockImplementation(async () => ({
    coords: { latitude: 21, longitude: 105, accuracy: 12 }, timestamp: Date.now(),
  }));
  jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
});

test('không tự xin GPS hoặc gửi; lấy GPS rồi phải bấm chia sẻ riêng', async () => {
  const screen = await render(<ShareLocationScreen />);
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Lấy vị trí của tôi'));
  await waitFor(() => expect(screen.getByText('21.000000, 105.000000')).toBeTruthy());
  expect(Share.share).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Chọn ứng dụng và người nhận'));
  expect(Share.share).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('query=21.000000%2C105.000000') }));
  expect(screen.getByText(/BeTravel không xác nhận/)).toBeTruthy();
});

test('từ chối quyền không gọi GPS và không chia sẻ', async () => {
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied', canAskAgain: false });
  const screen = await render(<ShareLocationScreen />);
  await fireEvent.press(screen.getByLabelText('Lấy vị trí của tôi'));
  await waitFor(() => expect(screen.getByLabelText('Mở cài đặt điện thoại')).toBeTruthy());
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  expect(Share.share).not.toHaveBeenCalled();
});

test('hủy GPS bỏ kết quả đến muộn', async () => {
  let finish!: (value: unknown) => void;
  (Location.getCurrentPositionAsync as jest.Mock).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const screen = await render(<ShareLocationScreen />);
  await fireEvent.press(screen.getByLabelText('Lấy vị trí của tôi'));
  await waitFor(() => expect(Location.getCurrentPositionAsync).toHaveBeenCalled());
  await fireEvent.press(screen.getByLabelText('Hủy lấy vị trí'));
  await act(async () => finish({ coords: { latitude: 21, longitude: 105, accuracy: 12 }, timestamp: Date.now() }));
  expect(screen.queryByText('21.000000, 105.000000')).toBeNull();
  expect(Share.share).not.toHaveBeenCalled();
});

test('hủy bảng chia sẻ không báo đã gửi', async () => {
  (Share.share as jest.Mock).mockResolvedValue({ action: Share.dismissedAction });
  const screen = await render(<ShareLocationScreen />);
  await fireEvent.press(screen.getByLabelText('Lấy vị trí của tôi'));
  await waitFor(() => expect(screen.getByLabelText('Chọn ứng dụng và người nhận')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Chọn ứng dụng và người nhận'));
  expect(screen.getByText('Đã hủy bảng chia sẻ.')).toBeTruthy();
});

test('GPS tắt không lấy tọa độ, có hướng dẫn mở cài đặt', async () => {
  (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(false);
  const screen = await render(<ShareLocationScreen />);
  await fireEvent.press(screen.getByLabelText('Lấy vị trí của tôi'));
  await waitFor(() => expect(screen.getByText(/Dịch vụ vị trí đang tắt/)).toBeTruthy());
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  expect(Share.share).not.toHaveBeenCalled();
});

test('tọa độ GPS đã cũ không được đưa vào bảng chia sẻ', async () => {
  (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
    coords: { latitude: 21, longitude: 105, accuracy: 12 }, timestamp: Date.now() - 120_000,
  });
  const screen = await render(<ShareLocationScreen />);
  await fireEvent.press(screen.getByLabelText('Lấy vị trí của tôi'));
  await waitFor(() => expect(screen.getByText(/Vị trí không hợp lệ hoặc đã quá/)).toBeTruthy());
  expect(screen.queryByLabelText('Chọn ứng dụng và người nhận')).toBeNull();
  expect(Share.share).not.toHaveBeenCalled();
});

test('lỗi mở bảng chia sẻ được hiển thị và có thể thử lại', async () => {
  (Share.share as jest.Mock).mockRejectedValueOnce(new Error('Không có ứng dụng chia sẻ'));
  const screen = await render(<ShareLocationScreen />);
  await fireEvent.press(screen.getByLabelText('Lấy vị trí của tôi'));
  await waitFor(() => expect(screen.getByLabelText('Chọn ứng dụng và người nhận')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Chọn ứng dụng và người nhận'));
  expect(screen.getByText('Không có ứng dụng chia sẻ')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Chọn ứng dụng và người nhận'));
  expect(Share.share).toHaveBeenCalledTimes(2);
});
