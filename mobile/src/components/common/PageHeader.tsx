import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';
import { IconButton } from '../ui/IconButton';
import { colors } from '@/lib/theme';

// Biến thể A — back + tiêu đề cùng hàng (spec mục 4.3).
export function PageHeader({
  title,
  subtitle,
  right,
  tone = 'light',
  onBack,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  tone?: 'light' | 'danger';
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={`border-b border-line px-[18px] pb-3 ${tone === 'danger' ? 'bg-danger-tint' : 'bg-surface'}`}
      style={{ paddingTop: insets.top + 12 }}
    >
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <IconButton
          accessibilityLabel="Quay lại"
          icon={<ChevronLeft size={20} color={colors.ink} />}
          variant={tone === 'danger' ? 'outline' : 'soft'}
          onPress={onBack ?? (() => router.back())}
        />
        <View className="flex-1">
          <Text className="text-[18px] font-display text-ink" numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text className="text-xs text-muted" numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        {right}
      </View>
    </View>
  );
}

// Biến thể B — chỉ nút hai góc, tiêu đề nằm trong nội dung.
export function PageHeaderBare({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row items-center justify-between bg-surface px-[18px] pb-3"
      style={{ paddingTop: insets.top + 12 }}
    >
      <View className="flex-row" style={{ gap: 8 }}>{left}</View>
      <View className="flex-row" style={{ gap: 8 }}>{right}</View>
    </View>
  );
}
