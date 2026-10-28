type MapsExtra = { androidMapsConfigured?: unknown; iosGoogleMapsConfigured?: unknown };

export const MAP_STARTUP_TIMEOUT_MS = 20000;

// Expo Go dùng binary của Expo; key dự án chỉ có tác dụng sau native rebuild.
export function mapRuntime(platform: string, environment: string | undefined, extra?: MapsExtra) {
  const expoGo = environment === 'storeClient';
  if (platform === 'android') return { available: expoGo || extra?.androidMapsConfigured === true, google: true };
  if (platform === 'ios') return { available: true, google: !expoGo && extra?.iosGoogleMapsConfigured === true };
  return { available: false, google: false };
}

// Nguồn bản đồ: 'osm' vẽ OpenStreetMap bằng Leaflet trong WebView (không cần key Google, không phụ thuộc
// thư viện bản đồ native), 'native' dùng MapView của Google/Apple. Mặc định 'auto' chọn OSM ở Expo Go
// Android: Expo Go không dùng được key Google của dự án và MapView có thể chỉ hiện nền trống (đã gặp trên
// LDPlayer dù Internet bình thường). Ép bằng EXPO_PUBLIC_MAP_TILES=osm|native.
// Khi bản đồ native không dùng được (thiếu key Google Android, BUG-08) tự rơi về OSM thay vì màn "chưa cấu hình".
export function mapTiles(
  platform: string,
  environment: string | undefined,
  preference?: string,
  nativeAvailable = true,
): 'osm' | 'native' {
  if (preference === 'osm' || preference === 'native') return preference;
  if (!nativeAvailable) return 'osm';
  return platform === 'android' && environment === 'storeClient' ? 'osm' : 'native';
}

// Máy chủ ô công cộng của OSM có chính sách sử dụng: khi ra sản phẩm thật hãy trỏ sang nhà cung cấp ô riêng.
export const OSM_TILE_URL = process.env.EXPO_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_MAX_ZOOM = 19;
// Máy chủ ô OSM yêu cầu Referer nhận diện được ứng dụng (không có Referer sẽ bị chặn). Đặt địa chỉ trang
// của chính sản phẩm khi ra mắt qua EXPO_PUBLIC_MAP_REFERER.
export const OSM_REFERER = process.env.EXPO_PUBLIC_MAP_REFERER || 'https://github.com/Phongxuan123/BeTravel';
