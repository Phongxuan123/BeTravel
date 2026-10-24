import ChatScreen from '@/features/chat/ChatScreen';
import { AiLockedScreen } from '@/features/chat/AiLockedScreen';

// Be.Travel AI khóa mặc định (màn chờ); bật lại bằng EXPO_PUBLIC_AI_CHAT_ENABLED=true.
export default function ChatRoute() {
  const aiChatEnabled = process.env.EXPO_PUBLIC_AI_CHAT_ENABLED === 'true';
  return aiChatEnabled ? <ChatScreen /> : <AiLockedScreen />;
}
