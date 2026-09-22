import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Mail, MailCheck } from 'lucide-react-native';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { colors } from '@/lib/theme';

// Quên mật khẩu — luồng mock (spec Q7): không có backend reset thật ở track UI này,
// chỉ mô phỏng "đã gửi email khôi phục" để hoàn thiện trải nghiệm thay vì để trống.
export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = () => {
    if (!email.includes('@')) {
      setError('Nhập email hợp lệ.');
      return;
    }
    setError(null);
    setSent(true);
  };

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <IconButton accessibilityLabel="Quay lại" variant="soft" icon={<ChevronLeft size={20} color={colors.ink} />} onPress={() => router.back()} />

      {sent ? (
        <View className="mt-10 items-center px-2">
          <View className="h-[100px] w-[100px] items-center justify-center rounded-full bg-primary-soft">
            <MailCheck size={44} color={colors.primary} />
          </View>
          <Text className="mt-5 text-center font-display text-ink" style={{ fontSize: 22 }}>
            Đã gửi email khôi phục
          </Text>
          <Text className="mt-2 text-center text-[15px] text-muted">
            Kiểm tra hộp thư {email} để đặt lại mật khẩu. Email có thể mất vài phút để đến nơi.
          </Text>
          <View className="mt-6 w-full">
            <Button label="Về đăng nhập" onPress={() => router.replace('/login')} />
          </View>
        </View>
      ) : (
        <>
          <Text className="mt-6 font-display text-ink" style={{ fontSize: 30, lineHeight: 36 }}>
            Quên mật khẩu?
          </Text>
          <Text className="mt-2 text-[15px] text-muted">Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.</Text>

          <View className="mt-6" style={{ gap: 16 }}>
            <TextField
              label="Email"
              value={email}
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
            <Button label="Gửi liên kết khôi phục" onPress={onSubmit} />
          </View>

          <View className="mt-8 flex-row items-center justify-center" style={{ gap: 4 }}>
            <Text className="text-muted">Nhớ ra mật khẩu rồi?</Text>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/login')}>
              <Text className="font-body-bold text-primary">Đăng nhập</Text>
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  );
}
