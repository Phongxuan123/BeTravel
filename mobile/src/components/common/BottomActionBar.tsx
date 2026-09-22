import { View } from 'react-native';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function BottomActionBar({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="absolute inset-x-0 bottom-0 flex-row border-t border-line bg-surface px-[18px] pt-4"
      style={{ gap: 12, paddingBottom: Math.max(insets.bottom, 16) }}
    >
      {children}
    </View>
  );
}
