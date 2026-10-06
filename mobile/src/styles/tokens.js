/**
 * Nguồn sự thật duy nhất cho design tokens (màu, chữ, bo góc, khoảng cách, bóng).
 * Đọc bởi tailwind.config.js (NativeWind) và bởi src/lib/theme.ts (dùng trong code
 * không qua className, ví dụ style bản đồ, SVG cờ, StyleSheet thuần).
 * Nguồn: FRONTEND_UI_SPECIFICATION.md mục 1 (Brand Blue 1677FF, 60-30-10).
 */

const colors = {
  primary: '#1677FF',
  primaryStrong: '#0B5ED7',
  primarySoft: '#EAF4FF',
  bg: '#F5F9FF',
  surface: '#FFFFFF',
  ink: '#102A43',
  muted: '#6B7280',
  subtle: '#94A3B8',
  line: '#E2E8F0',
  success: '#22C55E',
  successStrong: '#15803D',
  successSoft: '#DCFCE7',
  successTint: '#F0FDF4',
  warning: '#D97706',
  warningStrong: '#B45309',
  warningSoft: '#FEF3C7',
  amberSoft: '#FEF3C7',
  warningTint: '#FFFBEB',
  cream: '#FFFBEB',
  creamLine: '#FDE68A',
  danger: '#EF4444',
  dangerStrong: '#DC2626',
  dangerSoft: '#FEE2E2',
  dangerTint: '#FEF2F2',
  dangerLine: '#FECACA',
};

// Plus Jakarta Sans cho chữ chính, JetBrains Mono cho số liệu (số khẩn cấp, tọa độ, khoảng cách).
const fontFamily = {
  display: 'PlusJakartaSans_800ExtraBold',
  displayExtraBold: 'PlusJakartaSans_800ExtraBold',
  body: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  bodySemiBold: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
};

// Thẻ và ô nhập 16px (lg), Hero/Sheet/Modal 24px (xl).
const radii = {
  sm: 10,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

// Lưới 8px: 6 · 10 · 14 · 18 · 24 giữ nguyên tên để không vỡ layout hiện có.
const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
};

// RN không có box-shadow đa lớp; dùng shadow* (iOS) + elevation (Android) tương đương.
const shadows = {
  card: {
    shadowColor: 'rgba(16, 42, 67, 1)',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  ctaPrimary: {
    shadowColor: 'rgba(22, 119, 255, 1)',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  sos: {
    shadowColor: 'rgba(239, 68, 68, 1)',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
};

module.exports = { colors, fontFamily, radii, spacing, shadows };
