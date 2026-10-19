import { View, Text } from 'react-native';
import { Clock, RotateCcw } from 'lucide-react-native';
import { TopInsetView } from '@/components/common/screenTopInset';
import { IconButton } from '@/components/ui/IconButton';
import { colors } from '@/lib/theme';
import { BotAvatar } from './BotAvatar';

type Props = {
  countryName?: string;
  onOpenHistory: () => void;
  onNewConversation: () => void;
};

/*
 * Header của Be.Travel AI theo mẫu: avatar + tên + trạng thái "Đang trực tuyến" bên trái,
 * nút cuộc trò chuyện mới (và lịch sử phiên) bên phải. Quốc gia đang áp dụng luật nằm cùng dòng
 * trạng thái để người dùng luôn biết AI đang trả lời theo luật nước nào.
 */
export function ChatHeader({ countryName, onOpenHistory, onNewConversation }: Props) {
  return (
    <TopInsetView extra={12} className="border-b border-line bg-surface px-[18px] pb-3">
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <BotAvatar size={44} />
        <View className="flex-1">
          <Text className="font-display text-[18px] text-ink">Be.Travel AI</Text>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <View className="h-2 w-2 rounded-full bg-success" />
            <Text className="flex-shrink text-xs text-muted" numberOfLines={1}>
              Đang trực tuyến{countryName ? ` · Luật ${countryName}` : ''}
            </Text>
          </View>
        </View>
        <IconButton
          accessibilityLabel="Lịch sử phiên chat"
          variant="outline"
          icon={<Clock size={18} color={colors.ink} />}
          onPress={onOpenHistory}
        />
        <IconButton
          accessibilityLabel="Cuộc trò chuyện mới"
          variant="outline"
          icon={<RotateCcw size={18} color={colors.ink} />}
          onPress={onNewConversation}
        />
      </View>
    </TopInsetView>
  );
}
