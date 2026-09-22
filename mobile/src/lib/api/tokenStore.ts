import * as SecureStore from 'expo-secure-store';

/**
 * Nơi lưu duy nhất của cặp token:
 *  - accessToken: chỉ trong bộ nhớ (memory). Mất khi app khởi động lại --
 *    khôi phục bằng refresh token lúc mở app.
 *  - refreshToken: expo-secure-store (Keychain/Keystore mã hoá), KHÔNG dùng
 *    AsyncStorage -- AsyncStorage không mã hoá, không phù hợp cho token có
 *    thể dùng lại tới REFRESH_TTL_DAYS (mặc định 30 ngày).
 */
const REFRESH_TOKEN_KEY = 'bt_refresh_token';

let accessTokenInMemory: string | null = null;

export function getAccessToken(): string | null {
  return accessTokenInMemory;
}

export function setAccessToken(token: string | null): void {
  accessTokenInMemory = token;
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setRefreshToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  } catch {
    // Bỏ qua lỗi ghi secure-store -- người dùng sẽ phải đăng nhập lại ở lần mở app kế tiếp,
    // không chặn luồng đăng nhập hiện tại.
  }
}

export async function clearTokens(): Promise<void> {
  accessTokenInMemory = null;
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    // bỏ qua
  }
}
