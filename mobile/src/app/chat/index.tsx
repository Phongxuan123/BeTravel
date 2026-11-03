import { AiLockedScreen } from '@/features/chat/AiLockedScreen';
import { AssistantChatScreen } from '@/features/chat/AssistantChatScreen';

/*
 * R10 (docs/AI_V2_PLAN.md): chủ dự án đã thử và mở cho nhóm + người dùng thử ngày 03/11/2026,
 * nên mặc định bật. Đặt EXPO_PUBLIC_ASSISTANT_ENABLED=false để quay về màn chờ.
 */
const ASSISTANT_ENABLED = process.env.EXPO_PUBLIC_ASSISTANT_ENABLED !== 'false';

export default function ChatRoute() {
  return ASSISTANT_ENABLED ? <AssistantChatScreen /> : <AiLockedScreen />;
}
