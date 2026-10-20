import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PAGE_PADDING = 24;

// Nền và form phủ chiều rộng màn hình; chỉ căn giữa chữ, không bó form vào card.
export function AuthScreen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView className="flex-1 bg-surface" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'stretch',
          paddingHorizontal: PAGE_PADDING,
          paddingTop: insets.top + PAGE_PADDING,
          paddingBottom: insets.bottom + PAGE_PADDING,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={{ width: '100%', flexShrink: 0 }}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
