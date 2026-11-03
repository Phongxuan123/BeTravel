/**
 * Trợ lý AI bản 2 (/api/assistant/*, contracts/README.md mục 25). Câu trả lời trả một lần,
 * không streaming (CLAUDE.md Phần 6); nhãn nguồn và trích dẫn do backend gán bằng code.
 */
import { z } from 'zod';
import { apiRequest } from './http';

// Câu trả lời mất 6-15 giây (đã đo 03/11/2026); chờ đủ lâu trước khi coi là mất mạng.
const ASSISTANT_TIMEOUT_MS = 60_000;

export const assistantCitationSchema = z.object({
  n: z.number(),
  title: z.string(),
  url: z.string(),
  authority: z.string(),
  articleSlug: z.string(),
});

export const assistantMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  kind: z.enum(['answer', 'emergency', 'clarify', 'refuse_scope', 'refuse_harm']).nullable(),
  sourceTier: z.enum(['official', 'web', 'general']).nullable(),
  citations: z.array(assistantCitationSchema),
  clarifyOptions: z.array(z.string()),
  emergencyNumber: z.string().nullable(),
  detailed: z.boolean(),
  tripContext: z.string().nullable(),
  createdAt: z.string(),
});

export const assistantConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  countryCode: z.string(),
  updatedAt: z.string(),
});

export const sendAssistantResponseSchema = z.object({
  conversation: assistantConversationSchema,
  userMessage: assistantMessageSchema,
  message: assistantMessageSchema,
});

export type AssistantCitation = z.infer<typeof assistantCitationSchema>;
export type AssistantMessage = z.infer<typeof assistantMessageSchema>;
export type AssistantConversation = z.infer<typeof assistantConversationSchema>;
export type SendAssistantResponse = z.infer<typeof sendAssistantResponseSchema>;
export type AssistantTrip = { city?: string; startDate?: string; endDate?: string };

export function sendAssistantMessage(input: {
  countryCode: string;
  message: string;
  conversationId?: string;
  trip?: AssistantTrip;
}): Promise<SendAssistantResponse> {
  return apiRequest<SendAssistantResponse>('/assistant/messages', {
    method: 'POST',
    body: input,
    timeoutMs: ASSISTANT_TIMEOUT_MS,
  });
}

// Trả lời lại hoặc "Giải thích chi tiết hơn": backend ghi đè cùng id tin nhắn.
export async function regenerateAssistantMessage(
  messageId: string,
  detailed: boolean,
): Promise<AssistantMessage> {
  const result = await apiRequest<{ message: AssistantMessage }>(
    `/assistant/messages/${encodeURIComponent(messageId)}/regenerate`,
    { method: 'POST', body: { detailed }, timeoutMs: ASSISTANT_TIMEOUT_MS },
  );
  return result.message;
}

export function listAssistantConversations(): Promise<AssistantConversation[]> {
  return apiRequest<AssistantConversation[]>('/assistant/conversations');
}

export function getAssistantConversation(
  conversationId: string,
): Promise<AssistantConversation & { messages: AssistantMessage[] }> {
  return apiRequest(`/assistant/conversations/${encodeURIComponent(conversationId)}`);
}

export function deleteAssistantConversation(conversationId: string): Promise<{ deleted: true }> {
  return apiRequest(`/assistant/conversations/${encodeURIComponent(conversationId)}`, {
    method: 'DELETE',
  });
}

export function deleteAllAssistantConversations(): Promise<{ deleted: true }> {
  return apiRequest('/assistant/conversations', { method: 'DELETE' });
}
