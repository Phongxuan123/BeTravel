import { View, Text } from 'react-native';
import { router, type ErrorBoundaryProps } from 'expo-router';
import { TriangleAlert } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { colors } from '@/lib/theme';

/*
 * Man loi cap route (Expo Router boc moi route bang Error Boundary khi layout
 * export `ErrorBoundary`). Mot man hinh loi render khong duoc keo sap ca app,
 * va nguoi dung dang gap su co van phai toi duoc SOS. Khong hien error.message:
 * thong diep ky thuat tieng Anh vo nghia voi nguoi dung, co the lo chi tiet noi bo.
 */
export function RouteErrorFallback({ retry }: ErrorBoundaryProps) {
  return (
    <View className="flex-1 items-center justify-center bg-bg px-8" style={{ gap: 12 }}>
      <TriangleAlert size={40} color={colors.warning} />
      <Text className="text-center text-lg font-body-bold text-ink">Màn hình này gặp lỗi</Text>
      <Text className="text-center text-base text-muted">Bạn có thể thử lại. Nếu đang cần hỗ trợ gấp, mở SOS ngay.</Text>
      <View className="w-full" style={{ gap: 8 }}>
        <Button label="Thử lại" onPress={() => void retry()} />
        <Button label="Mở SOS khẩn cấp" variant="secondary" onPress={() => router.push('/sos')} />
      </View>
    </View>
  );
}
