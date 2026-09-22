import { getAccessToken, setAccessToken, getRefreshToken, setRefreshToken, clearTokens } from './tokenStore';

/** Ma loi dong -- phai khop tuyet doi voi backend/src/core/errors.js (10 gia tri). */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'UPSTREAM_ERROR'
  | 'INSUFFICIENT_EVIDENCE'
  | 'INTERNAL_ERROR';

export class ApiError extends Error {
  code: ErrorCode;
  details?: unknown;
  status: number;

  constructor(code: ErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type Meta = { page: number; limit: number; total: number };
type Envelope<T> =
  | { ok: true; data: T; meta?: Meta }
  | { ok: false; error: { code: ErrorCode; message: string; details?: unknown } };

function getApiBaseUrl(): string {
  const url = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!url) throw new Error('VITE_API_BASE_URL chưa được cấu hình trong admin/.env');
  return url.replace(/\/$/, '');
}

// Xem mobile/src/lib/api/http.ts -- cung mot ly do: nhieu request 401 gan nhu
// dong thoi chi duoc phep kich hoat MOT lan refresh, xep hang chung 1 promise.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken();

    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        // Gui ca body (neu co) LAN cookie (tu dong qua credentials:'include') --
        // backend doc duoc ca hai, chay dung bat ke AUTH_TRANSPORT dang la gi.
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      });
      const body = (await res.json()) as Envelope<{ accessToken: string; refreshToken?: string }>;

      if (!body.ok) {
        clearTokens();
        return null;
      }

      setAccessToken(body.data.accessToken);
      if (body.data.refreshToken) setRefreshToken(body.data.refreshToken);
      return body.data.accessToken;
    } catch {
      return null;
    }
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
};

export type ApiResult<T> = { data: T; meta?: Meta };

function buildQueryString(query?: RequestOptions['query']): string {
  if (!query) return '';
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Fetch wrapper hieu envelope {ok,data,meta} / {ok:false,error}. Tu gan
 * Bearer, tu unwrap, ném ApiError mang code, tu refresh khi 401 (mot lan).
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
  isRetry = false,
): Promise<ApiResult<T>> {
  const { method = 'GET', body, query, skipAuth = false } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!skipAuth) {
    const accessToken = getAccessToken();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}${path}${buildQueryString(query)}`, {
      method,
      headers,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('UPSTREAM_ERROR', 'Không thể kết nối tới máy chủ. Kiểm tra kết nối mạng.', 0);
  }

  let envelope: Envelope<T>;
  try {
    envelope = await res.json();
  } catch {
    throw new ApiError('INTERNAL_ERROR', 'Máy chủ trả về dữ liệu không hợp lệ', res.status);
  }

  if (envelope.ok) {
    return { data: envelope.data, meta: envelope.meta };
  }

  const isExpiredAccessToken = envelope.error.code === 'UNAUTHORIZED' && !skipAuth;
  if (isExpiredAccessToken && !isRetry) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) return apiRequest<T>(path, options, true);
    clearTokens();
  }

  throw new ApiError(envelope.error.code, envelope.error.message, res.status, envelope.error.details);
}
