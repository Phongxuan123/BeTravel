import { fetchNearbyLocations, fetchSupportLocations } from '../sos';
import { apiRequest } from '../http';
import { getJSON, setJSON } from '@/lib/storage';
jest.mock('../http', () => ({ apiRequest: jest.fn() }));
jest.mock('@/lib/storage', () => ({
  StorageKeys: { sosLocationsCachePrefix: 'sos:' },
  getJSON: jest.fn(), setJSON: jest.fn(async () => {}),
}));
const raw = { _id: 'id', type: 'hospital', name: 'Test', address: 'Test address', countryCode: 'KR', phone: '123', verified: true, location: { type: 'Point', coordinates: [127, 37] } };

beforeEach(() => jest.clearAllMocks());

test('cache SOS tách bộ lọc và tính lại khoảng cách khi ngoại tuyến', async () => {
  (apiRequest as jest.Mock).mockResolvedValueOnce([raw]);
  await fetchSupportLocations({ country: 'KR', type: 'hospital' });
  expect(setJSON).toHaveBeenCalledWith('sos:KR:hospital', expect.any(Array));
  const cached = (setJSON as jest.Mock).mock.calls[0][1];
  (getJSON as jest.Mock).mockResolvedValue(cached);
  (apiRequest as jest.Mock).mockRejectedValue(new Error('offline'));
  const result = await fetchNearbyLocations(37, 127, { country: 'KR', type: 'hospital' });
  expect(result.fromCache).toBe(true);
  expect(result.data[0].distanceKm).toBe(0);
});

test('cache nearby không ghi đè danh sách toàn quốc; truyền đúng bán kính/limit', async () => {
  (apiRequest as jest.Mock).mockResolvedValue([raw]);
  await fetchNearbyLocations(37, 127, { country: 'KR', radiusKm: 5, limit: 50 });
  expect(setJSON).toHaveBeenCalledWith('sos:KR:all:nearby', expect.any(Array));
  expect(apiRequest).toHaveBeenCalledWith(expect.stringContaining('radiusKm=5&limit=50'));
});

test('offline tôn trọng bán kính và limit, chỉ mở rộng khi không có điểm gần', async () => {
  (apiRequest as jest.Mock).mockRejectedValue(new Error('offline'));
  (getJSON as jest.Mock).mockResolvedValue([
    { id: 'far', type: 'hospital', name: 'Far', meta: '', verified: true, lat: 35, lng: 129 },
    { id: 'near', type: 'hospital', name: 'Near', meta: '', verified: true, lat: 37, lng: 127 },
  ]);
  const result = await fetchNearbyLocations(37, 127, { country: 'KR', radiusKm: 5, limit: 50 });
  expect(result.data.map((l) => l.id)).toEqual(['near']);
  const expanded = await fetchNearbyLocations(0, 0, { country: 'KR', radiusKm: 5, limit: 1 });
  expect(expanded.data).toHaveLength(1);
});

test('cache cũ chưa kiểm chứng hoặc dữ liệu hỏng không vào bản đồ', async () => {
  (apiRequest as jest.Mock).mockRejectedValue(new Error('offline'));
  (getJSON as jest.Mock).mockResolvedValue([
    null,
    { id: 'unverified', name: 'Old', type: 'hospital', meta: '', lat: 37, lng: 127, verified: false },
    { id: 'bad-gps', name: 'Bad', type: 'hospital', meta: '', lat: 127, lng: 37, verified: true },
  ]);
  expect((await fetchSupportLocations({ country: 'KR' })).data).toEqual([]);
  (getJSON as jest.Mock).mockResolvedValue({ damaged: true });
  await expect(fetchSupportLocations({ country: 'KR' })).rejects.toThrow('offline');
});
