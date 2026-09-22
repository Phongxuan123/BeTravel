import { Pressable, View } from 'react-native';
import { Check } from 'lucide-react-native';

export function Checkbox({
  checked,
  onChange,
  accessibilityLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked }}
      hitSlop={8}
      onPress={() => onChange(!checked)}
    >
      <View
        className={`h-[22px] w-[22px] items-center justify-center rounded-[6px] border-[1.5px] ${
          checked ? 'border-primary bg-primary' : 'border-[#8A97AD] bg-transparent'
        }`}
      >
        {checked && <Check size={14} color="#fff" strokeWidth={3} />}
      </View>
    </Pressable>
  );
}
