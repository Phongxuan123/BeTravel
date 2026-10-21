import { useMemo } from 'react';
import { PanResponder } from 'react-native';

// Quãng vuốt tối thiểu (dp) để tính là vuốt lên/xuống; nhỏ hơn thì coi như chạm.
const SWIPE_DISTANCE = 28;
// Chỉ nhận cử chỉ khi vuốt dọc rõ rệt để không tranh với chạm và cuộn ngang.
const MOVE_START = 8;

// Vuốt lên để mở, vuốt xuống để đóng danh sách phía dưới bản đồ. Gắn panHandlers vào thanh kéo và tiêu đề của danh sách.
export function useSheetSwipe(onSwipeUp: () => void, onSwipeDown: () => void) {
  return useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dy) > MOVE_START && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dy <= -SWIPE_DISTANCE) onSwipeUp();
          else if (gesture.dy >= SWIPE_DISTANCE) onSwipeDown();
        },
      }).panHandlers,
    [onSwipeUp, onSwipeDown],
  );
}
