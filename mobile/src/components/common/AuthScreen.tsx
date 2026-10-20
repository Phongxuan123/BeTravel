import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FORM_MAX_WIDTH = 480;
const PAGE_PADDING = 24;

// Căn giữa khi đủ chỗ; nội dung dài vẫn cuộn, không khóa chiều cao form.
export function AuthScreen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView className="flex-1 bg-surface" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: PAGE_PADDING,
          paddingTop: insets.top + PAGE_PADDING,
          paddingBottom: insets.bottom + PAGE_PADDING,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={{ width: '100%', maxWidth: FORM_MAX_WIDTH }}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
