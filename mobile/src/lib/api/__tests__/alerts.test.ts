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
