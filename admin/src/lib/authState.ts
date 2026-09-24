import { createContext } from 'react';
import type { AdminUser } from './auth';

export type AuthContextValue = {
  user: AdminUser | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<AdminUser>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
