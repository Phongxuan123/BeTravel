import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getJSON, setJSON, removeKey, StorageKeys } from './storage';

export type AuthUser = { name: string; email: string; phone?: string };

type AuthContextValue = {
  user: AuthUser | null;
  isGuest: boolean;
  isLoading: boolean;
  login: (email: string, _password: string) => Promise<void>;
  loginWithPhone: (phone: string) => Promise<void>;
  register: (name: string, email: string, _password: string) => Promise<void>;
  updateProfile: (patch: Partial<Pick<AuthUser, 'name'>>) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Auth giả lập cho track UI — không gọi API thật, chỉ lưu người dùng vào AsyncStorage.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getJSON<AuthUser>(StorageKeys.authUser).then((saved) => {
      setUser(saved);
      setIsLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isGuest: user === null,
      isLoading,
      login: async (email) => {
        const nextUser = { name: email.split('@')[0] ?? 'Bạn', email };
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
        setUser((prev) => {
          if (!prev) return prev;
          const next = { ...prev, ...patch };
          setJSON(StorageKeys.authUser, next);
          return next;
        });
      },
      logout: async () => {
        await removeKey(StorageKeys.authUser);
        setUser(null);
      },
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng trong AuthProvider');
  return ctx;
}
