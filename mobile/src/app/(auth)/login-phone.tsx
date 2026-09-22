import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Phone, KeyRound } from 'lucide-react-native';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { colors } from '@/lib/theme';
import { useAuth } from '@/lib/auth';

// Đăng nhập bằng số điện thoại — luồng mock (không gửi SMS thật, mã OTP cố định "123456"
// để demo). Theo spec Q6: hiển thị đầy đủ, không cần backend SMS thật ở track UI này.
export default function LoginPhoneScreen() {
  const insets = useSafeAreaInsets();
  const { loginWithPhone } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSendOtp = () => {
    if (phone.trim().length < 8) {
      setError('Nhập số điện thoại hợp lệ (kèm mã quốc gia, ví dụ +84...).');
      return;
    }
    setError(null);
    setStep('otp');
  };

  const onVerify = async () => {
    if (otp !== '123456') {
      setError('Mã OTP không đúng. (Bản demo: dùng mã 123456)');
      return;
    }
    setError(null);
    setLoading(true);
    await loginWithPhone(phone.trim());
    setLoading(false);
    router.replace('/');
  };

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <IconButton accessibilityLabel="Quay lại" variant="soft" icon={<ChevronLeft size={20} color={colors.ink} />} onPress={() => router.back()} />

      <Text className="mt-6 font-display text-ink" style={{ fontSize: 30, lineHeight: 36 }}>
        Đăng nhập bằng số điện thoại
      </Text>
      <Text className="mt-2 text-[15px] text-muted">
        {step === 'phone' ? 'Chúng tôi sẽ gửi mã xác nhận 6 số qua SMS.' : `Nhập mã 6 số đã gửi tới ${phone}.`}
      </Text>

      <View className="mt-6" style={{ gap: 16 }}>
        {step === 'phone' ? (
          <TextField
            label="Số điện thoại"
            placeholder="+84 91 234 5678"
            value={phone}
            onChangeText={setPhone}
            iconLeft={<Phone size={20} color={colors.subtle} />}
            keyboardType="phone-pad"
          />
        ) : (
          <TextField
            label="Mã OTP"
            placeholder="123456"
            value={otp}
            onChangeText={setOtp}
            iconLeft={<KeyRound size={20} color={colors.subtle} />}
            keyboardType="number-pad"
            maxLength={6}
            helperText="Bản demo: mã luôn là 123456"
          />
        )}

        {error && (
          <View className="rounded-md bg-danger-tint p-3">
            <Text className="text-sm text-danger">{error}</Text>
          </View>
        )}

        {step === 'phone' ? (
          <Button label="Gửi mã xác nhận" onPress={onSendOtp} />
        ) : (
          <>
            <Button label="Xác nhận" onPress={onVerify} loading={loading} />
            <Pressable className="items-center py-2" onPress={() => setStep('phone')}>
              <Text className="text-[15px] font-body-semibold text-muted">Đổi số điện thoại</Text>
            </Pressable>
          </>
        )}
      </View>
    </ScrollView>
  );
}
