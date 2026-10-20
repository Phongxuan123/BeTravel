import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Mail, MailCheck, KeyRound, Lock } from 'lucide-react-native';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { colors } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api/http';
import {
  requestPasswordReset,
  verifyPasswordResetOtp,
  resendPasswordResetOtp,
  resetPassword,
} from '@/lib/api/auth';
import { isPasswordValid, passwordValidationMessage, PASSWORD_REQUIREMENTS } from '@/lib/password';

type Step = 'email' | 'otp' | 'password' | 'done';
const RESEND_WAIT_SECONDS = 30;

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { logout, user } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(user?.email ?? '');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [resendWait, setResendWait] = useState(0);
  // Chặn bấm gửi liên tục làm vô hiệu mã vừa nhận; backend vẫn có rate limit riêng.
  useEffect(() => {
    if (resendWait <= 0) return;
    const timer = setTimeout(() => setResendWait((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendWait]);

  const normalizedEmail = (user?.email ?? email).trim().toLowerCase();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

  const sendOtp = async () => {
    if (!isValidEmail) {
      setError('Nhập email hợp lệ.');
      return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await requestPasswordReset(normalizedEmail);
      setStep('otp');
      setResendWait(RESEND_WAIT_SECONDS);
      setMessage('Nếu email đã được đăng ký, bạn sẽ nhận mã OTP 6 số, hiệu lực 5 phút. Kiểm tra cả Spam/Thư rác; phản hồi này không xác nhận thư đã tới hộp thư.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể gửi mã khôi phục. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('OTP phải gồm đúng 6 chữ số.');
      return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const result = await verifyPasswordResetOtp(normalizedEmail, otp.trim());
      setResetToken(result.resetToken);
      setStep('password');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể xác thực OTP. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (loading || resendWait > 0) return;
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await resendPasswordResetOtp(normalizedEmail);
      setOtp('');
      setResendWait(RESEND_WAIT_SECONDS);
      setMessage('Đã tiếp nhận yêu cầu gửi lại. Nếu email hợp lệ, hãy dùng mã trong thư mới nhất.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể gửi lại OTP. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async () => {
    const passwordError = passwordValidationMessage(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirm) {
      setError('Xác nhận mật khẩu không khớp.');
      return;
    }
    if (!resetToken) {
      setError('Phiên đặt lại mật khẩu không hợp lệ. Vui lòng thực hiện lại.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await resetPassword(resetToken, password);
      await logout();
      setResetToken(''); setPassword(''); setConfirm('');
      setStep('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <IconButton accessibilityLabel="Quay lại" disabled={loading} variant="soft" icon={<ChevronLeft size={20} color={colors.ink} />} onPress={() => {
        if (step === 'done') router.replace('/login');
        else if (router.canGoBack()) router.back();
        else router.replace(user ? '/settings' : '/login');
      }} />

      {step === 'email' && (
        <>
          <Text className="mt-6 font-display text-ink" style={{ fontSize: 30, lineHeight: 36 }}>
            {user ? 'Đổi mật khẩu qua email' : 'Quên mật khẩu?'}
          </Text>
          <Text className="mt-2 text-[15px] text-muted">{user ? 'Xác thực bằng email của tài khoản đang đăng nhập. Phiên hiện tại được giữ cho đến khi đổi mật khẩu thành công.' : 'Nhập email đã đăng ký, chúng tôi sẽ gửi mã OTP để xác thực.'}</Text>
          <Text className="mt-2 text-sm text-muted">Mật khẩu mới: {PASSWORD_REQUIREMENTS} Phải khác mật khẩu hiện tại và nhập xác nhận trùng khớp.</Text>

          <View className="mt-6" style={{ gap: 16 }}>
            <TextField
              label="Email"
              value={user?.email ?? email}
              editable={!user && !loading}
              onChangeText={setEmail}
              iconLeft={<Mail size={20} color={colors.subtle} />}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {error && (
              <View className="rounded-md bg-danger-tint p-3">
                <Text className="text-sm text-danger">{error}</Text>
              </View>
            )}
            <Button label="Gửi mã OTP" onPress={sendOtp} loading={loading} />
          </View>
        </>
      )}

      {step === 'otp' && (
        <>
          <Text className="mt-6 font-display text-ink" style={{ fontSize: 30, lineHeight: 36 }}>
            Nhập mã OTP
          </Text>
          <Text className="mt-2 text-[15px] text-muted">Kiểm tra hộp thư {normalizedEmail}, gồm cả Spam/Thư rác.</Text>

          <View className="mt-6" style={{ gap: 16 }}>
            <TextField
              label="OTP 6 chữ số"
              value={otp}
              onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              iconLeft={<KeyRound size={20} color={colors.subtle} />}
            />
            {message && (
              <View className="rounded-md bg-primary-soft p-3">
                <Text className="text-sm text-primary-strong">{message}</Text>
              </View>
            )}
            {error && (
              <View className="rounded-md bg-danger-tint p-3">
                <Text className="text-sm text-danger">{error}</Text>
              </View>
            )}
            <Button label="Xác thực OTP" onPress={verifyOtp} loading={loading} disabled={otp.length !== 6} />
            <Button label={resendWait > 0 ? `Gửi lại OTP sau ${resendWait}s` : 'Gửi lại OTP'} variant="secondary" onPress={resendOtp} disabled={loading || resendWait > 0} />
            {!user && <Button label="Sửa email" variant="secondary" disabled={loading} onPress={() => {
              setStep('email'); setOtp(''); setResetToken(''); setError(null); setMessage(null);
            }} />}
          </View>
        </>
      )}

      {step === 'password' && (
        <>
          <Text className="mt-6 font-display text-ink" style={{ fontSize: 30, lineHeight: 36 }}>
            Tạo mật khẩu mới
          </Text>
          <Text className="mt-2 text-[15px] text-muted">Mật khẩu mới phải khác mật khẩu hiện tại.</Text>

          <View className="mt-6" style={{ gap: 16 }}>
            <View>
              <TextField
                label="Mật khẩu mới"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                iconLeft={<Lock size={20} color={colors.subtle} />}
                helperText={PASSWORD_REQUIREMENTS}
              />
              <PasswordStrength password={password} />
            </View>
            <TextField
              label="Xác nhận mật khẩu mới"
              value={confirm}
              error={confirm && password !== confirm ? 'Xác nhận mật khẩu không khớp.' : undefined}
              onChangeText={setConfirm}
              secureTextEntry
              iconLeft={<Lock size={20} color={colors.subtle} />}
            />
            {error && (
              <View className="rounded-md bg-danger-tint p-3">
                <Text className="text-sm text-danger">{error}</Text>
              </View>
            )}
            <Button
              label="Đặt lại mật khẩu"
              onPress={submitNewPassword}
              loading={loading}
              disabled={!isPasswordValid(password) || password !== confirm}
            />
          </View>
        </>
      )}

      {step !== 'done' && user && <Button label="Quay lại Cài đặt" variant="secondary" disabled={loading} onPress={() => router.replace('/settings')} />}

      {step === 'done' && (
        <View className="mt-10 items-center px-2">
          <View className="h-[100px] w-[100px] items-center justify-center rounded-full bg-primary-soft">
            <MailCheck size={44} color={colors.primary} />
          </View>
          <Text className="mt-5 text-center font-display text-ink" style={{ fontSize: 22 }}>
            Đã đặt lại mật khẩu
          </Text>
          <Text className="mt-2 text-center text-[15px] text-muted">Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.</Text>
          <View className="mt-6 w-full">
            <Button label="Về đăng nhập" onPress={() => router.replace(`/login?email=${encodeURIComponent(normalizedEmail)}` as never)} />
          </View>
        </View>
      )}

      {step !== 'done' && !user && (
        <View className="mt-8 flex-row items-center justify-center" style={{ gap: 4 }}>
          <Text className="text-muted">Nhớ ra mật khẩu rồi?</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace('/login')}>
            <Text className="font-body-bold text-primary">Đăng nhập</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
