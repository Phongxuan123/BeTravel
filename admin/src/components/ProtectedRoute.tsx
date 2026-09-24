import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/useAuth';
import { Layout } from './Layout';
import { LoadingState } from './ui/Feedback';

// Kiem role==='admin' MOI cho vao -- kiem lai o day dung o lop UI, RBAC that
// da nam o backend (requireRole) roi. Day chi la trai nghiem, khong phai bao ve.
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState label="Đang kiểm tra phiên đăng nhập..." />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}
