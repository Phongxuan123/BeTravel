import { useEffect, useRef, useState, type ReactNode } from 'react';
import { router, usePathname } from 'expo-router';
import { getJSON, StorageKeys } from '@/lib/storage';
import { useAuth } from '@/lib/auth';

// Các route công khai — không yêu cầu đăng nhập.
const PUBLIC_ROUTES = ['/welcome', '/login', '/register', '/login-phone', '/forgot-password', '/_dev/design-system'];

// Cổng chặn 2 lớp, chạy lại mỗi khi đổi route hoặc trạng thái đăng nhập thay đổi:
// 1) Chưa xem onboarding → /welcome (spec Q20).
// 2) Đã xem onboarding nhưng CHƯA đăng nhập và route hiện tại không nằm trong danh sách
//    công khai → /login. Theo yêu cầu: bắt buộc đăng nhập/đăng ký trước khi vào trang chủ,
//    không còn chế độ khách xem rút gọn như mặc định spec Q21.
export function AppGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isGuest, isLoading: authLoading } = useAuth();
  const [ready, setReady] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    if (authLoading) return;

    getJSON<number>(StorageKeys.onboarded).then((onboarded) => {
      if (cancelledRef.current) return;
      if (!onboarded) {
        if (pathname !== '/welcome') router.replace('/welcome');
      } else if (isGuest && !PUBLIC_ROUTES.includes(pathname)) {
        router.replace('/login');
      }
      setReady(true);
    });

    return () => {
      cancelledRef.current = true;
    };
  }, [pathname, isGuest, authLoading]);

  if (!ready || authLoading) return null;
  return <>{children}</>;
}
