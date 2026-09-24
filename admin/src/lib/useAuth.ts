import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from './authState';

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng trong AuthProvider');
  return ctx;
}
