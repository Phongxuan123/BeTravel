import { useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/lib/theme';

// Khuyết cong ở giữa thanh điều hướng để nút SOS "ngồi" vào, giống thanh tab có nút giữa nhô lên.
export const NOTCH_HALF_WIDTH = 58;
export const NOTCH_DEPTH = 40;
// Độ lệch điều khiển của đường cong: càng gần NOTCH_HALF_WIDTH thì mép khuyết càng thoai thoải.
const NOTCH_CURVE_OFFSET = 38;
const NOTCH_BOTTOM_CURVE_OFFSET = 40;

// Đường viền trên có khuyết, đi từ mép trái sang mép phải; dùng cho cả nét viền lẫn vùng tô.
export function navBarTopEdgePath(width: number): string {
  const centerX = width / 2;
  const left = centerX - NOTCH_HALF_WIDTH;
  const right = centerX + NOTCH_HALF_WIDTH;
  return (
    `M0,0 H${left} ` +
    `C${centerX - NOTCH_CURVE_OFFSET},0 ${centerX - NOTCH_BOTTOM_CURVE_OFFSET},${NOTCH_DEPTH} ${centerX},${NOTCH_DEPTH} ` +
    `C${centerX + NOTCH_BOTTOM_CURVE_OFFSET},${NOTCH_DEPTH} ${centerX + NOTCH_CURVE_OFFSET},0 ${right},0 ` +
    `H${width}`
  );
}

export function NavBarBackground({ height }: { height: number }) {
  const { width } = useWindowDimensions();
  const edge = navBarTopEdgePath(width);
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      <Path d={`${edge} V${height} H0 Z`} fill={colors.surface} />
      <Path d={edge} fill="none" stroke={colors.line} strokeWidth={1} />
    </Svg>
  );
}
