/**
 * Noi luu token phia admin web:
 *  - accessToken: chi trong memory. Mat khi F5 -- khoi phuc bang refresh luc
 *    app khoi dong (giong mobile).
 *  - refreshToken: localStorage, CHI dung khi AUTH_TRANSPORT backend co 'body'
 *    (backend tra token trong response). Neu backend dung 'cookie', trinh
 *    duyet tu gui kem cookie httpOnly qua `credentials: 'include'`, khong can
 *    doc lai o day. Chap nhan rui ro localStorage (XSS) vi day la cong cu noi
 *    bo cho admin, khong phai app cong khai -- khac voi mobile bat buoc dung
 *    expo-secure-store.
 */
const REFRESH_TOKEN_KEY = 'bt_admin_refresh_token';

let accessTokenInMemory: string | null = null;

export function getAccessToken(): string | null {
  return accessTokenInMemory;
}

export function setAccessToken(token: string | null): void {
  accessTokenInMemory = token;
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setRefreshToken(token: string): void {
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch {
    // bo qua loi ghi storage (che do rieng tu / dung luong day)
  }
}

export function clearTokens(): void {
  accessTokenInMemory = null;
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // bo qua
  }
}
