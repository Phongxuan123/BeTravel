import { View, Text, Image } from 'react-native';

type LogoProps = { size?: number; textSize?: number; tagline?: string };

export function Logo({ size = 30, textSize = 20, tagline }: LogoProps) {
  return (
    <View className="flex-row items-center" style={{ gap: 8 }}>
      <Image
        source={require('../../../assets/logo.jpg')}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityLabel="Logo BeTravel"
      />
      <View>
        <Text className="font-display text-ink" style={{ fontSize: textSize }}>
          Be.<Text className="text-primary">Travel</Text>
        </Text>
        {tagline ? <Text className="text-[11px] text-muted">{tagline}</Text> : null}
      </View>
    </View>
  );
}
