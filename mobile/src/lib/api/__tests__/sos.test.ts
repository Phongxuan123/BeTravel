import { fetchNearbyLocations, fetchSupportLocations } from '../sos';
import { apiRequest } from '../http';
import { getJSON, setJSON } from '@/lib/storage';
jest.mock('../http', () => ({ apiRequest: jest.fn() }));
jest.mock('@/lib/storage', () => ({
  StorageKeys: { sosLocationsCachePrefix: 'sos:' },
  getJSON: jest.fn(), setJSON: jest.fn(async () => {}),
}));
const raw = { _id: 'id', type: 'hospital', name: 'Test', address: 'Test address', countryCode: 'KR', phone: '123', verified: false, location: { type: 'Point', coordinates: [127, 37] } };

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
