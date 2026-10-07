import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { validCoordinates } from '@/features/sos/mapHelpers';
import { isFreshLocation } from '@/features/sos/locationShare';

const GPS_TIMEOUT_MS = 15_000;

// Native GPS có thể chờ rất lâu trong nhà; giải phóng giao diện sau 15 giây.
async function readPosition(): Promise<Location.LocationObject> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('GPS timeout')), GPS_TIMEOUT_MS);
      }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
}

/**
 * Xin quyền vị trí kèm GIẢI THÍCH RÕ trước khi bật hộp thoại hệ thống (CLAUDE.md
 * B6 mục 5 -- không xin ngay lúc vào màn hình). Trả về toạ độ nếu người dùng
 * đồng ý, `null` nếu từ chối (màn hình gọi hàm này phải tự lo phương án dự
 * phòng, ví dụ dùng toàn bộ danh sách theo quốc gia thay vì theo khoảng cách).
 */
export async function requestLocationWithExplanation(): Promise<Location.LocationObjectCoords | null> {
  try {
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

    if (!await Location.hasServicesEnabledAsync()) return null;
    const position = await readPosition();
    return validCoordinates(position.coords.latitude, position.coords.longitude) &&
      isFreshLocation({ ...position.coords, timestamp: position.timestamp }) ? position.coords : null;
  } catch {
    return null;
  }
}
