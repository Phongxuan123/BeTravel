import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Phone, Lock, Eye, EyeOff, Mail } from 'lucide-react-native';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Checkbox } from '@/components/ui/Checkbox';
import { colors } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api/http';

const normalizePhone = (value: string) => value.trim().replace(/[\s.-]/g, '');
const isValidVietnamPhone = (value: string) => /^(0|\+84)[0-9]{9}$/.test(normalizePhone(value));

export default function LoginPhoneScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ next?: string }>();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!isValidVietnamPhone(phone)) {
      setError('Số điện thoại không hợp lệ. Dùng dạng 0xxxxxxxxx hoặc +84xxxxxxxxx.');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(normalizePhone(phone), password, remember);
      router.replace(params.next && params.next.startsWith('/') ? (params.next as never) : '/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể đăng nhập. Kiểm tra kết nối mạng và thử lại.');
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
      <IconButton
        accessibilityLabel="Quay lại"
        variant="soft"
        icon={<ChevronLeft size={20} color={colors.ink} />}
        onPress={() => router.back()}
      />

      <Text className="mt-6 font-display text-ink" style={{ fontSize: 30, lineHeight: 36 }}>
        Đăng nhập bằng số điện thoại
      </Text>
      <Text className="mt-2 text-[15px] text-muted">Dùng số điện thoại đã đăng ký và mật khẩu tài khoản của bạn.</Text>

      <View className="mt-6" style={{ gap: 16 }}>
        <TextField
          label="Số điện thoại"
          value={phone}
          onChangeText={setPhone}
          placeholder="0901234567"
          keyboardType="phone-pad"
          iconLeft={<Phone size={20} color={colors.subtle} />}
          helperText="Dạng 0xxxxxxxxx hoặc +84xxxxxxxxx"
        />

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

        <Pressable className="flex-row items-center" style={{ gap: 8 }} onPress={() => setRemember((v) => !v)}>
          <Checkbox checked={remember} onChange={setRemember} accessibilityLabel="Ghi nhớ đăng nhập" />
          <Text className="text-[15px] text-[#3B4A63]">Ghi nhớ đăng nhập</Text>
        </Pressable>

        {error && (
          <View className="rounded-md bg-danger-tint p-3">
            <Text className="text-sm text-danger">{error}</Text>
          </View>
        )}

        <Button label="Đăng nhập" onPress={onSubmit} loading={loading} />
        <Button
          label="Đăng nhập bằng email"
          variant="secondary"
          iconLeft={<Mail size={18} color={colors.primary} />}
          onPress={() => router.replace('/login')}
        />
      </View>
    </ScrollView>
  );
}
