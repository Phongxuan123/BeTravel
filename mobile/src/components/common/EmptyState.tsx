import { View, Text } from 'react-native';
import type { ReactNode } from 'react';
import { Search } from 'lucide-react-native';
import { colors } from '@/lib/theme';

export function EmptyState({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  /** Mặc định là kính lúp (kết quả tìm kiếm trống). */
  icon?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <View className="items-center px-6 py-10">
      <View
        className="mb-5 items-center justify-center rounded-full"
        style={{ width: 136, height: 136, backgroundColor: colors.primarySoft }}
      >
        {icon ?? <Search size={44} color={colors.primary} />}
      </View>
      <Text className="text-center text-xl font-body-bold text-ink">{title}</Text>
      {description && (
        <Text className="mt-2 text-center text-sm text-muted">{description}</Text>
      )}
      {children && <View className="mt-5 w-full" style={{ gap: 10 }}>{children}</View>}
    </View>
  );
}
