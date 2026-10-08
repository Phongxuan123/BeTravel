import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { Siren } from 'lucide-react-native';
import { colors } from '@/lib/theme';

/**
 * Lối vào SOS cho người chưa đăng nhập (màn chào, đăng nhập). SOS Hub và chia sẻ vị trí được
 * mở cho khách trong AppGate để không ai phải tạo tài khoản mới gọi được số khẩn cấp.
 */
export function EmergencyEntryButton({ variant }: { variant: 'pill' | 'block' }) {
  if (variant === 'pill') {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel="Mở SOS khẩn cấp" onPress={() => router.push('/sos')}
        hitSlop={8} className="flex-row items-center rounded-full bg-danger px-3 py-1.5" style={{ gap: 6 }}>
        <Siren size={14} color="#fff" />
        <Text className="text-[13px] font-body-bold text-white">SOS</Text>
      </Pressable>
    );
  }
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Mở SOS khẩn cấp" onPress={() => router.push('/sos')}
      className="h-14 flex-row items-center justify-center rounded-lg border border-danger-line bg-danger-tint" style={{ gap: 8 }}>
      <Siren size={18} color={colors.danger} />
      <Text className="font-body-bold text-danger">Đang gặp nguy hiểm? Mở SOS khẩn cấp</Text>
    </Pressable>
  );
}
