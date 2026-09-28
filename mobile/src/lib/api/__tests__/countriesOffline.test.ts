import { fetchCountries } from '../content';
import { apiRequest } from '../http';
import { getJSON, setJSON } from '@/lib/storage';

jest.mock('../http', () => ({ ...jest.requireActual('../http'), apiRequest: jest.fn() }));
jest.mock('@/lib/storage', () => ({
  StorageKeys: { countriesCache: 'countries' },
  getJSON: jest.fn(async () => null),
  setJSON: jest.fn(async () => {}),
}));

const rawKr = {
  _id: 'kr',
  code: 'KR',
  name: 'Hàn Quốc',
  status: 'active',
  emergencyNumbers: { police: '112', ambulance: '119', fire: '119', marine: '122' },
  embassy: { name: 'Đại sứ quán', address: 'Seoul', phone: '+82', lat: 37.5, lng: 127 },
  articleCount: 0,
};

beforeEach(() => jest.clearAllMocks());

// H-08.a (docs/07_QA_BugHunt.md): so khan cap cua SOS lay tu danh sach quoc
// gia -- mo app luc mat mang khong duoc lam mat het du lieu nay.
test('danh sách quốc gia được lưu lại và dùng khi mất mạng', async () => {
  (apiRequest as jest.Mock).mockResolvedValueOnce([rawKr]);
  const online = await fetchCountries();
  expect(setJSON).toHaveBeenCalledWith('countries', online.data);

  (getJSON as jest.Mock).mockResolvedValueOnce(online.data);
  (apiRequest as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  const offline = await fetchCountries();
  expect(offline.data[0].emergencyNumbers.police).toBe('112');
});

test('mất mạng và chưa từng tải được thì vẫn báo lỗi để màn hình hiện trạng thái lỗi', async () => {
  const offline = new Error('offline');
  (apiRequest as jest.Mock).mockRejectedValueOnce(offline);
  await expect(fetchCountries()).rejects.toBe(offline);
});
