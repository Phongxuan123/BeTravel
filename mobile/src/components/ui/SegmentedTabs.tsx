import { Pressable, Text, View } from 'react-native';

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View accessibilityRole="tablist" className="flex-row rounded-md bg-[#EEF3FA] p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            className={`flex-1 items-center rounded-[10px] py-2 ${active ? 'bg-surface shadow-sm' : ''}`}
          >
            <Text className={`text-[15px] ${active ? 'font-body-bold text-ink' : 'font-body-semibold text-muted'}`}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
