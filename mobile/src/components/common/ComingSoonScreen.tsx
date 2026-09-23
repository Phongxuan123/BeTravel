import { View, Text } from 'react-native';
import { Wrench } from 'lucide-react-native';
import { PageHeader } from './PageHeader';
import { colors } from '@/lib/theme';

const DEFAULT_MESSAGE = 'Tính năng đang trong quá trình nâng cấp và hoàn thiện.';

/*
 * Màn chặn dùng chung cho MỌI tính năng chưa triển khai xong -- thay cho
 * Alert.alert rời rạc trước đây. Mục đích: người dùng/QA bấm vào biết ngay
 * đây là chỗ CHƯA XONG (không phải nút chết/lỗi), không lẫn với tính năng đã
 * hoàn thiện. Dùng qua route dùng chung `app/coming-soon.tsx`, không tạo màn
 * hình riêng cho từng tính năng.
 */
export function ComingSoonScreen({ title, detail }: { title: string; detail?: string }) {
  return (
    <View className="flex-1 bg-surface">
      <PageHeader title={title} />
      <View className="flex-1 items-center justify-center px-8">
        <View
          className="mb-6 items-center justify-center rounded-full"
          style={{ width: 96, height: 96, backgroundColor: colors.primarySoft }}
        >
          <Wrench size={40} color={colors.primary} />
        </View>
        <Text className="text-center text-lg font-body-bold text-ink">{DEFAULT_MESSAGE}</Text>
        {detail && <Text className="mt-3 text-center text-sm text-muted">{detail}</Text>}
      </View>
    </View>
  );
}
