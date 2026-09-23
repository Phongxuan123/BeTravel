import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as authApi from './api/auth';
import { getJSON, setJSON, removeKey, StorageKeys } from './storage';

export type AuthUser = { name: string; email: string; phone?: string };

type AuthContextValue = {
  user: AuthUser | null;
  isGuest: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (name: string, email: string, password: string, phone: string) => Promise<void>;
  updateProfile: (patch: Partial<Pick<AuthUser, 'name' | 'phone'>>) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === 'true';

function toAuthUser(apiUser: authApi.ApiUser): AuthUser {
  return { name: apiUser.fullName, email: apiUser.email, phone: apiUser.phone || undefined };
}

function useMockAuthValue(
  user: AuthUser | null,
  setUser: (u: AuthUser | null) => void,
  isLoading: boolean,
): AuthContextValue {
  return useMemo<AuthContextValue>(
    () => ({
      user,
      isGuest: user === null,
      isLoading,
      login: async (identifier) => {
        const nextUser = identifier.includes('@')
          ? { name: identifier.split('@')[0] || 'Bạn', email: identifier }
          : { name: 'Bạn', email: 'mock@betravel.local', phone: identifier };
        await setJSON(StorageKeys.authUser, nextUser);
        setUser(nextUser);
      },
      register: async (name, email, _password, phone) => {
        const nextUser = { name, email, phone };
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

function useRealAuthValue(
  user: AuthUser | null,
  setUser: (u: AuthUser | null) => void,
  isLoading: boolean,
): AuthContextValue {
  return useMemo<AuthContextValue>(
    () => ({
      user,
      isGuest: user === null,
      isLoading,
      login: async (identifier, password, rememberMe = false) => {
        const session = await authApi.login({ identifier, password, rememberMe });
        const nextUser = toAuthUser(session.user);

        // authUser chỉ là cache để render nhanh/offline. Quyền khôi phục phiên thật
        // vẫn do refresh token trong SecureStore quyết định.
        await setJSON(StorageKeys.authUser, nextUser);
        setUser(nextUser);
      },
      register: async (name, email, password, phone) => {
        await authApi.register({
          fullName: name,
          email,
          phone,
          password,
          confirmPassword: password,
          termsAccepted: true,
        });

        // Sau đăng ký, app đang tự đăng nhập. Giữ hành vi hiện tại là nhớ phiên.
        const session = await authApi.login({ identifier: email, password, rememberMe: true });
        const nextUser = toAuthUser(session.user);
        await setJSON(StorageKeys.authUser, nextUser);
        setUser(nextUser);
      },
      updateProfile: async (patch) => {
        const { user: apiUser } = await authApi.updateProfile({
          fullName: patch.name,
          phone: patch.phone,
        });
        const nextUser = toAuthUser(apiUser);
        await setJSON(StorageKeys.authUser, nextUser);
        setUser(nextUser);
      },
      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Đăng xuất phía client vẫn phải hoàn tất khi server tạm mất kết nối.
        }
        await removeKey(StorageKeys.authUser);
        setUser(null);
      },
    }),
    [user, isLoading, setUser],
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (USE_MOCKS) {
      getJSON<AuthUser>(StorageKeys.authUser).then((saved) => {
        if (cancelled) return;
        setUser(saved);
        setIsLoading(false);
      });

      return () => {
        cancelled = true;
      };
    }

    (async () => {
      const cachedUser = await getJSON<AuthUser>(StorageKeys.authUser);

      if (!cancelled && cachedUser) {
        setUser(cachedUser);
      }

      try {
        const restoredUser = await authApi.restoreSession();

        if (cancelled) return;

        if (restoredUser) {
          const nextUser = toAuthUser(restoredUser);
          await setJSON(StorageKeys.authUser, nextUser);
          if (!cancelled) setUser(nextUser);
          return;
        }

        // Không có refresh token hoặc token đã hết hạn/revoke.
        if (cachedUser) {
          await removeKey(StorageKeys.authUser);
        }
        if (!cancelled) setUser(null);
      } catch (error) {
        // Lỗi mạng lúc app vừa mở không được biến thành logout. Nếu đây là phiên
        // remembered, cachedUser vẫn cho UI giữ trạng thái đăng nhập; request API
        // sau đó sẽ tự refresh khi backend/mạng hoạt động trở lại.
        if (__DEV__) {
          console.warn('[auth] Chưa thể khôi phục phiên vì lỗi kết nối', error);
        }

        if (!cancelled) {
          setUser(cachedUser ?? null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
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
