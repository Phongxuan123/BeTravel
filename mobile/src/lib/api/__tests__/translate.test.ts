import { fetchQuickPhrases, translateText } from '../translate';
import { apiRequest } from '../http';
import { getJSON, setJSON } from '@/lib/storage';

jest.mock('../http', () => ({ apiRequest: jest.fn() }));
jest.mock('@/lib/storage', () => ({
  StorageKeys: { quickPhrasesCachePrefix: 'qp:' },
  getJSON: jest.fn(),
  setJSON: jest.fn(async () => {}),
}));

const raw = { _id: 'id1', countryCode: 'KR', vi: 'Tôi cần giúp đỡ', translated: '도와주세요', phonetic: 'Dowajuseyo' };

test('quick phrases duoc cache lai va dung duoc khi ngoai tuyen', async () => {
  (apiRequest as jest.Mock).mockResolvedValueOnce([raw]);
  await fetchQuickPhrases('KR');
  expect(setJSON).toHaveBeenCalledWith('qp:KR', expect.any(Array));
  const cached = (setJSON as jest.Mock).mock.calls[0][1];

  (getJSON as jest.Mock).mockResolvedValue(cached);
  (apiRequest as jest.Mock).mockRejectedValue(new Error('offline'));
  const result = await fetchQuickPhrases('KR');
  expect(result.fromCache).toBe(true);
  expect(result.data[0].vi).toBe('Tôi cần giúp đỡ');
});

test('translateText gui dung from/to/mode va tra ve translated/phonetic', async () => {
  (apiRequest as jest.Mock).mockResolvedValueOnce({ translated: '도와주세요', phonetic: 'Dowajuseyo' });
  const result = await translateText('Tôi cần giúp đỡ', { countryCode: 'KR', from: 'Tiếng Việt', to: 'Tiếng Hàn' });
  expect(apiRequest).toHaveBeenCalledWith('/translate', {
    method: 'POST',
    body: { text: 'Tôi cần giúp đỡ', from: 'Tiếng Việt', to: 'Tiếng Hàn', mode: 'text' },
  });
  expect(result.translated).toBe('도와주세요');
});
