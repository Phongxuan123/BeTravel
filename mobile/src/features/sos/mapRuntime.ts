type MapsExtra = { androidMapsConfigured?: unknown; iosGoogleMapsConfigured?: unknown };

export const MAP_STARTUP_TIMEOUT_MS = 20000;

// Expo Go dùng binary của Expo; key dự án chỉ có tác dụng sau native rebuild.
export function mapRuntime(platform: string, environment: string | undefined, extra?: MapsExtra) {
  const expoGo = environment === 'storeClient';
  if (platform === 'android') return { available: expoGo || extra?.androidMapsConfigured === true, google: true };
  if (platform === 'ios') return { available: true, google: !expoGo && extra?.iosGoogleMapsConfigured === true };
  return { available: false, google: false };
}
