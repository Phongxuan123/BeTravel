import Constants from 'expo-constants';
import { getAccessToken, setAccessToken, getRefreshToken, setRefreshToken, clearTokens } from './tokenStore';

/** Mã lỗi đóng -- phải khớp tuyệt đối với backend/src/core/errors.js (10 giá trị). */
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

/*
 * Backend tam khoa tra cuu phap luat (LEGAL_LOOKUP_ENABLED=false) tra FORBIDDEN
 * kem details.reason = FEATURE_DISABLED -- khac voi loi phan quyen that, nen
 * man hinh hien thong bao "tam ngung" thay vi bao nham la mat ket noi mang.
 */
export function isFeatureDisabledError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    error.code === 'FORBIDDEN' &&
    (error.details as { reason?: string } | undefined)?.reason === 'FEATURE_DISABLED'
  );
}

type Envelope<T> = { ok: true; data: T; meta?: unknown } | { ok: false; error: { code: ErrorCode; message: string; details?: unknown } };

/*
 * IP LAN của máy dev đổi mỗi khi đổi mạng (wifi nhà, quán, hotspot...) -- gõ tay
 * vào .env sẽ vỡ ngay khi đổi môi trường. Khi chạy dev qua Expo Go/dev client,
 * Metro đã tự biết chính xác IP nó đang phục vụ (chính là IP hiện trong QR code
 * / hostUri) nên suy ra host API từ đó thay vì đọc .env, chỉ giữ cổng qua env.
 * Build production (không có Metro) thì bắt buộc phải khai EXPO_PUBLIC_API_URL.
 */
function getApiBaseUrl(): string {
  const explicitUrl = process.env.EXPO_PUBLIC_API_URL;
  if (explicitUrl) return explicitUrl.replace(/\/$/, '');
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  if (__DEV__ && hostUri) {
    const devHost = hostUri.split(':')[0];
    const apiPort = process.env.EXPO_PUBLIC_API_PORT || '3000';
    return `http://${devHost}:${apiPort}/api`;
  }

  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error('EXPO_PUBLIC_API_URL chưa được cấu hình trong mobile/.env');
  }
  return url.replace(/\/$/, '');
}

/**
 * Chỉ MỘT request refresh được phép chạy tại một thời điểm. Nếu nhiều request
 * cùng nhận 401 gần như đồng thời, tất cả xếp hàng chờ chung một promise refresh
 * thay vì mỗi request tự gọi /auth/refresh -- tránh đua nhau xoay vòng token
 * (mỗi lần xoay vòng làm token trước đó hết hiệu lực).
 */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const body = (await res.json()) as Envelope<{ accessToken: string; refreshToken?: string }>;

      if (!body.ok) {
        if (body.error.code !== 'UNAUTHORIZED' && body.error.code !== 'FORBIDDEN') {
          throw new ApiError(body.error.code, body.error.message, res.status);
        }
        await clearTokens();
        return null;
      }

      setAccessToken(body.data.accessToken);
      // Cửa sổ ân hạn: replay không cấp refreshToken mới, giữ nguyên token đang có.
      if (body.data.refreshToken) {
        await setRefreshToken(body.data.refreshToken);
      }
      return body.data.accessToken;
    } catch (error) {
      // Mất mạng/5xx khi refresh không được xóa phiên đã ghi nhớ.
      if (error instanceof ApiError) throw error;
      throw new ApiError('UPSTREAM_ERROR', 'Chưa thể khôi phục phiên. Vui lòng thử lại.', 0);
    }
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Endpoint auth công khai (register/login/...) -- không gắn Bearer, không tự refresh khi 401. */
  skipAuth?: boolean;
  /** Hủy yêu cầu sau ngần này ms (coi như lỗi mạng). Mặc định: không giới hạn phía app. */
  timeoutMs?: number;
};

/**
 * Fetch wrapper hiểu envelope {ok,data} / {ok:false,error}. Tự gắn Bearer, tự
 * unwrap `data`, ném ApiError mang `code` khi thất bại, và tự refresh một lần
 * khi gặp 401 rồi thử lại đúng một lần -- người dùng không thấy gì.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return (await apiRequestWithMeta<T>(path, options)).data;
}

// scope: chỉ có ở /places/search ("country" | "global").
export type PageMeta = { page: number; limit: number; total: number; scope?: string };

/** Như apiRequest nhưng giữ cả `meta` phân trang của envelope (danh sách có total). */
export async function apiRequestWithMeta<T>(
  path: string,
  options: RequestOptions = {},
  isRetry = false,
): Promise<{ data: T; meta?: PageMeta }> {
  const { method = 'GET', body, skipAuth = false, timeoutMs } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!skipAuth) {
    const accessToken = getAccessToken();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  }

  let res: Response;
  // Mất mạng có thể khiến fetch treo mãi chứ không báo lỗi; timeoutMs buộc nó thất bại để UI xử lý.
  const controller = timeoutMs ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    res = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller?.signal,
    });
  } catch {
    throw new ApiError('UPSTREAM_ERROR', 'Không thể kết nối tới máy chủ. Kiểm tra kết nối mạng.', 0);
  } finally {
    if (timer) clearTimeout(timer);
  }

  let envelope: Envelope<T>;
  try {
    envelope = await res.json();
  } catch {
    throw new ApiError('INTERNAL_ERROR', 'Máy chủ trả về dữ liệu không hợp lệ', res.status);
  }

  if (envelope.ok) {
    return { data: envelope.data, meta: envelope.meta as PageMeta | undefined };
  }

  const isExpiredAccessToken = envelope.error.code === 'UNAUTHORIZED' && !skipAuth;
  if (isExpiredAccessToken && !isRetry) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      return apiRequestWithMeta<T>(path, options, true);
    }
    await clearTokens();
  }

  throw new ApiError(envelope.error.code, envelope.error.message, res.status, envelope.error.details);
}
