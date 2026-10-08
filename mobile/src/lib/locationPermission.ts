import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { validCoordinates } from '@/features/sos/mapHelpers';
import { isFreshLocation } from '@/features/sos/locationShare';

const GPS_TIMEOUT_MS = 15_000;
// Vị trí máy đã biết gần đây vẫn đủ để tìm điểm hỗ trợ quanh đó (không dùng cho chia sẻ vị trí,
// màn đó có ngưỡng 60 giây riêng).
const LAST_KNOWN_MAX_AGE_MS = 5 * 60_000;

export type LocationFailure = 'declined' | 'denied' | 'services-off' | 'unavailable';

export const LOCATION_FAILURE_MESSAGES: Record<Exclude<LocationFailure, 'declined'>, string> = {
  denied: 'Be.Travel chưa được cấp quyền vị trí. Bạn có thể bật trong Cài đặt điện thoại.',
  'services-off': 'Dịch vụ vị trí (GPS) đang tắt. Hãy bật trong Cài đặt điện thoại rồi thử lại.',
  unavailable: 'GPS chưa trả vị trí sau 15 giây. Hãy ra nơi thoáng hơn rồi thử lại.',
};

export type LocationResult =
  | { coords: Location.LocationObjectCoords; failure: null }
  | { coords: null; failure: LocationFailure };

const failed = (failure: LocationFailure): LocationResult => ({ coords: null, failure });

// Native GPS có thể chờ rất lâu trong nhà; giải phóng giao diện sau 15 giây.
async function readFreshPosition(): Promise<Location.LocationObject> {
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

function freshCoords(position: Location.LocationObject) {
  const { latitude, longitude } = position.coords;
  const fresh = isFreshLocation({ ...position.coords, timestamp: position.timestamp });
  return validCoordinates(latitude, longitude) && fresh ? position.coords : null;
}

function recentCoords(position: Location.LocationObject | null) {
  if (!position) return null;
  const { latitude, longitude } = position.coords;
  const recent = Date.now() - position.timestamp <= LAST_KNOWN_MAX_AGE_MS;
  return validCoordinates(latitude, longitude) && recent ? position.coords : null;
}

// Trong nhà GPS hay không trả kịp: dùng vị trí máy đã biết gần đây thay vì báo thất bại ngay.
async function readPositionWithFallback(): Promise<Location.LocationObjectCoords | null> {
  try {
    const coords = freshCoords(await readFreshPosition());
    if (coords) return coords;
  } catch {
    // Hết giờ hoặc lỗi native: thử vị trí đã biết ngay bên dưới.
  }
  try {
    return recentCoords(await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS }));
  } catch {
    return null;
  }
}

function explainBeforeAsking(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
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
}

/**
 * Xin quyền vị trí kèm GIẢI THÍCH RÕ trước khi bật hộp thoại hệ thống (CLAUDE.md B6 mục 5 --
 * không xin ngay lúc vào màn hình), rồi đọc vị trí. Trả về lý do thất bại để màn hình báo
 * đúng cho người dùng thay vì im lặng (lỗi B07).
 */
export async function requestLocationDetailed(): Promise<LocationResult> {
  try {
    const existing = await Location.getForegroundPermissionsAsync();
    const granted = existing.status === 'granted';
    if (!granted && !existing.canAskAgain) return failed('denied');
    if (!granted && !(await explainBeforeAsking())) return failed('declined');

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return failed('denied');
    if (!await Location.hasServicesEnabledAsync()) return failed('services-off');

    const coords = await readPositionWithFallback();
    return coords ? { coords, failure: null } : failed('unavailable');
  } catch {
    return failed('unavailable');
  }
}

/**
 * Như requestLocationDetailed nhưng chỉ trả toạ độ hoặc `null` -- màn hình gọi hàm này phải tự
 * lo phương án dự phòng (ví dụ dùng toàn bộ danh sách theo quốc gia thay vì theo khoảng cách).
 */
export async function requestLocationWithExplanation(): Promise<Location.LocationObjectCoords | null> {
  return (await requestLocationDetailed()).coords;
}
