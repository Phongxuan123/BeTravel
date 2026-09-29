import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TripWizardScreen from '@/app/trips/new';
import { fetchCountries } from '@/lib/data';

// Man wizard tao chuyen di goi majorCities qua fetchCountries -- test nay
// chi kiem buoc 1 (chon quoc gia + go/chon thanh phi), khong dung backend that.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ isGuest: false }) }));
jest.mock('@/components/common/PageHeader', () => ({ PageHeader: () => null }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@/lib/data', () => ({
  fetchCountries: jest.fn(),
  fetchTrips: jest.fn(),
  createTrip: jest.fn(),
  updateTrip: jest.fn(),
  setCurrentTrip: jest.fn(),
}));

const KR_COUNTRY = {
  code: 'KR',
  name: 'Hàn Quốc',
  region: 'Đông Á',
  regulationsCount: 5,
  status: 'active' as const,
  majorCities: ['Seoul', 'Busan', 'Incheon'],
};

async function setup() {
  (fetchCountries as jest.Mock).mockResolvedValue({ ok: true, data: [KR_COUNTRY] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const screen = await render(
    <QueryClientProvider client={client}>
      <TripWizardScreen />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getAllByText('Hàn Quốc').length).toBeGreaterThan(0));
  // "Hàn Quốc" xuat hien o ca chip "Pho bien" lan danh sach day du -- lay cai
  // dau tien, ca hai deu goi cung dispatch SET_COUNTRY.
  await fireEvent.press(screen.getAllByText('Hàn Quốc')[0]);
  await waitFor(() => expect(screen.getByPlaceholderText('Ví dụ: Seoul, Busan, Jeju...')).toBeTruthy());
  return screen;
}

test('chon quoc gia xong, focus vao o thanh pho thi hien goi y tu majorCities', async () => {
  const screen = await setup();
  const input = screen.getByPlaceholderText('Ví dụ: Seoul, Busan, Jeju...');
  await fireEvent(input, 'focus');
  expect(screen.getByText('Seoul')).toBeTruthy();
  expect(screen.getByText('Busan')).toBeTruthy();
  expect(screen.getByText('Incheon')).toBeTruthy();
});

test('go tim khong dau van loc dung goi y va chon xong thi dien vao o nhap', async () => {
  const screen = await setup();
  const input = screen.getByPlaceholderText('Ví dụ: Seoul, Busan, Jeju...');
  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, 'busa');
  expect(screen.getByText('Busan')).toBeTruthy();
  expect(screen.queryByText('Seoul')).toBeNull();

  await fireEvent.press(screen.getByText('Busan'));
  expect(screen.getByDisplayValue('Busan')).toBeTruthy();
  // Chon xong thi an danh sach goi y, khong con render lai item da chon nhu goi y.
  expect(screen.queryByText('Incheon')).toBeNull();
});

test('go ten khong co trong danh sach van duoc giu nguyen, khong bi ep chon', async () => {
  const screen = await setup();
  const input = screen.getByPlaceholderText('Ví dụ: Seoul, Busan, Jeju...');
  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, 'Gangneung');
  expect(screen.getByDisplayValue('Gangneung')).toBeTruthy();
});
