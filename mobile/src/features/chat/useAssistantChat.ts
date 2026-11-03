import { useCallback, useRef, useState } from 'react';
import { ApiError } from '@/lib/api/http';
import type { AssistantMessage, AssistantTrip } from '@/lib/api/assistant';
import {
  getAssistantConversation,
  regenerateAssistantMessage,
  sendAssistantMessage,
} from '@/lib/data';

/*
 * Trạng thái một cuộc trò chuyện với trợ lý bản 2. Không streaming: gửi xong chờ một lần
 * (E2). Tin người dùng hiện ngay (lạc quan); lỗi thì gỡ tin đó và trả lại chữ vào ô nhập.
 */
export function assistantErrorText(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Có lỗi không mong muốn. Bạn thử lại nhé.';
  if (error.status === 0) return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
  switch (error.code) {
    case 'QUOTA_EXCEEDED':
      return 'Bạn đã dùng hết lượt hỏi hôm nay. Hãy quay lại vào ngày mai.';
    case 'RATE_LIMITED':
      return 'Bạn hỏi hơi nhanh. Đợi vài giây rồi thử lại.';
    case 'UNAUTHORIZED':
      return 'Phiên đăng nhập đã hết. Đăng nhập lại để tiếp tục.';
    case 'VALIDATION_ERROR':
      return 'Trợ lý chưa hỗ trợ quốc gia này hoặc câu hỏi chưa hợp lệ.';
    case 'NOT_FOUND':
      return 'Không tìm thấy cuộc trò chuyện này nữa.';
    default:
      return 'Trợ lý đang tạm ngưng hoặc gặp sự cố. Bạn thử lại sau ít phút.';
  }
}

const localId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const optimisticUserMessage = (content: string): AssistantMessage => ({
  id: localId(),
  role: 'user',
  content,
  kind: null,
  sourceTier: null,
  citations: [],
  clarifyOptions: [],
  emergencyNumber: null,
  detailed: false,
  tripContext: null,
  createdAt: new Date().toISOString(),
});

export function useAssistantChat(countryCode: string) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [busyMessageId, setBusyMessageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sendingRef = useRef(false);

  const send = useCallback(
    async (text: string, trip?: AssistantTrip): Promise<boolean> => {
      const message = text.trim();
      if (!message || sendingRef.current) return false;
      sendingRef.current = true;
      const pending = optimisticUserMessage(message);
      setMessages((current) => [...current, pending]);
      setSending(true);
      setError(null);
      try {
        const result = await sendAssistantMessage({
          countryCode,
          message,
          conversationId: conversationId ?? undefined,
          trip,
        });
        setConversationId(result.conversation.id);
        setMessages((current) => [
          ...current.filter((item) => item.id !== pending.id),
          result.userMessage,
          result.message,
        ]);
        return true;
      } catch (sendError) {
        setMessages((current) => current.filter((item) => item.id !== pending.id));
        setError(assistantErrorText(sendError));
        return false;
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [countryCode, conversationId],
  );

  const regenerate = useCallback(async (messageId: string, detailed: boolean) => {
    setBusyMessageId(messageId);
    setError(null);
    try {
      const updated = await regenerateAssistantMessage(messageId, detailed);
      setMessages((current) => current.map((item) => (item.id === messageId ? updated : item)));
    } catch (regenerateError) {
      setError(assistantErrorText(regenerateError));
    } finally {
      setBusyMessageId(null);
    }
  }, []);

  const openConversation = useCallback(async (id: string) => {
    setError(null);
    try {
      const conversation = await getAssistantConversation(id);
      setConversationId(conversation.id);
      setMessages(conversation.messages);
    } catch (openError) {
      setError(assistantErrorText(openError));
    }
  }, []);

  const startNew = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setError(null);
  }, []);

  return {
    conversationId,
    messages,
    sending,
    busyMessageId,
    error,
    send,
    regenerate,
    openConversation,
    startNew,
    clearError: () => setError(null),
  };
}
