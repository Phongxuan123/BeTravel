import { Pressable, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react-native';
import { colors } from '@/lib/theme';

export function ListRow({
  icon,
  title,
  subtitle,
  trailing,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      className="min-h-[66px] flex-row items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3"
    >
      {icon}
      <View className="flex-1">
        <Text className="text-[14px] font-body-semibold text-ink" numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text className="text-xs text-muted" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {trailing ?? (onPress && <ChevronRight size={20} color={colors.muted} />)}
    </Pressable>
  );
}
