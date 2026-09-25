import { apiRequest, ApiError } from './http';
import { setAccessToken, setRefreshToken, getRefreshToken, clearTokens } from './tokenStore';

export type ApiPreferences = {
  locale: string;
  alerts: { legal: boolean; safety: boolean; tripReminder: boolean };
  locationConsent: boolean;
};

export type ApiUser = {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  isActive: boolean;
  // Chi GET /auth/me tra field nay (register/login/refresh dung serializeUser
  // rieng, khong kem preferences) -- optional de dung chung 1 type ApiUser.
  preferences?: ApiPreferences;
  createdAt: string;
  updatedAt: string;
};

type Session = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  expiresIn?: string;
  user: ApiUser;
};

async function persistSession(session: Session, rememberMe: boolean): Promise<void> {
  setAccessToken(session.accessToken);

  if (!session.refreshToken) {
    throw new ApiError(
      'INTERNAL_ERROR',
      'Máy chủ không trả refresh token cho ứng dụng di động. Hãy kiểm tra AUTH_TRANSPORT của backend.',
      500,
    );
  }

  await setRefreshToken(session.refreshToken, rememberMe);
}

export async function register(input: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  termsAccepted: boolean;
}): Promise<{ user: ApiUser }> {
  return apiRequest('/auth/register', { method: 'POST', body: input, skipAuth: true });
}

export async function login(input: {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}): Promise<Session> {
  const rememberMe = input.rememberMe === true;

  const session = await apiRequest<Session>('/auth/login', {
    method: 'POST',
    body: { ...input, rememberMe },
    skipAuth: true,
  });

  await persistSession(session, rememberMe);
  return session;
}

let restoreInFlight: Promise<ApiUser | null> | null = null;

/**
 * Khôi phục phiên sau khi app mở lại.
 *
 * Chỉ token nằm trong SecureStore mới tồn tại qua restart, nên hàm này đồng nghĩa
 * với việc khôi phục một phiên đã chọn "Ghi nhớ đăng nhập".
 *
 * Lỗi mạng tạm thời KHÔNG được phép xóa refresh token. Nếu backend chưa chạy hoặc
 * BlueStacks vừa mất kết nối, AuthProvider sẽ giữ cached user và request sau có
 * thể tự refresh lại khi mạng hoạt động.
 */
export async function restoreSession(): Promise<ApiUser | null> {
  if (restoreInFlight) {
    return restoreInFlight;
  }

  restoreInFlight = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;

    try {
      const session = await apiRequest<Session>('/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
        skipAuth: true,
      });

      // Phiên có thể khôi phục được chỉ vì refresh token đã tồn tại từ SecureStore,
      // vì vậy token xoay vòng mới cũng phải tiếp tục được lưu persistent.
      setAccessToken(session.accessToken);
      if (session.refreshToken) {
        await setRefreshToken(session.refreshToken, true);
      }

      return session.user;
    } catch (error) {
      // Không biến một lỗi mạng tạm thời thành logout vĩnh viễn.
      if (!(error instanceof ApiError) || !['UNAUTHORIZED', 'FORBIDDEN'].includes(error.code)) {
        throw error;
      }

      // Token thực sự không hợp lệ/hết hạn/bị revoke -> xóa phiên local.
      await clearTokens();
      return null;
    }
  })();

  try {
    return await restoreInFlight;
  } finally {
    restoreInFlight = null;
  }
}

export async function logout(): Promise<void> {
  const refreshToken = await getRefreshToken();

  try {
    await apiRequest('/auth/logout', {
      method: 'POST',
      body: { refreshToken },
      skipAuth: true,
    });
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

export async function requestPasswordReset(email: string): Promise<{ sent: true }> {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email },
    skipAuth: true,
  });
}

export async function verifyPasswordResetOtp(email: string, otp: string): Promise<{ resetToken: string }> {
  return apiRequest('/auth/verify-reset-otp', {
    method: 'POST',
    body: { email, otp },
    skipAuth: true,
  });
}

export async function resendPasswordResetOtp(email: string): Promise<{ sent: true }> {
  return apiRequest('/auth/resend-reset-otp', {
    method: 'POST',
    body: { email },
    skipAuth: true,
  });
}

export async function resetPassword(resetToken: string, password: string): Promise<{ reset: true }> {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    body: { resetToken, password },
    skipAuth: true,
  });
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ changed: true }> {
  return apiRequest('/auth/change-password', {
    method: 'POST',
    body: input,
  });
}
