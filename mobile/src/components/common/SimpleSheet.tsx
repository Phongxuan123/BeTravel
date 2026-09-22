import { Modal, Pressable, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { colors } from '@/lib/theme';

// Bottom sheet đơn giản dựng bằng RN Modal (không dùng @gorhom/bottom-sheet ở đây để
// giảm rủi ro tương tác với các form nhỏ, một lần dùng: sửa hồ sơ, thêm liên hệ, đổi mật khẩu...).
export function SimpleSheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} accessibilityLabel="Đóng" />
      <View
        className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-surface px-[18px] pt-3"
        style={{ paddingBottom: insets.bottom + 18 }}
      >
        <View className="mb-1 items-center">
          <View className="h-[5px] w-11 rounded-full bg-[#D6DEEA]" />
        </View>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-lg font-body-bold text-ink">{title}</Text>
          <Pressable accessibilityLabel="Đóng" onPress={onClose} hitSlop={8}>
            <X size={22} color={colors.muted} />
          </Pressable>
        </View>
        <View className="mt-4">{children}</View>
      </View>
    </Modal>
  );
}
