import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Mail, Phone, Lock, Eye, EyeOff, Check, ChevronLeft } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { TextField } from '@/components/ui/TextField';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { Checkbox } from '@/components/ui/Checkbox';
import { colors } from '@/lib/theme';
import { useAuth } from '@/lib/auth';

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

  const canSubmit =
    name.trim().length > 0 && email.includes('@') && isValidPhone && password.length >= 8 && confirm === password && agree;

  const onSubmit = async () => {
    if (!canSubmit) {
      setError('Vui lòng điền đầy đủ thông tin hợp lệ và đồng ý điều khoản.');
      return;
    }
    setError(null);
    setLoading(true);
    await register(name, email, password, phone.trim());
    setLoading(false);
    router.replace('/trips/new?step=1');
  };

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <IconButton
        accessibilityLabel="Quay lại"
        icon={<ChevronLeft size={20} color={colors.ink} />}
        variant="soft"
        onPress={() => router.back()}
      />

      <Text className="mt-6 font-display text-ink" style={{ fontSize: 30, lineHeight: 36 }}>
        Tạo tài khoản
      </Text>
      <Text className="mt-2 text-[15px] text-muted">Chỉ mất một phút — sau đó bạn có thể tạo chuyến đi.</Text>

      <View className="mt-6" style={{ gap: 16 }}>
        <TextField label="Họ và tên" value={name} onChangeText={setName} iconLeft={<User size={20} color={colors.subtle} />} />
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
            label="Mật khẩu"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            iconLeft={<Lock size={20} color={colors.subtle} />}
            slotRight={
              <Pressable accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onPress={() => setShowPassword((v) => !v)}>
                {showPassword ? <EyeOff size={20} color={colors.primary} /> : <Eye size={20} color={colors.primary} />}
              </Pressable>
            }
          />
          <PasswordStrength password={password} />
        </View>
        <TextField
          label="Xác nhận mật khẩu"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry={!showPassword}
          iconLeft={<Lock size={20} color={colors.subtle} />}
          slotRight={confirm && confirm === password ? <Check size={20} color={colors.success} /> : undefined}
        />

        <Pressable className="flex-row items-start" style={{ gap: 10 }} onPress={() => setAgree((v) => !v)}>
          <Checkbox checked={agree} onChange={setAgree} accessibilityLabel="Đồng ý điều khoản" />
          <Text className="flex-1 text-sm leading-5 text-[#3B4A63]">
            Tôi đồng ý với <Text className="font-body-bold text-primary">Điều khoản</Text> và{' '}
            <Text className="font-body-bold text-primary">Chính sách bảo mật</Text>.
          </Text>
        </Pressable>

        {error && (
          <View className="rounded-md bg-danger-tint p-3">
            <Text className="text-sm text-danger">{error}</Text>
          </View>
        )}

        <Button label="Tạo tài khoản" onPress={onSubmit} loading={loading} disabled={!canSubmit} />
      </View>

      <View className="mt-8 flex-row items-center justify-center" style={{ gap: 4 }}>
        <Text className="text-muted">Đã có tài khoản?</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/login')}>
          <Text className="font-body-bold text-primary">Đăng nhập</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
