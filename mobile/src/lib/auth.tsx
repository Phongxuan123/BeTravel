import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authApi from './api/auth';
import { ApiError } from './api/http';
import { getJSON, setJSON, removeKey, StorageKeys } from './storage';

export type AuthUser = { name: string; email: string; phone?: string };

type AuthContextValue = {
  user: AuthUser | null;
  isGuest: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithPhone: (phone: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  updateProfile: (patch: Partial<Pick<AuthUser, 'name'>>) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// EXPO_PUBLIC_USE_MOCKS=true là đường lùi khi demo lỗi hoặc backend chưa sẵn sàng
// (xem CLAUDE.md Phần 9) -- toàn bộ app, kể cả auth, phải chạy được không cần backend.
const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === 'true';

// Ánh xạ hình dạng user của backend (id, username, fullName, email, phone, role, ...)
// về đúng shape gọn mà 18 màn hình mobile đang dùng (name, email, phone?) -- không sửa màn hình.
function toAuthUser(apiUser: authApi.ApiUser): AuthUser {
  return { name: apiUser.fullName, email: apiUser.email, phone: apiUser.phone || undefined };
}

function useMockAuthValue(user: AuthUser | null, setUser: (u: AuthUser | null) => void, isLoading: boolean): AuthContextValue {
  return useMemo<AuthContextValue>(
    () => ({
      user,
      isGuest: user === null,
      isLoading,
      login: async (email) => {
        const nextUser = { name: email.split('@')[0] || 'Bạn', email };
        await setJSON(StorageKeys.authUser, nextUser);
        setUser(nextUser);
      },
      loginWithPhone: async (phone) => {
        const nextUser = { name: 'Bạn', email: `${phone}@phone.betravel`, phone };
        await setJSON(StorageKeys.authUser, nextUser);
        setUser(nextUser);
      },
      register: async (name, email) => {
        const nextUser = { name, email };
        await setJSON(StorageKeys.authUser, nextUser);
        setUser(nextUser);
      },
      updateProfile: async (patch) => {
        if (!user) return;
        const nextUser = { ...user, ...patch };
        await setJSON(StorageKeys.authUser, nextUser);
        setUser(nextUser);
      },
      logout: async () => {
        await removeKey(StorageKeys.authUser);
        setUser(null);
      },
    }),
    [user, isLoading, setUser],
  );
}

function useRealAuthValue(user: AuthUser | null, setUser: (u: AuthUser | null) => void, isLoading: boolean): AuthContextValue {
  return useMemo<AuthContextValue>(
    () => ({
      user,
      isGuest: user === null,
      isLoading,
      login: async (email, password) => {
        const session = await authApi.login({ identifier: email, password, rememberMe: true });
        const nextUser = toAuthUser(session.user);
        await setJSON(StorageKeys.authUser, nextUser);
        setUser(nextUser);
      },
      loginWithPhone: async () => {
        // Backend chưa hỗ trợ đăng nhập OTP qua SMS (cần dịch vụ SMS ngoài, nằm
        // ngoài phạm vi MVP -- xem CLAUDE.md Phần 4.4). Giữ nguyên màn hình,
        // báo lỗi rõ ràng thay vì âm thầm tạo phiên giả.
        throw new ApiError(
          'VALIDATION_ERROR',
          'Đăng nhập bằng số điện thoại đang được phát triển. Vui lòng dùng email.',
          0,
        );
      },
      register: async (name, email, password) => {
        // Màn hình đăng ký hiện chỉ thu thập name/email/password; confirmPassword
        // và termsAccepted đã được UI tự kiểm (nút Đăng ký chỉ bật khi khớp và đã
        // đồng ý điều khoản) nên gửi lại đúng giá trị đó lên backend là hợp lệ,
        // không phải dữ liệu bịa.
        await authApi.register({
          fullName: name,
          email,
          password,
          confirmPassword: password,
          termsAccepted: true,
        });
        const session = await authApi.login({ identifier: email, password, rememberMe: true });
        const nextUser = toAuthUser(session.user);
        await setJSON(StorageKeys.authUser, nextUser);
        setUser(nextUser);
      },
      updateProfile: async (patch) => {
        const { user: apiUser } = await authApi.updateProfile({ fullName: patch.name });
        const nextUser = toAuthUser(apiUser);
        await setJSON(StorageKeys.authUser, nextUser);
        setUser(nextUser);
      },
      logout: async () => {
        await authApi.logout();
        await removeKey(StorageKeys.authUser);
        setUser(null);
      },
    }),
    [user, isLoading, setUser],
  );
}

/*
 * Auth NỐI API THẬT khi EXPO_PUBLIC_USE_MOCKS=false (thay cho auth giả lập
 * trước đây chỉ ghi AsyncStorage). Chữ ký AuthContextValue giữ NGUYÊN để 18
 * màn hình đã dựng không phải sửa gì.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (USE_MOCKS) {
      getJSON<AuthUser>(StorageKeys.authUser).then((saved) => {
        setUser(saved);
        setIsLoading(false);
      });
      return;
    }

    // Khôi phục phiên khi mở app: đọc refresh token từ secure-store, đổi lấy
    // access token mới. Cache bản sao AuthUser trong AsyncStorage chỉ để hiển
    // thị ngay (tránh chớp màn hình rỗng) trong lúc chờ mạng.
    (async () => {
      const cachedUser = await getJSON<AuthUser>(StorageKeys.authUser);
      if (cachedUser) setUser(cachedUser);

      const restoredUser = await authApi.restoreSession();
      if (restoredUser) {
        const nextUser = toAuthUser(restoredUser);
        await setJSON(StorageKeys.authUser, nextUser);
        setUser(nextUser);
      } else if (cachedUser) {
        // Refresh token không còn hiệu lực -- xoá phiên đã cache để tránh trạng thái sai lệch.
        await removeKey(StorageKeys.authUser);
        setUser(null);
      }

      setIsLoading(false);
    })();
  }, []);

  const mockValue = useMockAuthValue(user, setUser, isLoading);
  const realValue = useRealAuthValue(user, setUser, isLoading);
  const value = USE_MOCKS ? mockValue : realValue;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng trong AuthProvider');
  return ctx;
}
