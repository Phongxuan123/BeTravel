import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Mail, Phone, Lock, Eye, EyeOff, Check, ArrowRight } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { AuthHeader } from '@/components/common/AuthHeader';
import { TextField } from '@/components/ui/TextField';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { Checkbox } from '@/components/ui/Checkbox';
import { colors } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api/http';
import { isPasswordValid, passwordValidationMessage } from '@/lib/password';

// Van ban Dieu khoan / Chinh sach bao mat CHUA co (can nguoi chiu trach nhiem phap ly cung cap, xem
// docs/USER_INPUT_FORM.md muc E1). Khong tu soan van ban phap ly -- mo man chan noi ro dang hoan thien.
const openPendingLegalText = (title: string) =>
  router.push({
    pathname: '/coming-soon',
    params: {
      title,
      detail:
        'Văn bản này đang được hoàn thiện và sẽ được công bố trước khi ứng dụng phát hành chính thức.',
    },
  } as never);

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cùng định dạng với backend (auth.validator.js): 0xxxxxxxxx hoặc +84xxxxxxxxx.
  const isValidPhone = /^(0|\+84)[0-9]{9}$/.test(phone.trim().replace(/[\s.-]/g, ''));

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit =
    name.trim().length >= 2 &&
    isValidEmail &&
    isValidPhone &&
    isPasswordValid(password) &&
    confirm === password &&
    agree;

  const onSubmit = async () => {
    if (!canSubmit) {
      setError(
        passwordValidationMessage(password) ??
          'Vui lòng điền đầy đủ thông tin hợp lệ và đồng ý điều khoản.',
      );
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register(name, email, password, phone.trim());
      router.replace('/trips/new?step=1');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Không thể tạo tài khoản. Kiểm tra kết nối mạng và thử lại.',
      );
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
      <AuthHeader />

      <Text className="mt-8 font-display text-ink" style={{ fontSize: 30, lineHeight: 36 }}>
        Tạo tài khoản Be.Travel
      </Text>
      <Text className="mt-2 text-[15px] text-muted">Đồng hành pháp lý và bảo vệ an toàn cho công dân Việt Nam trên mọi hành trình quốc tế.</Text>

      <View className="mt-6" style={{ gap: 16 }}>
        <TextField label="Họ và tên (Full name)" value={name} onChangeText={setName} iconLeft={<User size={20} color={colors.subtle} />} />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          iconLeft={<Mail size={20} color={colors.subtle} />}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextField
          label="Số điện thoại"
          value={phone}
          onChangeText={setPhone}
          iconLeft={<Phone size={20} color={colors.subtle} />}
          keyboardType="phone-pad"
          helperText="Dạng 0xxxxxxxxx hoặc +84xxxxxxxxx"
        />
        <View>
          <TextField
            label="Mật khẩu (Password)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            iconLeft={<Lock size={20} color={colors.subtle} />}
            helperText="Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số"
            slotRight={
              <Pressable accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onPress={() => setShowPassword((v) => !v)}>
                {showPassword ? <EyeOff size={20} color={colors.primary} /> : <Eye size={20} color={colors.primary} />}
              </Pressable>
            }
          />
          <PasswordStrength password={password} />
        </View>
        <TextField
          label="Xác nhận mật khẩu (Confirm password)"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry={!showPassword}
          iconLeft={<Lock size={20} color={colors.subtle} />}
          slotRight={confirm && confirm === password ? <Check size={20} color={colors.success} /> : undefined}
        />

        <Pressable className="flex-row items-start" style={{ gap: 10 }} onPress={() => setAgree((v) => !v)}>
          <Checkbox checked={agree} onChange={setAgree} accessibilityLabel="Đồng ý điều khoản" />
          <Text className="flex-1 text-sm leading-5 text-[#334E68]">
            Tôi đồng ý với <Text className="font-body-bold text-primary-strong" onPress={() => openPendingLegalText('Điều khoản sử dụng')}>
              Điều khoản sử dụng
            </Text>{' '}
            và{' '}
            <Text className="font-body-bold text-primary-strong" onPress={() => openPendingLegalText('Chính sách bảo vệ dữ liệu')}>
              Chính sách bảo vệ dữ liệu
            </Text>
            .
          </Text>
        </Pressable>

        {error && (
          <View className="rounded-md bg-danger-tint p-3">
            <Text className="text-sm text-danger-strong">{error}</Text>
          </View>
        )}

        <Button
          label="Đăng ký tài khoản"
          onPress={onSubmit}
          loading={loading}
          disabled={!canSubmit}
          iconRight={<ArrowRight size={18} color="#fff" />}
        />
      </View>

      <View className="mt-8 flex-row items-center justify-center" style={{ gap: 4 }}>
        <Text className="text-muted">Đã có tài khoản Be.Travel?</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/login')}>
          <Text className="font-body-bold text-primary-strong">Đăng nhập</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
