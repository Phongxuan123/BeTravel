import { AiLockedScreen } from '@/features/chat/AiLockedScreen';
import { AssistantChatScreen } from '@/features/chat/AssistantChatScreen';

/*
 * R10 (docs/AI_V2_PLAN.md): màn chat bản 2 chỉ mở cho người dùng sau khi chủ dự án tự thử và
 * đồng ý. Trước đó bật bằng EXPO_PUBLIC_ASSISTANT_ENABLED=true trên máy thử; mặc định vẫn là màn chờ.
 */
const ASSISTANT_ENABLED = process.env.EXPO_PUBLIC_ASSISTANT_ENABLED === 'true';

export default function ChatRoute() {
  return ASSISTANT_ENABLED ? <AssistantChatScreen /> : <AiLockedScreen />;
}
