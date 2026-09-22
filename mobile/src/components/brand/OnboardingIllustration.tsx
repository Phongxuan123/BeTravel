import { View, Text } from 'react-native';
import Svg, { Circle, Ellipse } from 'react-native-svg';
import { ShieldCheck, Phone, MapPin, MessageCircle, FileCheck2 } from 'lucide-react-native';
import { colors } from '@/lib/theme';

// Minh hoạ vẽ lại đơn giản hoá bằng SVG/icon (spec mục 6.1) — không dùng ảnh ngoài.
export function OnboardingIllustration({ slide }: { slide: 1 | 2 | 3 | 4 }) {
  const size = 200;
  const bg = slide === 1 ? '#FFFFFF' : slide === 4 ? '#FBEDED' : colors.primarySoft;

  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: bg, borderWidth: slide === 1 ? 2 : 0, borderColor: '#DCE6F7' }}
    >
      {slide === 1 && (
        <View className="items-center justify-center">
          <Svg width={124} height={124} viewBox="0 0 124 124">
            <Circle cx={62} cy={62} r={54} stroke={colors.primary} strokeWidth={2.5} fill={colors.primarySoft} />
            <Ellipse cx={62} cy={62} rx={54} ry={20} stroke="#7DA3E6" strokeWidth={1.5} fill="none" />
            <Ellipse cx={62} cy={62} rx={20} ry={54} stroke="#7DA3E6" strokeWidth={1.5} fill="none" />
            <Circle cx={62} cy={62} r={54} stroke="#8FB1EA" strokeWidth={1} strokeDasharray="4 4" fill="none" />
          </Svg>
          <View className="absolute -right-1 -bottom-1 h-16 w-16 items-center justify-center rounded-full bg-white">
            <ShieldCheck color={colors.primary} size={30} />
          </View>
        </View>
      )}
      {slide === 2 && <FileCheck2 color={colors.primary} size={96} strokeWidth={1.5} />}
      {slide === 3 && <MessageCircle color={colors.primary} size={96} strokeWidth={1.5} />}
      {slide === 4 && (
        <View className="items-center justify-center">
          <View
            className="items-center justify-center rounded-full border-4 border-white"
            style={{ width: 108, height: 108, backgroundColor: colors.danger }}
          >
            <Text className="font-display text-white" style={{ fontSize: 26 }}>
              SOS
            </Text>
          </View>
          <View className="absolute" style={{ left: -20, top: 30 }}>
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white" style={{ borderWidth: 1, borderColor: '#DCE6F7' }}>
              <Phone color={colors.primary} size={18} />
            </View>
          </View>
          <View className="absolute" style={{ right: -20, top: -6 }}>
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white" style={{ borderWidth: 1, borderColor: '#DCE6F7' }}>
              <ShieldCheck color={colors.danger} size={18} />
            </View>
          </View>
          <View className="absolute" style={{ right: -14, bottom: -14 }}>
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white" style={{ borderWidth: 1, borderColor: '#DCE6F7' }}>
              <MapPin color={colors.success} size={18} />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
