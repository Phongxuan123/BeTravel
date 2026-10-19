import { adaptMessage, stripTrailingDisclaimer } from '../chat';

// adaptMessage()/stripTrailingDisclaimer() chuyen ChatMessage that (backend
// B4/B5) sang ChatAnswer man hinh dang dung -- logic thuan, tach test rieng
// khoi AnswerCard.test.tsx (chi test render).
describe('chat.ts adapter', () => {
  it('cat disclaimer co dinh o cuoi cau tra loi that (rag/guard.js#DEFAULT_DISCLAIMER)', () => {
    const withDisclaimer = 'Câu trả lời thật [S1].\n\n---\nThông tin dựa trên nguồn đã kiểm chứng...';
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
        text: 'Trả lời [S1].\n\n---\nDisclaimer',
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

  const base = {
    _id: 'm3',
    sessionId: 's1',
    role: 'assistant' as const,
    citations: [],
    retrieval: { topScore: 0, chunkIds: [], passed: false },
    confidence: 'high' as const,
    feedback: null,
    createdAt: '2026-03-15T00:00:00.000Z',
  };

  it('adaptMessage: OUT_OF_SCOPE -> out_of_scope, phan biet loi chao qua route', () => {
    const refusal = adaptMessage(
      { ...base, text: ['Mình chỉ hỗ trợ pháp lý.', '', '---', 'ghi chú'].join(String.fromCharCode(10)), fallbackReason: 'OUT_OF_SCOPE', route: 'out_of_scope' },
      'KR',
    );
    expect(refusal).toEqual({ status: 'out_of_scope', message: 'Mình chỉ hỗ trợ pháp lý.', greeting: false });

    const greeting = adaptMessage({ ...base, text: 'Xin chào', fallbackReason: 'OUT_OF_SCOPE', route: 'greeting' }, 'KR');
    expect(greeting).toMatchObject({ status: 'out_of_scope', greeting: true });
  });

  it('adaptMessage: nguon luat goc (au_legislation) mo bang URL chinh thuc va danh dau chua kiem chung', () => {
    const answer = adaptMessage(
      {
        ...base,
        text: 'Visa có thể bị huỷ [S1].',
        fallbackReason: null,
        citations: [
          {
            marker: 'S1',
            title: 'Migration Act 1958',
            heading: 'Section 116',
            sourceType: 'au_legislation',
            officialUrl: 'https://www.legislation.gov.au/C1958A00062/latest/text',
          },
        ],
      },
      'AU',
    );
    if (answer.status !== 'answered') throw new Error('expected answered');
    expect(answer.sources).toEqual([
      {
        name: 'Migration Act 1958 — Section 116',
        url: 'https://www.legislation.gov.au/C1958A00062/latest/text',
        marker: 'S1',
        verified: false,
      },
    ]);
  });
});
