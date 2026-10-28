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
const SOS_BUTTON_SIZE = 52;
// Nhãn "Khẩn cấp" nằm cùng hàng với nhãn các tab khác (cách đáy thanh 8px), nên nút SOS chỉ
// nhô lên trên mép thanh điều hướng vài px thay vì đè lên nội dung phía trên.
const SOS_LABEL_BOTTOM = 8;
const SOS_LABEL_HEIGHT = 18;
const SOS_PROTRUSION = SOS_LABEL_BOTTOM + SOS_LABEL_HEIGHT + SOS_BUTTON_SIZE - NAV_HEIGHT;
const CONTENT_GAP = 16;

const tabs: { key: Exclude<ActiveTab, 'sos'>; label: string; icon: typeof House; href: '/' | '/explore' | '/chat' | '/profile' }[] = [
  { key: 'home', label: 'Trang chủ', icon: House, href: '/' },
  { key: 'explore', label: 'Khám phá', icon: Compass, href: '/explore' },
  { key: 'chat', label: 'Trợ lý AI', icon: MessageCircle, href: '/chat' },
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
      <View className="absolute inset-x-0 items-center" style={{ bottom: insets.bottom + SOS_LABEL_BOTTOM }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Khẩn cấp — mở SOS Hub"
          onPress={() => router.push('/sos')}
          className="items-center justify-center rounded-full border-4 border-white"
          style={{ width: SOS_BUTTON_SIZE, height: SOS_BUTTON_SIZE, backgroundColor: colors.danger, ...shadows.sos }}
        >
          <Text className="font-display text-sm text-white">SOS</Text>
        </Pressable>
        <Text className="text-[11px] font-body-bold text-danger" style={{ lineHeight: SOS_LABEL_HEIGHT }}>
          Khẩn cấp
        </Text>
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

/**
 * Khoảng đệm dưới cho nội dung cuộn trong AppShell: thanh điều hướng, phần nút SOS nhô lên,
 * nhãn "Khẩn cấp" và vùng an toàn của máy. Thiếu vùng an toàn thì nút SOS che mục cuối (B14).
 */
// Chừa chỗ cho thanh tab + phần nhô lên của nút SOS (không gồm nhãn): dùng cho thanh nhập liệu
// đặt sát thanh tab (màn chat) thay vì cuộn nội dung như useAppShellBottomPadding.
export function useAppShellNavClearance(): number {
  const insets = useSafeAreaInsets();
  return NAV_HEIGHT + insets.bottom + SOS_PROTRUSION + CONTENT_GAP / 2;
}

export function useAppShellBottomPadding(): number {
  const insets = useSafeAreaInsets();
  return NAV_HEIGHT + insets.bottom + SOS_PROTRUSION + CONTENT_GAP;
}
