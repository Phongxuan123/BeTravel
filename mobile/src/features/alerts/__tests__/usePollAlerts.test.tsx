import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { usePollAlerts } from '../usePollAlerts';
import { useAuth } from '@/lib/auth';
import { fetchPreferences, fetchAlerts, fetchTrips, setAlertsContext } from '@/lib/data';

jest.mock('@/lib/auth', () => ({ useAuth: jest.fn() }));
jest.mock('@/lib/countryContext', () => ({ useCountry: () => ({ countryCode: 'KR' }) }));
jest.mock('@/lib/data', () => ({ fetchTrips: jest.fn(async () => ({ ok: true, data: [] })), fetchPreferences: jest.fn(), fetchAlerts: jest.fn(async () => ({ ok: true, data: [] })), setAlertsContext: jest.fn() }));
jest.mock('expo-location', () => ({ getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })), getLastKnownPositionAsync: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  (fetchTrips as jest.Mock).mockResolvedValue({ ok: true, data: [] });
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  (useAuth as jest.Mock).mockReturnValue({ isGuest: false, user: { email: 'a@test.local' } });
});

test('chuyến đi tắt vị trí không đọc GPS dù consent toàn cục đã bật', async () => {
  (fetchPreferences as jest.Mock).mockResolvedValue({ data: { locationConsent: true, alerts: { safety: true } } });
  (fetchTrips as jest.Mock).mockResolvedValue({ ok: true, data: [{ isCurrent: true, locationAlerts: false }] });
  const { client, wrapper } = setup();
  const hook = await renderHook(usePollAlerts, { wrapper });
  await waitFor(() => expect(client.getQueryData(['trips'])).toBeDefined());
  expect(Location.getForegroundPermissionsAsync).not.toHaveBeenCalled();
  await hook.unmount();
  client.clear();
});

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

test('không đọc GPS khi consent chưa tải hoặc guest', async () => {
  (fetchPreferences as jest.Mock).mockImplementation(() => new Promise(() => {}));
  const { client, wrapper } = setup();
  const hook = await renderHook(usePollAlerts, { wrapper });
  expect(Location.getForegroundPermissionsAsync).not.toHaveBeenCalled();
  (useAuth as jest.Mock).mockReturnValue({ isGuest: true, user: null });
  await hook.rerender({});
  expect(setAlertsContext).toHaveBeenLastCalledWith(null);
  expect(Location.getForegroundPermissionsAsync).not.toHaveBeenCalled();
  await hook.unmount();
  client.clear();
});

test('tắt consent trong lúc GPS chạy thì không gửi tọa độ cũ', async () => {
  (fetchPreferences as jest.Mock).mockResolvedValue({ data: { locationConsent: true, alerts: { safety: true } } });
  let finish!: (value: unknown) => void;
  (Location.getLastKnownPositionAsync as jest.Mock).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const { client, wrapper } = setup();
  const hook = await renderHook(usePollAlerts, { wrapper });
  await waitFor(() => expect(Location.getLastKnownPositionAsync).toHaveBeenCalled());
  await act(async () => { client.setQueryData(['preferences'], { data: { locationConsent: false, alerts: { safety: false } } }); });
  await act(async () => { finish({ coords: { latitude: 37, longitude: 127 } }); });
  expect((setAlertsContext as jest.Mock).mock.calls.some(([context]) => context?.lat !== undefined)).toBe(false);
  expect(hook.result.current.alerts).toEqual([]);
  expect(fetchAlerts).toHaveBeenCalled();
  await hook.unmount();
  client.clear();
});
