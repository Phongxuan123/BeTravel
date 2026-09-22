import { View } from 'react-native';

export function StepProgress({ total, current }: { total: number; current: number }) {
  return (
    <View accessibilityLabel={`Bước ${current}/${total}`} className="flex-row" style={{ gap: 8 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className={`h-1 flex-1 rounded-full ${i < current ? 'bg-primary' : 'bg-line'}`}
        />
      ))}
    </View>
  );
}
