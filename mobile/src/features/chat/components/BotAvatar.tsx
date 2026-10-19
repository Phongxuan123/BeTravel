import { View } from 'react-native';
import { Bot, TriangleAlert } from 'lucide-react-native';
import { colors } from '@/lib/theme';

type Props = {
  size?: number;
  // warning: câu trả lời "chưa đủ dữ liệu" -- đổi sang tông vàng để không giống câu trả lời có nguồn.
  tone?: 'brand' | 'warning';
};

const ICON_RATIO = 0.55;

// Avatar trợ lý: khối bo góc xanh, icon robot trắng (theo mẫu thiết kế Be.Travel AI).
export function BotAvatar({ size = 36, tone = 'brand' }: Props) {
  const isWarning = tone === 'warning';
  const iconSize = Math.round(size * ICON_RATIO);
  return (
    <View
      className={`items-center justify-center ${isWarning ? 'bg-warning-soft' : 'bg-primary'}`}
      style={{ width: size, height: size, borderRadius: size * 0.32 }}
    >
      {isWarning ? <TriangleAlert size={iconSize} color={colors.warning} /> : <Bot size={iconSize} color="#fff" />}
    </View>
  );
}
