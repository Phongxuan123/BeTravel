import { View } from 'react-native';
import Svg, { Circle, Rect, Path, Polygon } from 'react-native-svg';
import { colors } from '@/lib/theme';

// Cờ vẽ tay bằng SVG cho tập quốc gia dùng trong mock (spec Q15 — flag-icons là CSS-only,
// không dùng được trên RN). Khung bo góc viền `line` bao ngoài.
function FlagJP() {
  return (
    <Svg viewBox="0 0 30 20" width="100%" height="100%">
      <Rect width="30" height="20" fill="#FFFFFF" />
      <Circle cx="15" cy="10" r="6" fill="#D62828" />
    </Svg>
  );
}

function FlagKR() {
  return (
    <Svg viewBox="0 0 30 20" width="100%" height="100%">
      <Rect width="30" height="20" fill="#FFFFFF" />
      <Circle cx="15" cy="10" r="5" fill="#C60C30" />
      <Circle cx="15" cy="10" r="5" fill="#003478" opacity={0.55} />
    </Svg>
  );
}

function FlagTH() {
  return (
    <Svg viewBox="0 0 30 20" width="100%" height="100%">
      <Rect width="30" height="20" fill="#A51931" />
      <Rect y="3.3" width="30" height="13.4" fill="#F4F5F8" />
      <Rect y="6.7" width="30" height="6.6" fill="#2D2A4A" />
    </Svg>
  );
}

function FlagSG() {
  return (
    <Svg viewBox="0 0 30 20" width="100%" height="100%">
      <Rect width="30" height="10" fill="#D62828" />
      <Rect y="10" width="30" height="10" fill="#FFFFFF" />
      <Circle cx="7" cy="5" r="3.2" fill="#FFFFFF" />
    </Svg>
  );
}

function FlagFR() {
  return (
    <Svg viewBox="0 0 30 20" width="100%" height="100%">
      <Rect width="10" height="20" fill="#0055A4" />
      <Rect x="10" width="10" height="20" fill="#FFFFFF" />
      <Rect x="20" width="10" height="20" fill="#EF4135" />
    </Svg>
  );
}

function FlagDE() {
  return (
    <Svg viewBox="0 0 30 20" width="100%" height="100%">
      <Rect width="30" height="6.7" fill="#000000" />
      <Rect y="6.7" width="30" height="6.6" fill="#DD0000" />
      <Rect y="13.3" width="30" height="6.7" fill="#FFCE00" />
    </Svg>
  );
}

function FlagVN() {
  return (
    <Svg viewBox="0 0 30 20" width="100%" height="100%">
      <Rect width="30" height="20" fill="#DA251D" />
      <Polygon points="15,4 16.8,9.2 22,9.2 17.8,12.4 19.4,17.6 15,14.4 10.6,17.6 12.2,12.4 8,9.2 13.2,9.2" fill="#FFCD00" />
    </Svg>
  );
}

const FLAGS: Record<string, () => React.JSX.Element> = {
  JP: FlagJP,
  KR: FlagKR,
  TH: FlagTH,
  SG: FlagSG,
  FR: FlagFR,
  DE: FlagDE,
  VN: FlagVN,
};

export function CountryFlag({ code, width = 40, height = 30 }: { code: string; width?: number; height?: number }) {
  const Flag = FLAGS[code];
  return (
    <View
      style={{
        width,
        height,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: colors.line,
        overflow: 'hidden',
        backgroundColor: '#fff',
      }}
    >
      {Flag ? (
        <Flag />
      ) : (
        <Svg viewBox="0 0 30 20" width="100%" height="100%">
          <Rect width="30" height="20" fill={colors.line} />
          <Path d="M10 6 L20 14 M20 6 L10 14" stroke={colors.subtle} strokeWidth={1.5} />
        </Svg>
      )}
    </View>
  );
}
