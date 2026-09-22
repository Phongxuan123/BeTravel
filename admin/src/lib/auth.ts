import { apiRequest } from './apiClient';
import { setAccessToken, setRefreshToken, getRefreshToken, clearTokens } from './tokenStore';

export type AdminUser = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'user' | 'admin';
  isActive: boolean;
};

type Session = { accessToken: string; refreshToken?: string; user: AdminUser };

async function persistSession(session: Session): Promise<void> {
  setAccessToken(session.accessToken);
  if (session.refreshToken) setRefreshToken(session.refreshToken);
}

export async function login(identifier: string, password: string): Promise<AdminUser> {
  const { data } = await apiRequest<Session>('/auth/login', {
    method: 'POST',
    body: { identifier, password, rememberMe: true },
    skipAuth: true,
  });
  await persistSession(data);
  return data.user;
}

/** Khoi phuc phien khi mo lai trang admin (F5). */
export async function restoreSession(): Promise<AdminUser | null> {
  try {
    const { data } = await apiRequest<Session>('/auth/refresh', {
      method: 'POST',
      body: getRefreshToken() ? { refreshToken: getRefreshToken() } : {},
      skipAuth: true,
    });
    await persistSession(data);
    return data.user;
  } catch {
    clearTokens();
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/auth/logout', {
      method: 'POST',
      body: getRefreshToken() ? { refreshToken: getRefreshToken() } : {},
      skipAuth: true,
    });
  } finally {
    clearTokens();
  }
}

export async function me(): Promise<AdminUser> {
  const { data } = await apiRequest<{ user: AdminUser }>('/auth/me');
  return data.user;
}
