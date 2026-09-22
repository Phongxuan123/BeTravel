import { ScrollView, View, Text } from 'react-native';
import { Stack } from 'expo-router';
import { colors, radii, spacing, shadows, typography } from '@/lib/theme';

type Swatch = { token: string; hex: string };

const colorGroups: { title: string; swatches: Swatch[] }[] = [
  {
    title: 'Primary',
    swatches: [
      { token: 'primary', hex: colors.primary },
      { token: 'primary-strong', hex: colors.primaryStrong },
      { token: 'primary-soft', hex: colors.primarySoft },
    ],
  },
  {
    title: 'Nền & chữ',
    swatches: [
      { token: 'bg', hex: colors.bg },
      { token: 'surface', hex: colors.surface },
      { token: 'ink', hex: colors.ink },
      { token: 'muted', hex: colors.muted },
      { token: 'subtle', hex: colors.subtle },
      { token: 'line', hex: colors.line },
    ],
  },
  {
    title: 'Success',
    swatches: [
      { token: 'success', hex: colors.success },
      { token: 'success-soft', hex: colors.successSoft },
    ],
  },
  {
    title: 'Warning / Cream',
    swatches: [
      { token: 'warning', hex: colors.warning },
      { token: 'warning-soft', hex: colors.warningSoft },
      { token: 'amber-soft', hex: colors.amberSoft },
      { token: 'cream', hex: colors.cream },
      { token: 'cream-line', hex: colors.creamLine },
    ],
  },
  {
    title: 'Danger (chỉ dùng cho khẩn cấp)',
    swatches: [
      { token: 'danger', hex: colors.danger },
      { token: 'danger-soft', hex: colors.dangerSoft },
      { token: 'danger-tint', hex: colors.dangerTint },
      { token: 'danger-line', hex: colors.dangerLine },
    ],
  },
];

const typeScale: { name: string; key: keyof typeof typography; sample: string }[] = [
  { name: 'display-xl', key: 'displayXl', sample: 'Bảo vệ bạn khi du lịch nước ngoài' },
  { name: 'display', key: 'display', sample: 'Cẩm nang pháp luật' },
  { name: 'title-lg', key: 'titleLg', sample: 'Hỗ trợ khẩn cấp' },
  { name: 'section', key: 'section', sample: 'Thông tin dành cho bạn' },
  { name: 'card-title', key: 'cardTitle', sample: 'Tiêu đề card' },
  { name: 'body', key: 'body', sample: 'Mô tả nội dung, dòng cao 20px.' },
  { name: 'caption', key: 'caption', sample: 'Cập nhật 12/04/2024' },
];

const radiusScale: { name: string; value: number }[] = [
  { name: 'sm (r11)', value: radii.sm },
  { name: 'md (r14)', value: radii.md },
  { name: 'lg (r18)', value: radii.lg },
  { name: 'xl (r22)', value: radii.xl },
];

const spacingScale: { name: string; value: number }[] = [
  { name: 'xs', value: spacing.xs },
  { name: 'sm', value: spacing.sm },
  { name: 'md', value: spacing.md },
  { name: 'lg', value: spacing.lg },
  { name: 'xl', value: spacing.xl },
];

function SectionTitle({ children }: { children: string }) {
  return <Text style={typography.section} className="mb-3 mt-6 text-ink">{children}</Text>;
}

export default function DesignSystemScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Design System' }} />
      <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ padding: 18, paddingBottom: 48 }}>
        <Text style={typography.displayXl} className="text-ink">
          Design tokens
        </Text>
        <Text style={typography.body} className="mt-1 text-muted">
          Đối chiếu với claude_04_FE_UI_Spec.md mục 2. Trang này chỉ dùng nội bộ (dev).
        </Text>

        {colorGroups.map((group) => (
          <View key={group.title}>
            <SectionTitle>{group.title}</SectionTitle>
            <View className="flex-row flex-wrap" style={{ gap: spacing.sm }}>
              {group.swatches.map((s) => (
                <View key={s.token} style={{ width: 104 }}>
                  <View
                    style={{
                      height: 56,
                      borderRadius: radii.md,
                      backgroundColor: s.hex,
                      borderWidth: 1,
                      borderColor: colors.line,
                    }}
                  />
                  <Text style={typography.caption} className="mt-1 text-ink">
                    {s.token}
                  </Text>
                  <Text style={typography.caption} className="text-subtle">
                    {s.hex}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <SectionTitle>Thang chữ</SectionTitle>
        <View className="rounded-lg border border-line bg-surface p-4" style={shadows.card}>
          {typeScale.map((t, i) => (
            <View key={t.name} style={{ marginTop: i === 0 ? 0 : spacing.md }}>
              <Text style={typography.caption} className="text-subtle">
                {t.name}
              </Text>
              <Text style={typography[t.key]}>{t.sample}</Text>
            </View>
          ))}
        </View>

        <SectionTitle>Bo góc</SectionTitle>
        <View className="flex-row" style={{ gap: spacing.md }}>
          {radiusScale.map((r) => (
            <View key={r.name} style={{ alignItems: 'center' }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: r.value,
                  backgroundColor: colors.primarySoft,
                  borderWidth: 1,
                  borderColor: colors.line,
                }}
              />
              <Text style={typography.caption} className="mt-1 text-muted">
                {r.name}
              </Text>
            </View>
          ))}
        </View>

        <SectionTitle>Khoảng cách</SectionTitle>
        <View style={{ gap: spacing.xs }}>
          {spacingScale.map((s) => (
            <View key={s.name} className="flex-row items-center" style={{ gap: spacing.sm }}>
              <Text style={typography.caption} className="w-10 text-muted">
                {s.name}
              </Text>
              <View style={{ width: s.value, height: 14, backgroundColor: colors.primary }} />
              <Text style={typography.caption} className="text-subtle">
                {s.value}px
              </Text>
            </View>
          ))}
        </View>

        <SectionTitle>Bóng</SectionTitle>
        <View className="flex-row" style={{ gap: spacing.lg }}>
          <View
            style={{
              width: 100,
              height: 64,
              borderRadius: radii.lg,
              backgroundColor: colors.surface,
              ...shadows.card,
            }}
          />
          <View
            style={{
              width: 100,
              height: 64,
              borderRadius: radii.lg,
              backgroundColor: colors.primary,
              ...shadows.ctaPrimary,
            }}
          />
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: radii.full,
              backgroundColor: colors.danger,
              ...shadows.sos,
            }}
          />
        </View>
      </ScrollView>
    </>
  );
}
