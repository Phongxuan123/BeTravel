/**
 * Nối màn hình chat (mobile/src/app/chat/index.tsx) vào RAG thật (B5). CÙNG
 * kiểu trả về ChatAnswer như mocks/client.ts -- xem lib/data.ts cho công tắc
 * mock/thật.
 *
 * Quản lý session: mỗi lần đổi quốc gia hoặc bấm "Cuộc trò chuyện mới" thì tạo
 * session mới; các câu hỏi tiếp theo trong cùng lượt mở màn hình dùng lại
 * session đó để backend giữ được lịch sử hội thoại theo đúng thiết kế server.
 */
import { apiRequest } from './http';
import type { ChatAnswer } from '@/mocks/client';

export type ChatSession = { _id: string; countryCode: string; title: string; updatedAt: string };

type ApiCitation = { marker: string; articleId: string; articleSlug: string; title: string; heading: string };
type ApiChatMessage = {
  _id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  text: string;
  citations: ApiCitation[];
  retrieval: { topScore: number; chunkIds: string[]; passed: boolean };
  fallbackReason: string | null;
  confidence: 'high' | 'medium' | 'low' | null;
  feedback: 'up' | 'down' | null;
  createdAt: string;
};

export type ChatUiMessage = {
  _id: string;
  role: 'user' | 'assistant';
  text: string;
  answer?: ChatAnswer;
  feedback?: 'up' | 'down' | null;
};

// Cắt khối disclaimer cố định mà backend gắn vào CUỐI câu trả lời thật
// (rag/guard.js#DEFAULT_DISCLAIMER) -- màn hình chat đã có disclaimer cố định
// riêng ở chân khung chat (spec B5 mục 5), hiện cả hai sẽ bị trùng lặp.
export function stripTrailingDisclaimer(text: string): string {
  const marker = '\n\n---\n';
  const idx = text.indexOf(marker);
  return idx === -1 ? text : text.slice(0, idx);
}

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const INSUFFICIENT_EVIDENCE_SUGGESTIONS = [
  'Xem cẩm nang pháp lý của quốc gia đang chọn để tìm thông tin liên quan.',
  'Nếu cần hỗ trợ khẩn cấp, mở mục SOS hoặc liên hệ Đại sứ quán/Tổng lãnh sự quán Việt Nam.',
];

export function adaptMessage(message: ApiChatMessage, countryCode: string): ChatAnswer {
  if (message.fallbackReason) {
    return { status: 'insufficient_evidence', reason: message.text, suggestions: INSUFFICIENT_EVIDENCE_SUGGESTIONS };
  }
  return {
    status: 'answered',
    updatedAt: formatUpdatedAt(message.createdAt),
    content: stripTrailingDisclaimer(message.text),
    sources: message.citations.map((c) => ({
      name: c.heading ? `${c.title} — ${c.heading}` : c.title,
      url: '',
      marker: c.marker,
      articleSlug: c.articleSlug,
      countryCode,
    })),
  };
}

let activeSessionId: string | null = null;
let activeSessionCountry: string | null = null;
let lastMessageId: string | null = null;

/**
 * askLegalAssistant() phải trả đúng Promise<ChatAnswer> (spec B5 mục 1) nên
 * không thể mang theo sessionId/messageId trong return value -- màn hình chat
 * cần 2 id này để gọi feedback/report, đọc qua 2 getter dưới đây NGAY SAU khi
 * askLegalAssistant() resolve (an toàn vì mỗi lượt hỏi luôn await tuần tự,
 * input bị khoá trong lúc chờ -- xem chat/index.tsx).
 */
export function getActiveSessionId(): string | null {
  return activeSessionId;
}

export function getLastMessageId(): string | null {
  return lastMessageId;
}

async function ensureSession(countryCode: string): Promise<string> {
  if (activeSessionId && activeSessionCountry === countryCode) return activeSessionId;
  const session = await apiRequest<ChatSession>('/chat/sessions', { method: 'POST', body: { countryCode } });
  activeSessionId = session._id;
  activeSessionCountry = countryCode;
  return session._id;
}

/** Bắt đầu hẳn một phiên mới -- dùng cho nút "Cuộc trò chuyện mới". */
export function startNewSession(): void {
  activeSessionId = null;
  activeSessionCountry = null;
}

/** Chuyển sang một session đã có (chọn từ danh sách lịch sử). */
export function setActiveSession(sessionId: string, countryCode: string): void {
  activeSessionId = sessionId;
  activeSessionCountry = countryCode;
}

export async function askLegalAssistant(
  question: string,
  opts?: { countryCode?: string; focusArticleId?: string },
): Promise<ChatAnswer> {
  const countryCode = opts?.countryCode;
  if (!countryCode) {
    throw new Error('askLegalAssistant (API thật) cần countryCode -- kiểm tra chat/index.tsx');
  }
  const sessionId = await ensureSession(countryCode);
  const res = await apiRequest<{ sessionId: string; message: ApiChatMessage }>(`/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: { question, focusArticleId: opts?.focusArticleId },
  });
  lastMessageId = res.message._id;
  return adaptMessage(res.message, countryCode);
}

export async function listChatSessions(): Promise<{ ok: true; data: ChatSession[] }> {
  const data = await apiRequest<ChatSession[]>('/chat/sessions');
  return { ok: true, data };
}

export async function createChatSession(countryCode: string): Promise<{ ok: true; data: ChatSession }> {
  const data = await apiRequest<ChatSession>('/chat/sessions', { method: 'POST', body: { countryCode } });
  activeSessionId = data._id;
  activeSessionCountry = countryCode;
  return { ok: true, data };
}

export async function deleteChatSession(id: string): Promise<{ ok: true; data: { deleted: true } }> {
  const data = await apiRequest<{ deleted: true }>(`/chat/sessions/${id}`, { method: 'DELETE' });
  if (activeSessionId === id) startNewSession();
  return { ok: true, data };
}

export async function renameChatSession(id: string, title: string): Promise<{ ok: true; data: ChatSession }> {
  const data = await apiRequest<ChatSession>(`/chat/sessions/${id}`, { method: 'PATCH', body: { title } });
  return { ok: true, data };
}

export async function loadChatSessionMessages(
  sessionId: string,
  countryCode: string,
): Promise<{ ok: true; data: ChatUiMessage[] }> {
  const messages = await apiRequest<ApiChatMessage[]>(`/chat/sessions/${sessionId}/messages`);
  const data: ChatUiMessage[] = messages.map((m) =>
    m.role === 'user'
      ? { _id: m._id, role: 'user', text: m.text }
      : { _id: m._id, role: 'assistant', text: m.text, answer: adaptMessage(m, countryCode), feedback: m.feedback },
  );
  return { ok: true, data };
}

export async function setChatMessageFeedback(
  sessionId: string,
  messageId: string,
  feedback: 'up' | 'down',
): Promise<{ ok: true; data: { ok: true } }> {
  await apiRequest(`/chat/sessions/${sessionId}/messages/${messageId}/feedback`, { method: 'POST', body: { feedback } });
  return { ok: true, data: { ok: true } };
}
