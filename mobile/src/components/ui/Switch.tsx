import { Switch as RNSwitch } from 'react-native';
import { colors } from '@/lib/theme';

export function Switch({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
}) {
  return (
    <RNSwitch
      accessibilityLabel={accessibilityLabel}
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#DCE3EE', true: colors.success }}
      thumbColor="#FFFFFF"
      ios_backgroundColor="#DCE3EE"
    />
  );
}
