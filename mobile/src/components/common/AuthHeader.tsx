import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Logo } from '@/components/brand/Logo';

// Header chung của Login/Register theo mẫu #01-#02: logo + tagline, nút "Xem giới thiệu" mở onboarding.
export function AuthHeader() {
  return (
    <View className="flex-row flex-wrap items-center justify-between" style={{ gap: 12 }}>
      <Logo size={40} textSize={20} tagline="Smart Legal Travel Companion" />
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/welcome' as never)}
        className="rounded-full bg-primary-soft px-3.5 py-2"
        style={{ minHeight: 44, justifyContent: 'center' }}
      >
        <Text className="text-[13px] font-body-bold text-primary-strong">Xem giới thiệu</Text>
      </Pressable>
    </View>
  );
}
