import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PAGE_PADDING = 24;

// Ba vùng cùng cuộn khi thiếu chỗ; chỉ vùng nhập liệu giãn và căn giữa.
type AuthScreenProps = { header: ReactNode; children: ReactNode; footer: ReactNode };

export function AuthScreen({ header, children, footer }: AuthScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
        <View style={{ flexShrink: 0 }}>{header}</View>
        <View style={{ flexGrow: 1, flexShrink: 0, justifyContent: 'center', paddingVertical: 32 }}>
          {children}
        </View>
        <View style={{ flexShrink: 0 }}>{footer}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
