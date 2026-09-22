import { render } from '@testing-library/react-native';
import { AnswerCard } from '../AnswerCard';
import type { ChatAnswer } from '@/mocks/client';

const answered: ChatAnswer = {
  status: 'answered',
  updatedAt: '11/2025',
  content: '**Có**, bạn được quay phim ở nơi công cộng.',
  sources: [{ name: 'Nguồn pháp lý mẫu', url: 'https://example.com' }],
};

const insufficient: ChatAnswer = {
  status: 'insufficient_evidence',
  reason: 'Chưa có dữ liệu về chủ đề này.',
  suggestions: ['Kiểm tra trang hải quan.'],
};

describe('AnswerCard', () => {
  it('biến thể "answered" hiển thị nội dung trả lời và nguồn', async () => {
    const { getByTestId, getByText } = await render(<AnswerCard answer={answered} onFeedback={() => {}} />);
    expect(getByTestId('answer-card-answered')).toBeTruthy();
    expect(getByText('Nguồn pháp lý mẫu')).toBeTruthy();
  });

  it('biến thể "insufficient_evidence" KHÔNG BAO GIỜ hiển thị nội dung trả lời, chỉ lý do', async () => {
    const { getByTestId, queryByText, getByText } = await render(<AnswerCard answer={insufficient} onFeedback={() => {}} />);
    expect(getByTestId('answer-card-insufficient')).toBeTruthy();
    expect(getByText('Chưa có dữ liệu về chủ đề này.')).toBeTruthy();
    expect(queryByText(/quay phim/)).toBeNull();
  });
});
