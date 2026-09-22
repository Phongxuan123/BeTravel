// Wrapper TypeScript cho src/styles/tokens.js — dùng khi cần giá trị token thô
// (StyleSheet.create, style bản đồ, SVG cờ...) thay vì className NativeWind.
import type { TextStyle } from 'react-native';
import tokens from '../styles/tokens';

export const colors = tokens.colors;
export const fontFamily = tokens.fontFamily;
export const radii = tokens.radii;
export const spacing = tokens.spacing;
export const shadows = tokens.shadows;

// line-height tính sẵn theo mục 2.2 của spec (px), dùng trực tiếp trong style.lineHeight của RN.
export const typography = {
  displayXl: {
    fontFamily: fontFamily.displayExtraBold,
    fontSize: 30,
    lineHeight: 36,
  },
  display: { fontFamily: fontFamily.display, fontSize: 26, lineHeight: 32 },
  titleLg: { fontFamily: fontFamily.display, fontSize: 22, lineHeight: 28 },
  section: { fontFamily: fontFamily.bodyBold, fontSize: 16, lineHeight: 22 },
  cardTitle: { fontFamily: fontFamily.bodySemiBold, fontSize: 14, lineHeight: 20 },
  body: { fontFamily: fontFamily.body, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fontFamily.bodyMedium, fontSize: 12, lineHeight: 16 },
  overline: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.66, // ~.06em ở 11px
    textTransform: 'uppercase',
    color: colors.muted,
  },
} satisfies Record<string, TextStyle>;

export type ColorToken = keyof typeof colors;
export type TypographyToken = keyof typeof typography;
