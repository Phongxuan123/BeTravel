import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';

/**
 * Chiều cao bàn phím đang mở (0 khi đóng), tính từ đáy màn hình. Expo SDK 57 chạy edge-to-edge nên
 * Android không còn tự co cửa sổ (adjustResize), bàn phím sẽ che ô nhập nếu màn không tự nhường chỗ
 * (BUG-18). Dùng hook này thay vì thêm thư viện native để khỏi phải build lại dev client.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => {
      // Tính theo vị trí đỉnh bàn phím so với đáy màn hình thật: endCoordinates.height không gồm vùng
      // thanh điều hướng hệ thống trên Android edge-to-edge nên thiếu vài chục px.
      const overlap = Dimensions.get('screen').height - event.endCoordinates.screenY;
      setInset(Math.max(event.endCoordinates.height, overlap));
    });
    const hide = Keyboard.addListener(hideEvent, () => setInset(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return inset;
}
