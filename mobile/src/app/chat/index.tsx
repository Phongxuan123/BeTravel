import ChatScreen from '@/features/chat/ChatScreen';
import { AiLockedScreen } from '@/features/chat/AiLockedScreen';

// Be.Travel AI mở mặc định; đặt EXPO_PUBLIC_AI_CHAT_ENABLED=false để khóa nhanh (màn chờ) khi sự cố.
export default function ChatRoute() {
  const aiChatEnabled = process.env.EXPO_PUBLIC_AI_CHAT_ENABLED !== 'false';
  return aiChatEnabled ? <ChatScreen /> : <AiLockedScreen />;
}
