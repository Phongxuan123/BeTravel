import * as SecureStore from 'expo-secure-store';

/**
 * Token store cho mobile:
 *
 * - access token: chỉ nằm trong RAM.
 * - refresh token khi rememberMe=true: RAM + SecureStore.
 * - refresh token khi rememberMe=false: chỉ nằm trong RAM.
 *
 * Nhờ vậy:
 * - bỏ chọn "Ghi nhớ đăng nhập" vẫn cho phép refresh access token trong lúc app
 *   đang mở, nhưng đóng app là phiên biến mất;
 * - chọn "Ghi nhớ đăng nhập" cho phép khôi phục phiên sau khi mở lại app.
 */
const REFRESH_TOKEN_KEY = 'bt_refresh_token';

let accessTokenInMemory: string | null = null;
let refreshTokenInMemory: string | null = null;
let persistRefreshTokenInMemory = false;

export function getAccessToken(): string | null {
  return accessTokenInMemory;
}

export function setAccessToken(token: string | null): void {
  accessTokenInMemory = token;
}

/**
 * Lấy refresh token.
 *
 * Nếu RAM chưa có token (ví dụ app vừa khởi động lại), thử đọc SecureStore.
 * Khi đọc được từ SecureStore, đánh dấu phiên này là persistent để những lần
 * refresh token tiếp theo tiếp tục được ghi lại an toàn.
 */
export async function getRefreshToken(): Promise<string | null> {
  if (refreshTokenInMemory) {
    return refreshTokenInMemory;
  }

  try {
    const stored = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

    if (stored) {
      refreshTokenInMemory = stored;
      persistRefreshTokenInMemory = true;
    }

    return stored;
  } catch (error) {
    if (__DEV__) {
      console.warn('[auth] Không đọc được refresh token từ SecureStore', error);
    }
    return null;
  }
}

/**
 * Lưu refresh token mới.
 *
 * persist:
 * - true  -> ghi SecureStore (rememberMe=true)
 * - false -> chỉ RAM và xóa token persistent cũ
 * - bỏ qua -> giữ nguyên chế độ persistence của phiên hiện tại. Trường hợp này
 *   được dùng khi backend xoay vòng refresh token.
 */
export async function setRefreshToken(token: string, persist?: boolean): Promise<void> {
  const shouldPersist = persist ?? persistRefreshTokenInMemory;

  refreshTokenInMemory = token;
  persistRefreshTokenInMemory = shouldPersist;

  try {
    if (shouldPersist) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    } else {
      // Quan trọng: nếu trước đó user từng chọn Remember Me, token cũ không được
      // phép sống tiếp khi lần đăng nhập mới đã bỏ chọn Remember Me.
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[auth] Không cập nhật được refresh token trong SecureStore', error);
    }
  }
}

/** Xóa toàn bộ phiên ở cả RAM lẫn SecureStore. */
export async function clearTokens(): Promise<void> {
  accessTokenInMemory = null;
  refreshTokenInMemory = null;
  persistRefreshTokenInMemory = false;

  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    if (__DEV__) {
      console.warn('[auth] Không xóa được refresh token trong SecureStore', error);
    }
  }
}
