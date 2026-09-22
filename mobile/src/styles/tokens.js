/**
 * Nguồn sự thật duy nhất cho design tokens (màu, chữ, bo góc, khoảng cách, bóng).
 * Đọc bởi tailwind.config.js (NativeWind) và bởi src/lib/theme.ts (dùng trong code
 * không qua className, ví dụ style bản đồ, SVG cờ, StyleSheet thuần).
 * Nguồn: docs/ui/claude_04_FE_UI_Spec.md mục 2.
 */

const colors = {
  primary: '#0F5BD7',
  primaryStrong: '#0A3D8F',
  primarySoft: '#EAF1FE',
  bg: '#F6F9FE',
  surface: '#FFFFFF',
  ink: '#0E1C33',
  muted: '#5A6B87',
  subtle: '#8A97AD',
  line: '#E9F0FA',
  success: '#0F8A5F',
  successSoft: '#E3F4EC',
  warning: '#C2650A',
  warningSoft: '#FCEEE1',
  amberSoft: '#F9E9CB',
  cream: '#FEFBF6',
  creamLine: '#F1E3CF',
  danger: '#D62828',
  dangerSoft: '#FBE8E8',
  dangerTint: '#FEF6F4',
  dangerLine: '#F6D6D6',
};

const fontFamily = {
  display: 'BricolageGrotesque_700Bold',
  displayExtraBold: 'BricolageGrotesque_800ExtraBold',
  body: 'BeVietnamPro_400Regular',
  bodyMedium: 'BeVietnamPro_500Medium',
  bodySemiBold: 'BeVietnamPro_600SemiBold',
  bodyBold: 'BeVietnamPro_700Bold',
};

const radii = {
  sm: 11,
  md: 14,
  lg: 18,
  xl: 22,
  full: 999,
};

// Thang khoảng cách chuẩn: 6 · 10 · 14 · 18 · 24
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
    shadowColor: 'rgba(14, 28, 51, 1)',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  ctaPrimary: {
    shadowColor: 'rgba(15, 91, 215, 1)',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  sos: {
    shadowColor: 'rgba(214, 40, 40, 1)',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
};

module.exports = { colors, fontFamily, radii, spacing, shadows };
