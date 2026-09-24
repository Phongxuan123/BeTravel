import { useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext, type AuthContextValue } from './authState';
import * as authApi from './auth';
import type { AdminUser } from './auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
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
      queryClient.clear();
      setUser(nextUser);
      return nextUser;
    },
    logout: async () => {
      try { await authApi.logout(); }
      finally { queryClient.clear(); setUser(null); }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
