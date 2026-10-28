import { router, type Href } from 'expo-router';

/**
 * Vào app sau khi đăng nhập/đăng ký: xoá cả chồng màn trước đó (welcome, login...) để nút Back ở
 * Home thoát app thay vì quay ngược lại từng màn của phiên (V-02).
 */
export function enterApp(target: Href): void {
  if (router.canDismiss()) router.dismissAll();
  router.replace(target);
}
