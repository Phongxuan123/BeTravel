import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { Bot, BookOpen, Phone } from 'lucide-react-native';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { colors } from '@/lib/theme';

/*
 * Màn chờ thay cho Be.Travel AI khi tính năng đang tạm khóa
 * (EXPO_PUBLIC_AI_CHAT_ENABLED khác 'true'). Mọi lối vào /chat (tab, Home,
 * Search, bài luật, sự cố) đều dừng ở đây; vẫn chỉ đường sang cẩm nang đã
 * xác minh và SOS để người dùng không bị bỏ rơi khi cần gấp.
 */
export function AiLockedScreen() {
  return (
    <View className="flex-1 bg-bg">
      <PageHeader title="Be.Travel AI" subtitle="Trợ lý pháp lý du lịch của bạn" />
      <View className="flex-1 items-center justify-center px-8">
        <View
          className="mb-6 items-center justify-center rounded-full"
          style={{ width: 96, height: 96, backgroundColor: colors.primarySoft }}
        >
          <Bot size={44} color={colors.primary} />
        </View>
        <View className="mb-3 rounded-full bg-warning-soft px-3 py-1">
          <Text className="text-xs font-body-bold text-warning-strong">Đang phát triển</Text>
        </View>
        <Text className="text-center font-display text-xl text-ink">Trợ lý AI sắp ra mắt</Text>
        <Text className="mt-3 text-center text-sm leading-relaxed text-muted">
          Chúng tôi đang hoàn thiện để mọi câu trả lời đều dựa trên nguồn đã kiểm chứng và luôn
          kèm trích dẫn. Trong lúc chờ, bạn có thể tra cứu cẩm nang hoặc mở hỗ trợ khẩn cấp.
        </Text>
        <View className="mt-6 w-full" style={{ gap: 10 }}>
          <Button
            label="Xem cẩm nang pháp lý"
            iconLeft={<BookOpen size={18} color="#fff" />}
            onPress={() => router.push('/explore')}
          />
          <Button
            label="Hỗ trợ khẩn cấp SOS"
            variant="secondary"
            iconLeft={<Phone size={18} color={colors.danger} />}
            onPress={() => router.push('/sos')}
          />
        </View>
      </View>
    </View>
  );
}
