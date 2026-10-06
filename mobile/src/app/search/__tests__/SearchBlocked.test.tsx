import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SearchScreen from '@/app/search/index';
import { searchArticles, fetchTopics } from '@/lib/data';
import { ApiError } from '@/lib/api/http';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({ q: 'visa' }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/lib/countryContext', () => ({
  useCountry: () => ({ countryCode: 'KR', country: { code: 'KR', name: 'Hàn Quốc' } }),
}));
jest.mock('@/lib/data', () => ({ searchArticles: jest.fn(), fetchTopics: jest.fn() }));

test('tim kiem bi phong toa o backend --> man chan thay vi bao loi mang', async () => {
  (fetchTopics as jest.Mock).mockResolvedValue({ ok: true, data: [] });
  (searchArticles as jest.Mock).mockRejectedValue(
    new ApiError('FORBIDDEN', 'Tính năng tra cứu pháp luật đang tạm ngưng.', 403, { reason: 'FEATURE_DISABLED' }),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const screen = await render(
    <QueryClientProvider client={client}>
      <SearchScreen />
    </QueryClientProvider>,
  );

  await waitFor(() => expect(screen.getByText('Tính năng tra cứu pháp luật đang tạm ngưng.')).toBeTruthy());
  expect(screen.queryByText('Không thể tìm kiếm lúc này. Kiểm tra kết nối mạng và thử lại.')).toBeNull();
});
