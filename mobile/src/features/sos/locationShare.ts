export const MAX_LOCATION_AGE_MS = 60_000;
export type LocationSnapshot = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
};

export function isFreshLocation(location: LocationSnapshot, now = Date.now()) {
  return Number.isFinite(location.timestamp) && now - location.timestamp >= -5000 &&
    now - location.timestamp <= MAX_LOCATION_AGE_MS;
}

export function buildLocationMessage(location: LocationSnapshot, now = Date.now()) {
  const { latitude, longitude, accuracy, timestamp } = location;
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
      !Number.isFinite(longitude) || Math.abs(longitude) > 180 || !isFreshLocation(location, now)) {
    throw new Error('Vị trí không hợp lệ hoặc đã quá 60 giây. Hãy lấy lại vị trí.');
  }
  const precision = accuracy !== null && Number.isFinite(accuracy) && accuracy >= 0
    ? `Sai số GPS ước tính: ${Math.ceil(accuracy)} m.` : 'Chưa xác định được sai số GPS.';
  const coordinates = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  return [
    'Tôi chia sẻ vị trí của mình qua BeTravel.',
    `Thời điểm: ${formatShareTime(timestamp)}.`,
    `Tọa độ: ${coordinates}.`, precision,
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}`,
    'Đây là vị trí tại thời điểm đo, không cập nhật trực tiếp.',
  ].join('\n');
}

// "HH:mm dd/MM/yyyy (giờ máy, UTC±h)" dễ đọc hơn ISO 8601 (V-04); giữ thêm UTC để người nhận đối chiếu.
function formatShareTime(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const offset = `UTC${sign}${pad(Math.floor(Math.abs(offsetMinutes) / 60))}:${pad(Math.abs(offsetMinutes) % 60)}`;
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} (giờ máy, ${offset})`;
}
