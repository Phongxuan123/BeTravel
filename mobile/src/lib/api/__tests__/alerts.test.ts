import { fetchAlerts, markAlertRead, setAlertsContext } from '../alerts';
import { apiRequest } from '../http';
import { getJSON, setJSON } from '@/lib/storage';

jest.mock('../http', () => ({ apiRequest: jest.fn() }));
jest.mock('@/lib/storage', () => ({
  StorageKeys: { dismissedAlerts: 'dismissed:' },
  getJSON: jest.fn(),
  setJSON: jest.fn(async () => {}),
}));

const raw = {
  _id: 'a1',
  countryCode: 'KR',
  scope: 'area' as const,
  title: 'Biểu tình gần Seoul',
  message: 'Tránh khu vực này',
  severity: 'danger' as const,
  behaviorsToAvoid: ['Không tụ tập'],
  linkedArticleId: null,
  effectiveFrom: '2026-09-25T00:00:00.000Z',
  effectiveTo: null,
  status: 'published',
};

beforeEach(() => {
  jest.clearAllMocks();
  (getJSON as jest.Mock).mockResolvedValue({});
});

test('fetchAlerts tra rong khi chua goi setAlertsContext', async () => {
  const result = await fetchAlerts();
  expect(result.data).toEqual([]);
  expect(apiRequest).not.toHaveBeenCalled();
});

test('fetchAlerts goi dung query va anh xa sang category safety', async () => {
  setAlertsContext({ countryCode: 'KR', lat: 37.5, lng: 127 });
  (apiRequest as jest.Mock).mockResolvedValueOnce([raw]);

  const result = await fetchAlerts();
  expect(apiRequest).toHaveBeenCalledWith('/alerts/applicable?country=KR&lat=37.5&lng=127');
  expect(result.data[0].category).toBe('safety');
  expect(result.data[0].severity).toBe('danger');
  expect(result.data[0].read).toBe(false);
});

test('markAlertRead luu vao AsyncStorage, alert dismiss trong 24h khong hien lai (read=true)', async () => {
  setAlertsContext({ countryCode: 'KR' });
  let stored: Record<string, string> = {};
  (setJSON as jest.Mock).mockImplementation(async (_key, value) => {
    stored = value;
  });

  await markAlertRead('a1');
  expect(stored.a1).toBeDefined();

  (getJSON as jest.Mock).mockResolvedValue(stored);
  (apiRequest as jest.Mock).mockResolvedValueOnce([raw]);
  const result = await fetchAlerts();
  expect(result.data[0].read).toBe(true);
});

test('đóng cảnh báo tách tài khoản, hai thao tác đồng thời không mất dữ liệu', async () => {
  const store: Record<string, Record<string, string>> = {};
  (getJSON as jest.Mock).mockImplementation(async (key) => ({ ...store[key] }));
  (setJSON as jest.Mock).mockImplementation(async (key, value) => { store[key] = { ...value }; });
  setAlertsContext({ countryCode: 'KR', owner: 'a@test.local' });
  await Promise.all([markAlertRead('a1'), markAlertRead('a2')]);
  (apiRequest as jest.Mock).mockResolvedValue([raw]);
  expect((await fetchAlerts()).data[0].read).toBe(true);
  expect(Object.values(store)[0]).toHaveProperty('a2');
  setAlertsContext({ countryCode: 'KR', owner: 'b@test.local' });
  expect((await fetchAlerts()).data[0].read).toBe(false);
});

test('bỏ response của quốc gia cũ khi chuyển context trong lúc request chạy', async () => {
  let finish!: (value: unknown) => void;
  (apiRequest as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  setAlertsContext({ countryCode: 'KR', owner: 'a@test.local' });
  const pending = fetchAlerts();
  setAlertsContext({ countryCode: 'JP', owner: 'a@test.local' });
  finish([raw]);
  expect((await pending).data).toEqual([]);
});
