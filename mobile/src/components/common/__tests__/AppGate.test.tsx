import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { router, usePathname } from 'expo-router';
import { AppGate } from '../AppGate';
import { getJSON } from '@/lib/storage';
import { useAuth } from '@/lib/auth';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() }, usePathname: jest.fn() }));
jest.mock('@/lib/storage', () => ({ getJSON: jest.fn(), StorageKeys: { onboarded: 'onboarded' } }));
jest.mock('@/lib/auth', () => ({ useAuth: jest.fn() }));

function renderGate(pathname: string, { onboarded }: { onboarded: boolean }) {
  (usePathname as jest.Mock).mockReturnValue(pathname);
  (getJSON as jest.Mock).mockResolvedValue(onboarded ? 1 : null);
  (useAuth as jest.Mock).mockReturnValue({ isGuest: true, isLoading: false });
  return render(<AppGate><Text>noi dung</Text></AppGate>);
}

beforeEach(() => jest.clearAllMocks());

// Quyết định 08/10/2026: người chưa có tài khoản / đang mất mạng vẫn phải gọi được số khẩn cấp.
test.each(['/sos', '/sos/share-location'])('khách vào %s không bị chuyển hướng, kể cả chưa xem onboarding', async (pathname) => {
  const screen = await renderGate(pathname, { onboarded: false });
  await waitFor(() => expect(screen.getByText('noi dung')).toBeTruthy());
  expect(router.replace).not.toHaveBeenCalled();
});

test('khách vào màn cần đăng nhập vẫn bị đưa về /login', async () => {
  await renderGate('/sos/map', { onboarded: true });
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
});
