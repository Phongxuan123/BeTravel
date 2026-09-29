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

// status 'active' de con chon duoc trong wizard (quoc gia 'coming_soon' bi
// disabled o buoc chon, khong lien quan gi den tinh nang goi y thanh pho).
const NO_CITY_COUNTRY = {
  code: 'SG',
  name: 'Singapore',
  region: 'Đông Nam Á',
  regulationsCount: 1,
  status: 'active' as const,
  majorCities: [] as string[],
};

async function setup(country: typeof KR_COUNTRY | typeof NO_CITY_COUNTRY = KR_COUNTRY) {
  (fetchCountries as jest.Mock).mockResolvedValue({ ok: true, data: [country] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const screen = await render(
    <QueryClientProvider client={client}>
      <TripWizardScreen />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(screen.getAllByText(country.name).length).toBeGreaterThan(0));
  // Ten quoc gia xuat hien o ca chip "Pho bien" lan danh sach day du -- lay
  // cai dau tien, ca hai deu goi cung dispatch SET_COUNTRY.
  await fireEvent.press(screen.getAllByText(country.name)[0]);
  await waitFor(() => expect(screen.getByPlaceholderText('Ví dụ: Seoul, Busan, Jeju...')).toBeTruthy());
  return screen;
}

test('danh sach goi y KHONG tu hien khi focus o nhap -- chi hien khi bam mui ten', async () => {
  const screen = await setup();
  const input = screen.getByPlaceholderText('Ví dụ: Seoul, Busan, Jeju...');
  await fireEvent(input, 'focus');
  expect(screen.queryByText('Seoul')).toBeNull();

  await fireEvent.press(screen.getByLabelText('Hiện danh sách gợi ý thành phố'));
  expect(screen.getByText('Seoul')).toBeTruthy();
  expect(screen.getByText('Busan')).toBeTruthy();
  expect(screen.getByText('Incheon')).toBeTruthy();
});

test('bam chon 1 thanh pho trong goi y thi dien duoc vao o nhap (tai hien loi click khong chon duoc)', async () => {
  const screen = await setup();
  await fireEvent.press(screen.getByLabelText('Hiện danh sách gợi ý thành phố'));

  await fireEvent.press(screen.getByText('Busan'));
  expect(screen.getByDisplayValue('Busan')).toBeTruthy();
  // Chon xong thi an danh sach goi y, khong con render lai cac muc khac.
  expect(screen.queryByText('Incheon')).toBeNull();
});

test('go tim khong dau van loc dung goi y trong luc danh sach dang mo', async () => {
  const screen = await setup();
  await fireEvent.press(screen.getByLabelText('Hiện danh sách gợi ý thành phố'));

  const input = screen.getByPlaceholderText('Ví dụ: Seoul, Busan, Jeju...');
  await fireEvent.changeText(input, 'busa');
  expect(screen.getByText('Busan')).toBeTruthy();
  expect(screen.queryByText('Seoul')).toBeNull();
});

test('go ten khong co trong danh sach van duoc giu nguyen, khong bi ep chon', async () => {
  const screen = await setup();
  const input = screen.getByPlaceholderText('Ví dụ: Seoul, Busan, Jeju...');
  await fireEvent.changeText(input, 'Gangneung');
  expect(screen.getByDisplayValue('Gangneung')).toBeTruthy();
});

test('quoc gia chua co majorCities thi khong hien mui ten goi y', async () => {
  const screen = await setup(NO_CITY_COUNTRY);
  expect(screen.queryByLabelText('Hiện danh sách gợi ý thành phố')).toBeNull();
});
