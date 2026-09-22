import { Pressable, Text } from 'react-native';

export function QuickChip({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="h-11 items-center justify-center rounded-full border border-line bg-surface px-4"
    >
      <Text className="text-sm font-body-semibold text-ink" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
