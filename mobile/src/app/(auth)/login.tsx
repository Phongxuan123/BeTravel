import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, Phone } from 'lucide-react-native';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { Checkbox } from '@/components/ui/Checkbox';
import { colors } from '@/lib/theme';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const params = useLocalSearchParams<{ next?: string }>();
  const [email, setEmail] = useState('minh.tran@email.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!email.includes('@') || password.length < 8) {
      setError('Email hoặc mật khẩu không hợp lệ. Mật khẩu tối thiểu 8 ký tự.');
      return;
    }
    setError(null);
    setLoading(true);
    await login(email, password);
    setLoading(false);
    router.replace(params.next && params.next.startsWith('/') ? (params.next as never) : '/');
  };

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="absolute -right-24 rounded-full bg-[#F0F5FD]" style={{ width: 340, height: 340, top: -60 }} />

      <Logo size={46} textSize={22} />

      <Text className="mt-8 font-display text-ink" style={{ fontSize: 30, lineHeight: 36 }}>
        Chào mừng trở lại
      </Text>
      <Text className="mt-2 text-[15px] text-muted">Đăng nhập để tiếp tục chuyến đi của bạn.</Text>

      <View className="mt-6" style={{ gap: 16 }}>
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          iconLeft={<Mail size={20} color={colors.subtle} />}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextField
          label="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          iconLeft={<Lock size={20} color={colors.subtle} />}
          helperText="Tối thiểu 8 ký tự"
          slotRight={
            <Pressable accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onPress={() => setShowPassword((v) => !v)}>
              {showPassword ? <EyeOff size={20} color={colors.primary} /> : <Eye size={20} color={colors.primary} />}
            </Pressable>
          }
        />

        {error && (
          <View className="rounded-md bg-danger-tint p-3">
            <Text className="text-sm text-danger">{error}</Text>
          </View>
        )}

        <View className="flex-row items-center justify-between">
          <Pressable className="flex-row items-center" style={{ gap: 8 }} onPress={() => setRemember((v) => !v)}>
            <Checkbox checked={remember} onChange={setRemember} accessibilityLabel="Ghi nhớ đăng nhập" />
            <Text className="text-[15px] text-[#3B4A63]" numberOfLines={1}>
              Ghi nhớ đăng nhập
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/forgot-password' as never)}>
            <Text className="text-[15px] font-body-bold text-primary">Quên mật khẩu?</Text>
          </Pressable>
        </View>

        <Button label="Đăng nhập" onPress={onSubmit} loading={loading} />

        <View className="flex-row items-center" style={{ gap: 12 }}>
          <View className="h-px flex-1 bg-line" />
          <Text className="text-[13px] text-subtle">hoặc</Text>
          <View className="h-px flex-1 bg-line" />
        </View>

        <Button
          label="Đăng nhập bằng số điện thoại"
          variant="secondary"
          iconLeft={<Phone size={18} color={colors.primary} />}
          onPress={() => router.push('/login-phone' as never)}
        />
      </View>

      <View className="mt-8 flex-row items-center justify-center" style={{ gap: 4 }}>
        <Text className="text-muted">Chưa có tài khoản?</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/register')}>
          <Text className="font-body-bold text-primary">Đăng ký</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
