/*
 * Trợ lý giả cho chế độ EXPO_PUBLIC_USE_MOCKS=true (đường lùi khi demo lỗi mạng). Không có câu trả
 * pháp lý nào ở đây: chỉ báo đang ở chế độ demo, đúng nguyên tắc không sinh dữ liệu luật giả.
 */
import type {
  AssistantConversation,
  AssistantMessage,
  SendAssistantResponse,
} from '@/lib/api/assistant';

const DEMO_CONVERSATION_ID = 'demo-conversation';
const conversations = new Map<string, { conversation: AssistantConversation; messages: AssistantMessage[] }>();
let counter = 0;

const baseMessage = (role: AssistantMessage['role'], content: string): AssistantMessage => {
  counter += 1;
  return {
    id: `demo-${counter}`,
    role,
    content,
    kind: role === 'assistant' ? 'answer' : null,
    sourceTier: role === 'assistant' ? 'general' : null,
    citations: [],
    clarifyOptions: [],
    emergencyNumber: null,
    detailed: false,
    tripContext: null,
    createdAt: new Date().toISOString(),
  };
};

const DEMO_REPLY =
  'Đang ở chế độ demo không kết nối máy chủ, nên trợ lý chưa trả lời thật được.\n' +
  '**Nên làm gì tiếp:** xem mục Cẩm nang hoặc mở SOS khi cần gấp.';

export async function sendAssistantMessage(input: {
  countryCode: string;
  message: string;
  conversationId?: string;
}): Promise<SendAssistantResponse> {
  const id = input.conversationId ?? DEMO_CONVERSATION_ID;
  const conversation = { id, title: input.message.slice(0, 60), countryCode: input.countryCode, updatedAt: new Date().toISOString() };
  const userMessage = baseMessage('user', input.message);
  const message = baseMessage('assistant', DEMO_REPLY);
  const stored = conversations.get(id)?.messages ?? [];
  conversations.set(id, { conversation, messages: [...stored, userMessage, message] });
  return { conversation, userMessage, message };
}

export async function regenerateAssistantMessage(messageId: string, detailed: boolean): Promise<AssistantMessage> {
  return { ...baseMessage('assistant', DEMO_REPLY), id: messageId, detailed };
}

export async function listAssistantConversations(): Promise<AssistantConversation[]> {
  return [...conversations.values()].map((item) => item.conversation);
}

export async function getAssistantConversation(id: string) {
  const stored = conversations.get(id);
  if (!stored) throw new Error('NOT_FOUND');
  return { ...stored.conversation, messages: stored.messages };
}

export async function deleteAssistantConversation(id: string): Promise<{ deleted: true }> {
  conversations.delete(id);
  return { deleted: true };
}

export async function deleteAllAssistantConversations(): Promise<{ deleted: true }> {
  conversations.clear();
  return { deleted: true };
}
