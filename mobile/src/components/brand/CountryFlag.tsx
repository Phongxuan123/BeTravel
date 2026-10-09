import { View } from 'react-native';
import Svg, { Circle, G, Rect, Path, Polygon } from 'react-native-svg';
import { colors } from '@/lib/theme';

// Cờ vẽ bằng SVG theo tỉ lệ chính thức cho tập quốc gia đang có (spec Q15 — flag-icons là CSS-only,
// không dùng được trên RN). Khung bo góc viền `line` bao ngoài.
function FlagJP() {
  return (
    <Svg viewBox="0 0 30 20" width="100%" height="100%">
      <Rect width="30" height="20" fill="#FFFFFF" />
      <Circle cx="15" cy="10" r="6" fill="#D62828" />
    </Svg>
  );
}

// Hai cặp quẻ nằm trên hai đường chéo của cờ; mỗi nhóm là 3 vạch ở phía trên và 3 vạch phía dưới
// tâm (toạ độ đã xoay), vạch đứt được tạo bằng nét trắng cắt ngang giữa vạch.
const KR_TRIGRAM_BARS = 'M-6-25H6M-6-22H6M-6-19H6M-6 19H6M-6 22H6M-6 25H6';
const KR_DIAGONAL_DEG = 56.3099325;

function FlagKR() {
  return (
    <Svg viewBox="-36 -24 72 48" width="100%" height="100%">
      <Rect x="-36" y="-24" width="72" height="48" fill="#FFFFFF" />
      <G rotation={-KR_DIAGONAL_DEG}>
        <Path d={KR_TRIGRAM_BARS} stroke="#000000" strokeWidth={2} />
        <Path d="M0 17v10" stroke="#FFFFFF" strokeWidth={1} />
        <Circle r="12" fill="#CD2E3A" />
        <Path d="M0-12A6 6 0 0 0 0 0A6 6 0 0 1 0 12A12 12 0 0 1 0-12Z" fill="#0047A0" />
      </G>
      <G rotation={-(180 - KR_DIAGONAL_DEG)}>
        <Path d={KR_TRIGRAM_BARS} stroke="#000000" strokeWidth={2} />
        <Path d="M0-23.5v3M0 17v3.5M0 23.5v3" stroke="#FFFFFF" strokeWidth={1} />
      </G>
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

// Toạ độ đỉnh của ngôi sao năm cánh tâm (cx, cy), dùng cho cờ Singapore.
function starPoints(cx: number, cy: number, outer: number): string {
  const inner = outer * 0.382;
  return Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');
}

const SG_STAR_CENTERS = Array.from({ length: 5 }, (_, i) => {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
  return [9.4 + 1.9 * Math.cos(angle), 5 + 1.9 * Math.sin(angle)] as const;
});

function FlagSG() {
  return (
    <Svg viewBox="0 0 30 20" width="100%" height="100%">
      <Rect width="30" height="10" fill="#EF3340" />
      <Rect y="10" width="30" height="10" fill="#FFFFFF" />
      <Circle cx="6.6" cy="5" r="3.4" fill="#FFFFFF" />
      <Circle cx="7.8" cy="5" r="3.2" fill="#EF3340" />
      {SG_STAR_CENTERS.map(([x, y]) => (
        <Polygon key={`${x}-${y}`} points={starPoints(x, y, 0.75)} fill="#FFFFFF" />
      ))}
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
