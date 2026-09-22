import { View, Text } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { colors } from '@/lib/theme';

export function Logo({ size = 30, textSize = 20 }: { size?: number; textSize?: number }) {
  return (
    <View className="flex-row items-center" style={{ gap: 8 }}>
      <View
        className="items-center justify-center rounded-sm"
        style={{ width: size, height: size, backgroundColor: colors.primary }}
      >
        <ShieldCheck color="#fff" size={size * 0.6} />
      </View>
      <Text className="font-display text-ink" style={{ fontSize: textSize }}>
        Be.Travel
      </Text>
    </View>
  );
}
