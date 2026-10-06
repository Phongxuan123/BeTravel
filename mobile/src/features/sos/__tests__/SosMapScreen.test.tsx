import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Constants from 'expo-constants';
import SosMapScreen from '@/app/sos/map';
import { fetchSupportLocations, fetchNearbyLocations } from '@/lib/data';
import { requestLocationWithExplanation } from '@/lib/locationPermission';

const mockAnimate = jest.fn();
const mockFit = jest.fn();
let mockCountry: { code: string; name: string; embassy: { name: string; lat: number; lng: number } } | undefined;
jest.mock('expo-router', () => ({ router: { back: jest.fn() }, useLocalSearchParams: () => ({}) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@/lib/countryContext', () => ({ useCountry: () => ({ country: mockCountry }) }));
jest.mock('@/lib/data', () => ({ fetchSupportLocations: jest.fn(), fetchNearbyLocations: jest.fn() }));
jest.mock('@/lib/locationPermission', () => ({ requestLocationWithExplanation: jest.fn() }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { executionEnvironment: 'standalone', expoConfig: { extra: {} } } }));
jest.mock('react-native-maps', () => {
  const React = jest.requireActual('react');
  const { View: NativeView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: React.forwardRef(function MockMap({ children, onMapReady }: { children: React.ReactNode; onMapReady: () => void }, ref: unknown) {
      React.useImperativeHandle(ref, () => ({ animateToRegion: mockAnimate, fitToCoordinates: mockFit }));
      // Native onMapReady chỉ phát khi mount, không phát lại vì callback đổi identity.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      React.useEffect(() => { onMapReady(); }, []);
      return <NativeView testID="native-map">{children}</NativeView>;
    }),
    Marker: () => null,
  };
});
jest.mock('@/components/common/SimpleSheet', () => {
  const { View } = jest.requireActual('react-native');
  return { SimpleSheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => visible ? <View>{children}</View> : null };
});

const point = { id: '1', name: 'Đồn cảnh sát Seoul', address: 'Gangnam', type: 'police',
  meta: 'Cảnh sát', phone: '112', lat: 37, lng: 127, verified: true };
beforeEach(() => {
  jest.clearAllMocks();
  mockCountry = { code: 'KR', name: 'Hàn Quốc', embassy: { name: '', lat: 0, lng: 0 } };
  (fetchSupportLocations as jest.Mock).mockResolvedValue({ ok: true, data: [point] });
  (fetchNearbyLocations as jest.Mock).mockResolvedValue({ ok: true, data: [{ ...point, distanceKm: 0 }] });
  (requestLocationWithExplanation as jest.Mock).mockResolvedValue({ latitude: 37, longitude: 127 });
});

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

test('tải danh sách không tự xin GPS; tìm tên không dấu và địa chỉ', async () => {
  const screen = await render(<SosMapScreen />, { wrapper: wrapper() });
  await waitFor(() => expect(screen.getByText(point.name)).toBeTruthy());
  expect(requestLocationWithExplanation).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Tìm địa điểm hỗ trợ'), 'don Gangnam');
  expect(screen.getByText(point.name)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Tìm địa điểm hỗ trợ'), 'không có');
  expect(screen.getByText(/Không có địa điểm khớp/)).toBeTruthy();
});

test('GPS mới cập nhật camera và query; bán kính truyền đúng backend', async () => {
  const screen = await render(<SosMapScreen />, { wrapper: wrapper() });
  await fireEvent.press(screen.getByLabelText('Lấy vị trí hiện tại'));
  await waitFor(() => expect(fetchNearbyLocations).toHaveBeenCalledWith(37, 127, { country: 'KR', type: undefined, radiusKm: 20, limit: 50 }));
  expect(mockAnimate).toHaveBeenCalledWith(expect.objectContaining({ latitude: 37, longitude: 127 }), 400);
  await fireEvent.press(screen.getByLabelText('Bán kính 5 km'));
  await waitFor(() => expect(fetchNearbyLocations).toHaveBeenLastCalledWith(37, 127, expect.objectContaining({ radiusKm: 5 })));
});

test('GPS từ chối vẫn dùng danh sách; đổi quốc gia bỏ sheet cũ', async () => {
  (requestLocationWithExplanation as jest.Mock).mockResolvedValue(null);
  const screen = await render(<SosMapScreen />, { wrapper: wrapper() });
  await waitFor(() => expect(screen.getByText(point.name)).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Lấy vị trí hiện tại'));
  await waitFor(() => expect(screen.getByText('GPS không khả dụng')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText(`Xem chi tiết ${point.name}`));
  expect(screen.getByText('Gọi ngay')).toBeTruthy();
  mockCountry = { code: 'JP', name: 'Nhật Bản', embassy: { name: '', lat: 0, lng: 0 } };
  await screen.rerender(<SosMapScreen />);
  expect(screen.queryByText('Gọi ngay')).toBeNull();
  await waitFor(() => expect(fetchSupportLocations).toHaveBeenCalledWith({ country: 'JP', type: undefined }));
});

test('API lỗi có nút thử lại; thiếu quốc gia hiện hướng dẫn', async () => {
  (fetchSupportLocations as jest.Mock).mockRejectedValue(new Error('offline'));
  const screen = await render(<SosMapScreen />, { wrapper: wrapper() });
  await waitFor(() => expect(screen.getByLabelText('Thử tải lại địa điểm')).toBeTruthy());
  (fetchSupportLocations as jest.Mock).mockResolvedValue({ ok: true, data: [] });
  await fireEvent.press(screen.getByLabelText('Thử tải lại địa điểm'));
  await waitFor(() => expect(screen.getByText(/Chưa có địa điểm hỗ trợ đã kiểm chứng/)).toBeTruthy());
  mockCountry = undefined;
  await screen.rerender(<SosMapScreen />);
  expect(screen.getByText(/Chưa tải được quốc gia/)).toBeTruthy();
});

test('Android thiếu key hiển thị danh sách và giữ thao tác chi tiết', async () => {
  // Jest preset chọn iOS; đổi OS trong test này để kiểm tra guard native Android.
  const { Platform } = jest.requireActual('react-native');
  const previous = Platform.OS;
  Platform.OS = 'android';
  try {
    expect(Constants.expoConfig?.extra?.androidMapsConfigured).toBeUndefined();
    const screen = await render(<SosMapScreen />, { wrapper: wrapper() });
    expect(screen.queryByTestId('native-map')).toBeNull();
    expect(screen.getByText(/Bản đồ chưa được cấu hình/)).toBeTruthy();
    await waitFor(() => expect(screen.getByLabelText(`Xem chi tiết ${point.name}`)).toBeTruthy());
  } finally { Platform.OS = previous; }
});
