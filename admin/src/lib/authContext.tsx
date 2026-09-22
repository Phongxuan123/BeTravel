import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as authApi from './auth';
import type { AdminUser } from './auth';

type AuthContextValue = {
  user: AdminUser | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<AdminUser>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authApi
      .restoreSession()
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    login: async (identifier, password) => {
      const nextUser = await authApi.login(identifier, password);
      setUser(nextUser);
      return nextUser;
    },
    logout: async () => {
      await authApi.logout();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng trong AuthProvider');
  return ctx;
}
