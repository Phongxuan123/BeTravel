/**
 * Module feedback (B5) -- nút "Báo sai" trong AnswerCard.tsx. RIÊNG với
 * thumbs Hữu ích/Không hữu ích (chat.ts#setChatMessageFeedback, chỉ set field
 * nhanh trên ChatMessage) -- feedback ở đây có ghi chú, vào hàng đợi A08 cho
 * đội nội dung xem xét.
 */
import { apiRequest } from './http';

export async function reportWrongAnswer(input: {
  targetId: string;
  note: string;
  countryCode: string;
  question: string;
}): Promise<{ ok: true; data: { ok: true } }> {
  await apiRequest('/feedback', {
    method: 'POST',
    body: {
      targetType: 'chat_message',
      targetId: input.targetId,
      rating: 'down',
      note: input.note,
      context: { countryCode: input.countryCode, question: input.question },
    },
  });
  return { ok: true, data: { ok: true } };
}
