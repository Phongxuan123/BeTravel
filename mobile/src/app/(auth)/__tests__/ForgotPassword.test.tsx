import { router } from 'expo-router';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ForgotPasswordScreen from '../forgot-password';
import { requestPasswordReset, verifyPasswordResetOtp, resetPassword } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/http';

let mockUser: { name: string; email: string } | null = null;
beforeEach(() => {
  jest.clearAllMocks(); mockUser = null;
  (requestPasswordReset as jest.Mock).mockReset().mockResolvedValue({ sent: true });
  (verifyPasswordResetOtp as jest.Mock).mockReset().mockResolvedValue({ resetToken: 'one-use-token' });
  (resetPassword as jest.Mock).mockReset().mockResolvedValue({ reset: true });
});
const mockLogout = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true, replace: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ logout: mockLogout, user: mockUser }) }));
jest.mock('@/lib/api/auth', () => ({ requestPasswordReset: jest.fn(), verifyPasswordResetOtp: jest.fn(), resendPasswordResetOtp: jest.fn(), resetPassword: jest.fn() }));

// Lỗi SMTP phải giữ màn email; không chuyển sang màn nhập mã chưa gửi được.
test('lỗi SMTP giữ màn email, thử lại rồi xác thực và đặt mật khẩu mới', async () => {
  (requestPasswordReset as jest.Mock).mockRejectedValueOnce(new ApiError('UPSTREAM_ERROR', 'Email tạm lỗi', 502)).mockResolvedValue({ sent: true });
  (verifyPasswordResetOtp as jest.Mock).mockResolvedValue({ resetToken: 'one-use-token' });
  (resetPassword as jest.Mock).mockResolvedValue({ reset: true });
  const screen = await render(<ForgotPasswordScreen />);
  await fireEvent.changeText(screen.getByLabelText('Email'), ' USER@example.com ');
  await fireEvent.press(screen.getByText('Gửi mã OTP'));
  await waitFor(() => expect(screen.getByText('Email tạm lỗi')).toBeTruthy());
  expect(screen.queryByText('Nhập mã OTP')).toBeNull();
  await fireEvent.press(screen.getByText('Gửi mã OTP'));
  await waitFor(() => expect(screen.getByText('Nhập mã OTP')).toBeTruthy());
  expect(requestPasswordReset).toHaveBeenLastCalledWith('user@example.com');
  await fireEvent.changeText(screen.getByLabelText('OTP 6 chữ số'), '123456');
  await fireEvent.press(screen.getByText('Xác thực OTP'));
  await waitFor(() => expect(screen.getByText('Tạo mật khẩu mới')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu mới'), 'NewPassword123');
  await fireEvent.changeText(screen.getByLabelText('Xác nhận mật khẩu mới'), 'NewPassword123');
  await fireEvent.press(screen.getByText('Đặt lại mật khẩu'));
  await waitFor(() => expect(screen.getByText('Đã đặt lại mật khẩu')).toBeTruthy());
  expect(resetPassword).toHaveBeenCalledWith('one-use-token', 'NewPassword123');
  expect(mockLogout).toHaveBeenCalledTimes(1);
});


test('đã đăng nhập: giữ phiên khi quay lại, không có liên kết đăng nhập hoặc sửa email', async () => {
  mockUser = { name: 'User', email: 'signed@example.com' };
  const screen = await render(<ForgotPasswordScreen />);
  expect(screen.queryByText('Nhớ ra mật khẩu rồi?')).toBeNull();
  expect(screen.queryByText('Đăng nhập')).toBeNull();
  expect(screen.getByLabelText('Email').props.editable).toBe(false);
  expect(screen.getByText(/8–128 ký tự/)).toBeTruthy();
  await fireEvent.press(screen.getByText('Quay lại Cài đặt'));
  expect(router.replace).toHaveBeenCalledWith('/settings');
  expect(mockLogout).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Gửi mã OTP'));
  await waitFor(() => expect(screen.getByText('Nhập mã OTP')).toBeTruthy());
  expect(requestPasswordReset).toHaveBeenLastCalledWith('signed@example.com');
  expect(screen.queryByText('Sửa email')).toBeNull();
  expect(screen.queryByText('Nhớ ra mật khẩu rồi?')).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('OTP 6 chữ số'), '123456');
  await fireEvent.press(screen.getByText('Xác thực OTP'));
  await waitFor(() => expect(screen.getByText('Tạo mật khẩu mới')).toBeTruthy());
  expect(screen.getByText(/Ký tự đặc biệt không bắt buộc/)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Mật khẩu mới'), 'NewPassword123');
  await fireEvent.changeText(screen.getByLabelText('Xác nhận mật khẩu mới'), 'Mismatch123');
  expect(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }).props.accessibilityState.disabled).toBe(true);
  expect(mockLogout).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Xác nhận mật khẩu mới'), 'NewPassword123');
  (resetPassword as jest.Mock).mockRejectedValueOnce(new ApiError('VALIDATION_ERROR', 'Mật khẩu trùng mật khẩu cũ', 400));
  await fireEvent.press(screen.getByText('Đặt lại mật khẩu'));
  await waitFor(() => expect(screen.getByText('Mật khẩu trùng mật khẩu cũ')).toBeTruthy());
  expect(mockLogout).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Đặt lại mật khẩu'));
  await waitFor(() => expect(screen.getByText('Đã đặt lại mật khẩu')).toBeTruthy());
  expect(mockLogout).toHaveBeenCalledTimes(1);
});
