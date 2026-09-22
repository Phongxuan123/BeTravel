import { apiRequest } from './http';
import { setAccessToken, setRefreshToken, getRefreshToken, clearTokens } from './tokenStore';

export type ApiUser = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type Session = { accessToken: string; refreshToken?: string; user: ApiUser };

// Lưu accessToken vào memory + refreshToken (nếu server trả, tuỳ AUTH_TRANSPORT) vào secure-store.
async function persistSession(session: Session): Promise<void> {
  setAccessToken(session.accessToken);
  if (session.refreshToken) {
    await setRefreshToken(session.refreshToken);
  }
}

export async function register(input: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  termsAccepted: boolean;
}): Promise<{ user: ApiUser }> {
  return apiRequest('/auth/register', { method: 'POST', body: input, skipAuth: true });
}

export async function login(input: {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}): Promise<Session> {
  const session = await apiRequest<Session>('/auth/login', {
    method: 'POST',
    body: input,
    skipAuth: true,
  });
  await persistSession(session);
  return session;
}

/** Khôi phục phiên khi mở app: đọc refresh token từ secure-store rồi đổi lấy access token mới. */
export async function restoreSession(): Promise<ApiUser | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const session = await apiRequest<Session>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      skipAuth: true,
    });
    await persistSession(session);
    return session.user;
  } catch {
    await clearTokens();
    return null;
  }
}

export async function logout(): Promise<void> {
  const refreshToken = await getRefreshToken();
  try {
    await apiRequest('/auth/logout', { method: 'POST', body: { refreshToken }, skipAuth: true });
  } finally {
    await clearTokens();
  }
}

export async function me(): Promise<{ user: ApiUser }> {
  return apiRequest('/auth/me', { method: 'GET' });
}

export async function updateProfile(patch: { fullName?: string; phone?: string }): Promise<{ user: ApiUser }> {
  return apiRequest('/auth/me', { method: 'PATCH', body: patch });
}
