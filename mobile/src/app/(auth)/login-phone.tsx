import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Construction, Mail } from 'lucide-react-native';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { colors } from '@/lib/theme';

// Đăng nhập bằng số điện thoại cần dịch vụ gửi OTP qua SMS -- nằm ngoài phạm vi
// MVP (chưa có nhà cung cấp SMS nào được cấu hình). Thay vì mô phỏng một luồng
// OTP giả (dễ khiến người dùng tưởng đã có tài khoản thật), màn hình này chặn
// sớm và hướng người dùng quay lại đăng nhập bằng email.
export default function LoginPhoneScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-surface"
      style={{ paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
    >
      <IconButton
        accessibilityLabel="Quay lại"
        variant="soft"
        icon={<ChevronLeft size={20} color={colors.ink} />}
        onPress={() => router.back()}
      />

      <View className="flex-1 items-center justify-center" style={{ gap: 16 }}>
        <View className="items-center justify-center rounded-full bg-[#F0F5FD]" style={{ width: 88, height: 88 }}>
          <Construction size={40} color={colors.primary} />
        </View>

        <Text className="text-center font-display text-ink" style={{ fontSize: 24, lineHeight: 30 }}>
          Tính năng đang phát triển
        </Text>
        <Text className="text-center text-[15px] text-muted" style={{ maxWidth: 280 }}>
          Đăng nhập bằng số điện thoại chưa sẵn sàng. Vui lòng dùng email để đăng nhập hoặc tạo tài khoản.
        </Text>

        <Button
          label="Đăng nhập bằng email"
          iconLeft={<Mail size={18} color="#fff" />}
          onPress={() => router.replace('/login')}
        />
      </View>
    </View>
  );
}
