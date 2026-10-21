import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder } from 'react-native';

// Chỉ nhận cử chỉ khi vuốt dọc rõ rệt để không tranh với chạm và cuộn ngang.
const MOVE_START = 6;
// Kéo quá quãng này (dp) hoặc đủ nhanh thì thả tay là đổi trạng thái; chưa tới thì bật về chỗ cũ.
const COMMIT_DISTANCE = 60;
const COMMIT_VELOCITY = 0.6;
// Quãng trượt khi danh sách biến mất / hiện ra.
const SLIDE_DISTANCE = 360;
const SLIDE_MS = 160;

// Danh sách phía dưới bản đồ đi theo ngón tay: kéo xuống để ẩn, kéo lên để hiện.
// Gắn panHandlers vào thanh kéo/tiêu đề (khi đang mở) hoặc vùng thanh kéo (khi đang ẩn), style translateY vào khối được kéo.
export function useSheetDrag(isOpen: boolean, onOpen: () => void, onClose: () => void) {
  const [translateY] = useState(() => new Animated.Value(0));
  // PanResponder tạo một lần nên đọc trạng thái mới nhất qua ref.
  const latestRef = useRef({ isOpen, onOpen, onClose });
  useEffect(() => {
    latestRef.current = { isOpen, onOpen, onClose };
  }, [isOpen, onOpen, onClose]);

  // Các callback chỉ đọc ref khi người dùng kéo (không phải lúc render); luật refs của React Compiler báo nhầm chỗ này.
  // eslint-disable-next-line react-hooks/refs
  const [panHandlers] = useState(() => {
    const settle = (toValue: number, done?: () => void) =>
      Animated.timing(translateY, { toValue, duration: SLIDE_MS, useNativeDriver: true }).start(() => {
        done?.();
        translateY.setValue(0);
      });

    return PanResponder.create({
      // Capture: nhận cử chỉ trước các nút con (thanh kéo là Pressable sẽ giữ cử chỉ nếu không chặn trước).
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        Math.abs(gesture.dy) > MOVE_START && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_event, gesture) => {
        // Mở: chỉ cho kéo xuống. Ẩn: chỉ cho kéo lên.
        const dy = latestRef.current.isOpen ? Math.max(0, gesture.dy) : Math.min(0, gesture.dy);
        translateY.setValue(dy);
      },
      onPanResponderRelease: (_event, gesture) => {
        const { isOpen: open, onOpen: openSheet, onClose: closeSheet } = latestRef.current;
        const travelled = open ? gesture.dy : -gesture.dy;
        const speed = open ? gesture.vy : -gesture.vy;
        const commit = travelled >= COMMIT_DISTANCE || speed >= COMMIT_VELOCITY;
        if (!commit) return settle(0);
        if (open) settle(SLIDE_DISTANCE, closeSheet);
        else {
          openSheet();
          translateY.setValue(0);
        }
      },
      onPanResponderTerminate: () => settle(0),
    }).panHandlers;
  });

  return { panHandlers, translateY };
}
