import { adaptMessage, stripTrailingDisclaimer } from '../chat';

// adaptMessage()/stripTrailingDisclaimer() chuyen ChatMessage that (backend
// B4/B5) sang ChatAnswer man hinh dang dung -- logic thuan, tach test rieng
// khoi AnswerCard.test.tsx (chi test render).
describe('chat.ts adapter', () => {
  it('cat disclaimer co dinh o cuoi cau tra loi that (rag/guard.js#DEFAULT_DISCLAIMER)', () => {
    const withDisclaimer = 'Câu trả lời thật [S1].\n\n---\n⚠️ Thông tin dựa trên nguồn đã kiểm chứng...';
    expect(stripTrailingDisclaimer(withDisclaimer)).toBe('Câu trả lời thật [S1].');
  });

  it('khong doi gi neu khong co disclaimer (vi du fallback message)', () => {
    const noDisclaimer = 'Mình chưa có dữ liệu đã kiểm chứng đủ để trả lời chắc chắn câu hỏi này.';
    expect(stripTrailingDisclaimer(noDisclaimer)).toBe(noDisclaimer);
  });

  it('adaptMessage: fallbackReason != null -> insufficient_evidence, khong lo content', () => {
    const answer = adaptMessage(
      {
        _id: 'm1',
        sessionId: 's1',
        role: 'assistant',
        text: 'Chưa đủ dữ liệu.',
        citations: [],
        retrieval: { topScore: 0, chunkIds: [], passed: false },
        fallbackReason: 'INSUFFICIENT_EVIDENCE',
        confidence: 'low',
        feedback: null,
        createdAt: '2026-01-15T00:00:00.000Z',
      },
      'KR',
    );
    expect(answer.status).toBe('insufficient_evidence');
  });

  it('adaptMessage: fallbackReason null -> answered, map citations sang sources co marker+articleSlug bam duoc', () => {
    const answer = adaptMessage(
      {
        _id: 'm2',
        sessionId: 's1',
        role: 'assistant',
        text: 'Trả lời [S1].\n\n---\n⚠️ Disclaimer',
        citations: [{ marker: 'S1', articleId: 'a1', articleSlug: 'qua-han-luu-tru', title: 'Mức phạt quá hạn', heading: 'Mức phạt' }],
        retrieval: { topScore: 0.9, chunkIds: ['a1'], passed: true },
        fallbackReason: null,
        confidence: 'medium',
        feedback: null,
        createdAt: '2026-03-15T00:00:00.000Z',
      },
      'KR',
    );

    if (answer.status !== 'answered') throw new Error('expected answered');
    expect(answer.content).toBe('Trả lời [S1].');
    expect(answer.updatedAt).toBe('03/2026');
    expect(answer.sources).toEqual([
      { name: 'Mức phạt quá hạn — Mức phạt', url: '', marker: 'S1', articleSlug: 'qua-han-luu-tru', countryCode: 'KR' },
    ]);
  });
});
