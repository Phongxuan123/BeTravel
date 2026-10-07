import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExploreScreen from '@/app/explore/index';
import { fetchTopics, fetchArticles, fetchCountries } from '@/lib/data';

// Tai hien loi: countryCode rong trong luc CountryProvider con dang xac dinh
// quoc gia mac dinh (xem lib/countryContext.tsx) khong duoc goi API va khong
// duoc hien banner "Kiem tra ket noi mang" -- truoc khi sua, man hinh nay
// thieu enabled: !!countryCode nen goi API voi countryCode rong, backend tra
// 400 va man hinh hien nham loi mang ngay khi vao app.
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useLocalSearchParams: () => ({}) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/components/common/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => children,
  APP_SHELL_CONTENT_BOTTOM_PADDING: 0,
}));
jest.mock('@/features/explore/useSavedArticles', () => ({
  useSavedArticles: () => ({ isSaved: () => false, toggleSaved: jest.fn() }),
}));
jest.mock('@/lib/data', () => ({
  fetchTopics: jest.fn(),
  fetchArticles: jest.fn(),
  fetchCountries: jest.fn(),
}));

const mockUseCountry = jest.fn();
jest.mock('@/lib/countryContext', () => ({ useCountry: () => mockUseCountry() }));

beforeEach(() => {
  jest.clearAllMocks();
  (fetchCountries as jest.Mock).mockResolvedValue({ ok: true, data: [] });
});

// Đợi QueryClient cập nhật giao diện, thay vì kết thúc test ngay khi fetch được gọi.
async function renderExplore() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const screen = await render(
    <QueryClientProvider client={client}><ExploreScreen /></QueryClientProvider>,
  );
  await waitFor(() => expect(client.isFetching()).toBe(0));
  return screen;
}

test('countryCode rong (dang xac dinh quoc gia) -- KHONG goi API va KHONG hien loi mang', async () => {
  mockUseCountry.mockReturnValue({ countryCode: '', country: undefined, setCountryCode: jest.fn() });
  const screen = await renderExplore();

  expect(screen.getByText('Đang tải…')).toBeTruthy();
  expect(screen.queryByText('Không tải được dữ liệu. Kiểm tra kết nối mạng.')).toBeNull();
  expect(fetchTopics).not.toHaveBeenCalled();
  expect(fetchArticles).not.toHaveBeenCalled();
});

test('co countryCode thi goi API binh thuong, khong con banner loi', async () => {
  mockUseCountry.mockReturnValue({
    countryCode: 'KR',
    country: { code: 'KR', name: 'Hàn Quốc' },
    setCountryCode: jest.fn(),
  });
  (fetchTopics as jest.Mock).mockResolvedValue({ ok: true, data: [] });
  (fetchArticles as jest.Mock).mockResolvedValue({ ok: true, data: [] });

  const screen = await renderExplore();

  await waitFor(() => expect(fetchTopics).toHaveBeenCalledWith('KR'));
  expect(screen.queryByText('Không tải được dữ liệu. Kiểm tra kết nối mạng.')).toBeNull();
});

test('backend tam khoa tra cuu phap luat -- hien thong bao tam ngung, khong bao nham loi mang', async () => {
  const { ApiError } = jest.requireActual('@/lib/api/http');
  const disabled = new ApiError('FORBIDDEN', 'Tính năng tra cứu pháp luật đang tạm ngưng.', 403, {
    reason: 'FEATURE_DISABLED',
  });
  mockUseCountry.mockReturnValue({
    countryCode: 'KR',
    country: { code: 'KR', name: 'Hàn Quốc' },
    setCountryCode: jest.fn(),
  });
  (fetchTopics as jest.Mock).mockRejectedValue(disabled);
  (fetchArticles as jest.Mock).mockRejectedValue(disabled);

  const screen = await renderExplore();

  await waitFor(() => expect(screen.getByText('Tính năng tra cứu pháp luật đang tạm ngưng.')).toBeTruthy());
  expect(screen.queryByText('Không tải được dữ liệu. Kiểm tra kết nối mạng.')).toBeNull();
});
