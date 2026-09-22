import { View } from 'react-native';
import type { ReactNode } from 'react';

export type Tone = 'blue' | 'red' | 'orange' | 'green';

const toneClass: Record<Tone, string> = {
  blue: 'bg-primary-soft',
  red: 'bg-danger-soft',
  orange: 'bg-warning-soft',
  green: 'bg-success-soft',
};

export function IconTile({ tone = 'blue', size = 40, children }: { tone?: Tone; size?: number; children: ReactNode }) {
  return (
    <View
      className={`items-center justify-center rounded-md ${toneClass[tone]}`}
      style={{ width: size, height: size }}
    >
      {children}
    </View>
  );
}

export function toneColor(tone: Tone): string {
  return { blue: '#0F5BD7', red: '#D62828', orange: '#C2650A', green: '#0F8A5F' }[tone];
}
