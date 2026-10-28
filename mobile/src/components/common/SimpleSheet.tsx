import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { colors } from '@/lib/theme';
import { useKeyboardInset } from '@/lib/useKeyboardInset';

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
  const keyboardInset = useKeyboardInset();
  const { height: windowHeight } = useWindowDimensions();
  // Đẩy sheet lên trên bàn phím; phần thân cuộn được để sheet dài không tràn ra ngoài màn hình.
  const bodyMaxHeight = Math.max(160, windowHeight - keyboardInset - insets.top - 140);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} accessibilityLabel="Đóng" />
      <View
        className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-surface px-[18px] pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, keyboardInset) + 18 }}
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
        <ScrollView className="mt-4" style={{ maxHeight: bodyMaxHeight }} keyboardShouldPersistTaps="handled" bounces={false}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}
