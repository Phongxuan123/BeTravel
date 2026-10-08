import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { House, Compass, MessageCircle, User } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { colors, shadows } from '@/lib/theme';
import { AlertBanner, isInlineBanner, useBannerAlert } from './AlertBanner';
import { TopInsetProvider } from './screenTopInset';

export type ActiveTab = 'home' | 'explore' | 'sos' | 'chat' | 'profile';

const NAV_HEIGHT = 72;

const tabs: { key: Exclude<ActiveTab, 'sos'>; label: string; icon: typeof House; href: '/' | '/explore' | '/chat' | '/profile' }[] = [
  { key: 'home', label: 'Trang chủ', icon: House, href: '/' },
  { key: 'explore', label: 'Khám phá', icon: Compass, href: '/explore' },
  { key: 'chat', label: 'AI pháp lý', icon: MessageCircle, href: '/chat' },
  { key: 'profile', label: 'Cá nhân', icon: User, href: '/profile' },
];

export function AppShell({ active, children }: { active: ActiveTab; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const bannerAlert = useBannerAlert();
  // Banner nhỏ chiếm vùng thanh trạng thái thay cho header của màn hình bên dưới.
  const bannerTakesTopInset = isInlineBanner(bannerAlert);
  return (
    <View className="flex-1 bg-bg">
      <AlertBanner alert={bannerAlert} topInset={insets.top} />
      <TopInsetProvider value={bannerTakesTopInset ? 0 : null}>
        <View className="flex-1">{children}</View>
      </TopInsetProvider>
      <View
        className="absolute inset-x-0 bottom-0 flex-row border-t border-line bg-surface"
        style={{ height: NAV_HEIGHT + insets.bottom, paddingBottom: insets.bottom }}
      >
        {tabs.slice(0, 2).map((tab) => (
          <NavItem key={tab.key} tab={tab} active={active === tab.key} />
        ))}
        <View style={{ width: 60 }} />
        {tabs.slice(2).map((tab) => (
          <NavItem key={tab.key} tab={tab} active={active === tab.key} />
        ))}
      </View>
      <View className="absolute inset-x-0 items-center" style={{ bottom: NAV_HEIGHT + insets.bottom - 22 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Khẩn cấp — mở SOS Hub"
          onPress={() => router.push('/sos')}
          className="items-center justify-center rounded-full border-4 border-white"
          style={{ width: 60, height: 60, backgroundColor: colors.danger, ...shadows.sos }}
        >
          <Text className="font-display text-base text-white">SOS</Text>
        </Pressable>
        <Text className="mt-1 text-xs font-body-bold text-danger">Khẩn cấp</Text>
      </View>
    </View>
  );
}

function NavItem({
  tab,
  active,
}: {
  tab: { label: string; icon: typeof House; href: '/' | '/explore' | '/chat' | '/profile' };
  active: boolean;
}) {
  const Icon = tab.icon;
  const color = active ? colors.primary : colors.muted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tab.label}
      onPress={() => router.push(tab.href)}
      className="flex-1 items-center justify-center pt-2"
    >
      <View className={`h-8 w-14 items-center justify-center rounded-full ${active ? 'bg-primary-soft' : ''}`}>
        <Icon size={22} color={color} />
      </View>
      <Text className={`mt-0.5 text-[11px] ${active ? 'font-body-bold' : 'font-body-semibold'}`} style={{ color }}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

export const APP_SHELL_CONTENT_BOTTOM_PADDING = 110;
