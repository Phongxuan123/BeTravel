import { Pressable, Text } from 'react-native';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react-native';
import { colors } from '@/lib/theme';

export function FilterChip({
  label,
  active = false,
  iconLeft,
  showChevron = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  iconLeft?: ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`h-[38px] flex-row items-center gap-1.5 rounded-full border px-4 ${
        active ? 'border-primary bg-primary' : 'border-line bg-surface'
      }`}
    >
      {iconLeft}
      <Text
        numberOfLines={1}
        className={`text-sm font-body-semibold ${active ? 'text-white' : 'text-ink'}`}
      >
        {label}
      </Text>
      {showChevron && <ChevronDown size={16} color={active ? '#fff' : colors.muted} />}
    </Pressable>
  );
}
