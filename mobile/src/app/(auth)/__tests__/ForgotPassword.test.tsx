import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ForgotPasswordScreen from '../forgot-password';
import { requestPasswordReset, verifyPasswordResetOtp, resetPassword } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/http';

const mockLogout = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ logout: mockLogout }) }));
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
