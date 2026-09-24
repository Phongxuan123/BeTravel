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

  if (existing.status !== 'granted' && !existing.canAskAgain) return null;
  if (existing.status !== 'granted' && existing.canAskAgain) {
    const proceed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Cho phép truy cập vị trí',
        'Be.Travel dùng vị trí của bạn để tìm đại sứ quán, bệnh viện, đồn công an GẦN NHẤT khi cần hỗ trợ khẩn cấp. Tọa độ được gửi tới máy chủ Be.Travel để tìm điểm gần bạn; ứng dụng không theo dõi vị trí nền.',
        [
          { text: 'Để sau', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Cho phép', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
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
