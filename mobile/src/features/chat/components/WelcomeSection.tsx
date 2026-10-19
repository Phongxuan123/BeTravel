import { View, Text, Pressable } from 'react-native';
import type { ComponentType } from 'react';
import { Scale, TriangleAlert, Hospital, Landmark } from 'lucide-react-native';
import { colors } from '@/lib/theme';
import { BotAvatar } from './BotAvatar';

type ActionKey = 'law' | 'emergency' | 'hospital' | 'embassy';

type Action = {
  key: ActionKey;
  label: string;
  icon: ComponentType<{ size?: number; color?: string }>;
  iconColor: string;
  tintColor: string;
};

// Tông tím chỉ dùng cho thẻ Đại sứ quán theo mẫu; hệ token chưa có màu này nên khai báo tại chỗ.
const EMBASSY_COLOR = '#7C3AED';
const EMBASSY_TINT = '#F3E8FF';

const ACTIONS: Action[] = [
  { key: 'law', label: 'Luật pháp địa phương', icon: Scale, iconColor: colors.primary, tintColor: colors.primarySoft },
  { key: 'emergency', label: 'Gặp tình huống khẩn cấp', icon: TriangleAlert, iconColor: colors.warning, tintColor: colors.warningSoft },
  { key: 'hospital', label: 'Tìm bệnh viện gần nhất', icon: Hospital, iconColor: colors.success, tintColor: colors.successSoft },
  { key: 'embassy', label: 'Đại sứ quán Việt Nam', icon: Landmark, iconColor: EMBASSY_COLOR, tintColor: EMBASSY_TINT },
];

/*
 * Màn chào khi chưa có tin nhắn: lời chào của trợ lý + lưới 2x2 hành động nhanh (theo mẫu).
 * Thẻ "Luật pháp" và "Khẩn cấp" hỏi AI; thẻ "Bệnh viện" và "Đại sứ quán" mở bản đồ SOS vì đó là dữ liệu
 * địa điểm đã xác minh -- AI pháp lý không trả lời được vị trí.
 */
export function WelcomeSection({ onSelectAction }: { onSelectAction: (key: ActionKey) => void }) {
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 6 }}>
        <View className="flex-row items-start" style={{ gap: 10 }}>
          <BotAvatar />
          <View
            className="flex-1 rounded-[20px] border border-line bg-surface px-4 py-3.5"
            style={{ borderTopLeftRadius: 6 }}
          >
            <Text className="text-[15px] leading-6 text-ink">
              Hey bạn! Sẵn sàng khám phá thế giới chưa? Mình là trợ lý <Text className="font-body-bold">Be.Travel AI</Text>, mình có
              thể giúp gì cho chuyến đi của bạn?
            </Text>
          </View>
        </View>
        <Text className="ml-[46px] text-xs text-muted">Hỏi mình về luật địa phương, tình huống khẩn cấp và mẹo du lịch.</Text>
      </View>

      <View className="flex-row flex-wrap justify-between" style={{ rowGap: 10 }}>
        {ACTIONS.map(({ key, label, icon: Icon, iconColor, tintColor }) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => onSelectAction(key)}
            className="min-h-[104px] rounded-2xl border border-line bg-surface p-3.5"
            style={{ width: '48.5%', gap: 10 }}
          >
            <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: tintColor }}>
              <Icon size={20} color={iconColor} />
            </View>
            <Text className="text-sm font-body-bold text-ink" numberOfLines={2}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export type { ActionKey };
