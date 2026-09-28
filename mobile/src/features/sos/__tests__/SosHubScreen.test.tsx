import { render } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SosHubScreen from '@/app/sos';

// Test dat o features/ vi moi file trong app/ la mot route cua expo-router.
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/features/alerts/usePollAlerts', () => ({ usePollAlerts: () => ({ alerts: [] }) }));
jest.mock('@/lib/countryContext', () => ({
  useCountry: () => ({ countryCode: '', country: undefined, setCountryCode: jest.fn() }),
}));

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

// H-08.a: thieu du lieu quoc gia (mo app lan dau khi mat mang) truoc day tra
// `null` --> man hinh trang, khong co ca nut quay lai.
test('SOS vẫn hiện hướng dẫn và nút quay lại khi chưa có dữ liệu quốc gia', async () => {
  const screen = await render(
    <QueryClientProvider client={new QueryClient()}>
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <SosHubScreen />
      </SafeAreaProvider>
    </QueryClientProvider>,
  );
  expect(screen.getByTestId('sos-country-unavailable')).toBeTruthy();
  expect(screen.getByLabelText('Quay lại')).toBeTruthy();
});
