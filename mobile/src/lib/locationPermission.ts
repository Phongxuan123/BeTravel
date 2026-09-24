import { Alert } from 'react-native';
import * as Location from 'expo-location';

/**
 * Xin quyền vị trí kèm GIẢI THÍCH RÕ trước khi bật hộp thoại hệ thống (CLAUDE.md
 * B6 mục 5 -- không xin ngay lúc vào màn hình). Trả về toạ độ nếu người dùng
 * đồng ý, `null` nếu từ chối (màn hình gọi hàm này phải tự lo phương án dự
 * phòng, ví dụ dùng toàn bộ danh sách theo quốc gia thay vì theo khoảng cách).
 */
export async function requestLocationWithExplanation(): Promise<Location.LocationObjectCoords | null> {
  const existing = await Location.getForegroundPermissionsAsync();

  if (existing.status !== 'granted' && existing.canAskAgain) {
    const proceed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Cho phép truy cập vị trí',
        'Be.Travel dùng vị trí của bạn để tìm đại sứ quán, bệnh viện, đồn công an GẦN NHẤT khi cần hỗ trợ khẩn cấp. Vị trí không được gửi lên máy chủ hay lưu lại.',
        [
          { text: 'Để sau', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Cho phép', onPress: () => resolve(true) },
        ],
      );
    });
    if (!proceed) return null;
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  try {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return position.coords;
  } catch {
    return null;
  }
}
