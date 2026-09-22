import { Pressable, Text, View } from 'react-native';

export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-base font-body-bold text-ink">{title}</Text>
      {actionLabel && (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text className="text-sm font-body-semibold text-primary">{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}
