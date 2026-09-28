import { apiRequest } from '../http';
import { clearTokens, setAccessToken } from '../tokenStore';
jest.mock('expo-constants', () => ({ expoConfig: { hostUri: 'localhost:8081' } }));
jest.mock('../tokenStore', () => ({
  getAccessToken: jest.fn(() => 'old-access'),
  getRefreshToken: jest.fn(async () => 'remembered-refresh'),
  setAccessToken: jest.fn(), setRefreshToken: jest.fn(), clearTokens: jest.fn(),
}));

const fetchMock = jest.fn();
const response = (data: unknown, status = 200) => ({ status, json: async () => data });
beforeEach(() => { jest.clearAllMocks(); globalThis.fetch = fetchMock; });

test('refresh mất mạng giữ token, request sau có thể phục hồi', async () => {
  fetchMock.mockResolvedValueOnce(response({ ok: false, error: { code: 'UNAUTHORIZED', message: 'expired' } }, 401))
    .mockRejectedValueOnce(new Error('offline'));
  await expect(apiRequest('/auth/me')).rejects.toMatchObject({ code: 'UPSTREAM_ERROR' });
  expect(clearTokens).not.toHaveBeenCalled();
  fetchMock.mockResolvedValueOnce(response({ ok: false, error: { code: 'UNAUTHORIZED', message: 'expired' } }, 401))
    .mockResolvedValueOnce(response({ ok: true, data: { accessToken: 'new-access' } }))
    .mockResolvedValueOnce(response({ ok: true, data: { user: 'restored' } }));
  await expect(apiRequest('/auth/me')).resolves.toEqual({ user: 'restored' });
  expect(setAccessToken).toHaveBeenCalledWith('new-access');
});

test('nhiều request cùng nhận 401 chỉ kích hoạt một lần refresh rồi phát lại', async () => {
  const expired = response({ ok: false, error: { code: 'UNAUTHORIZED', message: 'expired' } }, 401);
  fetchMock.mockImplementation(async (url: string, init: { headers?: Record<string, string> }) => {
    if (url.endsWith('/auth/refresh')) return response({ ok: true, data: { accessToken: 'new-access' } });
    return init.headers?.Authorization === 'Bearer new-access' ? response({ ok: true, data: url }) : expired;
  });
  const { getAccessToken } = jest.requireMock('../tokenStore') as { getAccessToken: jest.Mock };
  getAccessToken.mockImplementation(() =>
    (setAccessToken as jest.Mock).mock.calls.length ? 'new-access' : 'old-access',
  );

  const results = await Promise.all(['/a', '/b', '/c'].map((path) => apiRequest<string>(path)));

  expect(results).toEqual([expect.stringMatching(/\/a$/), expect.stringMatching(/\/b$/), expect.stringMatching(/\/c$/)]);
  const refreshCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'));
  expect(refreshCalls).toHaveLength(1);
  getAccessToken.mockImplementation(() => 'old-access');
  fetchMock.mockReset();
});

test('refresh token thật sự bị thu hồi mới xóa phiên', async () => {
  fetchMock.mockResolvedValue(response({ ok: false, error: { code: 'UNAUTHORIZED', message: 'revoked' } }, 401));
  await expect(apiRequest('/auth/me')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  expect(clearTokens).toHaveBeenCalled();
});
