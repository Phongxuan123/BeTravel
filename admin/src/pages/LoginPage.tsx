import { useState } from 'react';
import { Plane } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/useAuth';
import { ApiError } from '../lib/apiClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { ErrorState } from '../components/ui/Feedback';

export default function LoginPage() {
  const { user, isLoading, login, logout } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && user?.role === 'admin') {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const loggedInUser = await login(identifier, password);

      // Backend khong co endpoint "dang nhap rieng cho admin" -- bat ky tai
      // khoan hop le nao cung dang nhap duoc, nhung chi role admin moi vao
      // duoc dashboard. Kiem o day la trai nghiem; RBAC that nam o backend.
      if (loggedInUser.role !== 'admin') {
        await logout();
        setError('Tài khoản này không có quyền quản trị.');
        return;
      }

      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đăng nhập thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-dark via-brand to-sky-500 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
            <Plane size={20} />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-ink">Be.Travel Admin</h1>
            <p className="text-xs text-muted">Đăng nhập bằng tài khoản có quyền quản trị.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Input
            label="Email hoặc username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            required
          />
          <Input
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && <ErrorState message={error} />}

          <Button type="submit" loading={submitting} className="mt-1 w-full">
            Đăng nhập
          </Button>
        </div>
      </form>
    </div>
  );
}
