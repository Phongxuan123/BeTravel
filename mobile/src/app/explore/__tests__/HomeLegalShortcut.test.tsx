import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from 'expo-router';
import HomeScreen from '@/app/index';
import ExploreScreen from '@/app/explore';
import { fetchAuLawTopics } from '@/lib/api/auLaws';

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useLocalSearchParams: () => ({}) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/components/common/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => children,
  useAppShellBottomPadding: () => 0,
}));
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ user: null, isGuest: true, isLoading: false }) }));
jest.mock('@/lib/countryContext', () => ({ useCountry: () => ({
  countryCode: 'AU', country: { code: 'AU', name: 'Úc', emergencyNumbers: { police: '000', ambulance: '000' }, embassy: { phone: '0262866059' } }, setCountryCode: jest.fn(),
}) }));
jest.mock('@/features/explore/useSavedArticles', () => ({
  useSavedArticles: () => ({ isSaved: () => false, toggleSaved: jest.fn() }),
}));
jest.mock('@/lib/data', () => ({
  fetchCountries: jest.fn(async () => ({ data: [{ code: 'AU', name: 'Úc', emergencyNumbers: { police: '000', ambulance: '000' }, embassy: { phone: '0262866059' } }] })),
  fetchTrips: jest.fn(async () => ({ data: [] })),
  fetchAlerts: jest.fn(async () => ({ data: [] })),
  fetchArticles: jest.fn(async () => ({ data: [] })),
  fetchTopics: jest.fn(async () => ({ data: [] })),
}));
jest.mock('@/lib/api/auLaws', () => ({
  ...jest.requireActual('@/lib/api/auLaws'),
  fetchAuLawTopics: jest.fn(async () => [{ slug: 'xuat-nhap-canh', label: 'Hộ chiếu và nhập cảnh Úc', lawCount: 2, note: 'Nguồn chính thức' }]),
}));

// Hồi quy: kho bài viết có thể rỗng, nhưng luật Úc ở nguồn riêng vẫn phải truy cập được từ trang chủ.
test('Tra cứu luật nhanh mở cùng Khám phá và truy cập được nhóm luật Úc', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const screen = await render(<QueryClientProvider client={client}><HomeScreen /></QueryClientProvider>);
  await waitFor(() => expect(client.isFetching()).toBe(0));
  await fireEvent.press(screen.getByText('Tra cứu luật nhanh'));
  expect(router.push).toHaveBeenCalledWith('/explore');
  await screen.rerender(<QueryClientProvider client={client}><ExploreScreen /></QueryClientProvider>);
  await waitFor(() => expect(screen.getByText('Hộ chiếu và nhập cảnh Úc')).toBeTruthy());
  expect(fetchAuLawTopics).toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Hộ chiếu và nhập cảnh Úc'));
  expect(router.push).toHaveBeenLastCalledWith({ pathname: '/laws', params: { topic: 'xuat-nhap-canh' } });
  await screen.unmount();
  client.clear();
});
