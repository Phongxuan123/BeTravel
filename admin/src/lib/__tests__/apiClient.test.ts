// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from '../apiClient';
import { clearTokens, getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from '../tokenStore';

const BASE = 'http://api.test/api';

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const authHeader = (init?: RequestInit) =>
  ((init?.headers ?? {}) as Record<string, string>).Authorization;

const unauthorized = () =>
  jsonResponse(401, { ok: false, error: { code: 'UNAUTHORIZED', message: 'Het han' } });

describe('apiRequest', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', `${BASE}/`);
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    clearTokens();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('bo dau / cuoi base URL, gan Bearer, bo query rong va tra data + meta', async () => {
    setAccessToken('access-1');
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { ok: true, data: [1], meta: { page: 1, limit: 20, total: 1 } }),
    );

    const result = await apiRequest<number[]>('/admin/legal', {
      query: { page: 1, q: '', status: undefined, flag: false },
    });

    expect(result).toEqual({ data: [1], meta: { page: 1, limit: 20, total: 1 } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/admin/legal?page=1&flag=false`);
    expect(authHeader(init)).toBe('Bearer access-1');
  });

  it('nem ApiError mang dung code, status va details', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(409, {
        ok: false,
        error: { code: 'CONFLICT', message: 'Da bi sua', details: { field: 'updatedAt' } },
      }),
    );

    const error = await apiRequest('/admin/legal/1', { method: 'PATCH', body: {} }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'CONFLICT', status: 409, details: { field: 'updatedAt' } });
  });

  it('loi mang tra UPSTREAM_ERROR, body khong phai JSON tra INTERNAL_ERROR', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('network'));
    await expect(apiRequest('/x')).rejects.toMatchObject({ code: 'UPSTREAM_ERROR', status: 0 });

    fetchMock.mockResolvedValueOnce(new Response('<html>502</html>', { status: 502 }));
    await expect(apiRequest('/x')).rejects.toMatchObject({ code: 'INTERNAL_ERROR', status: 502 });
  });

  it('401 --> refresh MOT lan cho nhieu request dong thoi roi thu lai', async () => {
    setAccessToken('old');
    setRefreshToken('refresh-1');
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) {
        return jsonResponse(200, { ok: true, data: { accessToken: 'new', refreshToken: 'refresh-2' } });
      }
      const auth = authHeader(init);
      return auth === 'Bearer new' ? jsonResponse(200, { ok: true, data: url }) : unauthorized();
    });

    const results = await Promise.all([apiRequest<string>('/a'), apiRequest<string>('/b')]);

    expect(results.map((r) => r.data)).toEqual([`${BASE}/a`, `${BASE}/b`]);
    const refreshCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
    expect(JSON.parse(String(refreshCalls[0][1]?.body))).toEqual({ refreshToken: 'refresh-1' });
    expect(getAccessToken()).toBe('new');
    expect(getRefreshToken()).toBe('refresh-2');
  });

  it('refresh bi tu choi --> xoa token va nem UNAUTHORIZED', async () => {
    setAccessToken('old');
    setRefreshToken('refresh-1');
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(unauthorized());

    await expect(apiRequest('/a')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('mat mang khi refresh KHONG xoa refresh token da nho', async () => {
    setAccessToken('old');
    setRefreshToken('refresh-1');
    fetchMock.mockResolvedValueOnce(unauthorized()).mockRejectedValueOnce(new TypeError('offline'));

    await expect(apiRequest('/a')).rejects.toMatchObject({ code: 'UPSTREAM_ERROR' });
    expect(getRefreshToken()).toBe('refresh-1');
  });

  it('skipAuth khong gan Bearer va khong refresh khi 401', async () => {
    setAccessToken('old');
    fetchMock.mockResolvedValueOnce(unauthorized());

    await expect(apiRequest('/auth/login', { method: 'POST', skipAuth: true })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(authHeader(fetchMock.mock.calls[0][1])).toBeUndefined();
  });
});
