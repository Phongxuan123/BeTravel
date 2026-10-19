import { render } from '@testing-library/react-native';
import { AnswerCard } from '../AnswerCard';
import type { ChatAnswer } from '@/lib/data';

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

  it('needsOfficialHelp hiện nút hỗ trợ khẩn cấp ngay đầu thẻ, mặc định thì không', async () => {
    const urgent = await render(<AnswerCard answer={{ ...answered, needsOfficialHelp: true }} onFeedback={() => {}} />);
    expect(urgent.getByTestId('answer-card-official-help')).toBeTruthy();
    const normal = await render(<AnswerCard answer={answered} onFeedback={() => {}} />);
    expect(normal.queryByTestId('answer-card-official-help')).toBeNull();
  });

  it('biến thể "insufficient_evidence" KHÔNG BAO GIỜ hiển thị nội dung trả lời, chỉ lý do', async () => {
    const { getByTestId, queryByText, getByText } = await render(<AnswerCard answer={insufficient} onFeedback={() => {}} />);
    expect(getByTestId('answer-card-insufficient')).toBeTruthy();
    expect(getByText('Chưa có dữ liệu về chủ đề này.')).toBeTruthy();
    expect(queryByText(/quay phim/)).toBeNull();
  });
});

describe('giao diện theo mẫu Be.Travel AI', () => {
  const guidance = {
    ...answered,
    content: 'Đừng quá lo lắng!\n1. Trình báo công an gần nhất\n2. Chuẩn bị **ảnh 4x6** và giấy tờ',
    needsOfficialHelp: true,
  };

  test('dòng đánh số hiển thị thành từng bước và chữ in đậm không còn dấu **', async () => {
    const { getByText, queryByText } = await render(<AnswerCard answer={guidance} onFeedback={() => {}} />);
    expect(getByText('Trình báo công an gần nhất')).toBeTruthy();
    expect(getByText('ảnh 4x6')).toBeTruthy();
    expect(queryByText(/\*\*/)).toBeNull();
  });

  test('thẻ thông tin liên hệ chỉ hiện khi cần hỗ trợ chính thức và có dữ liệu liên hệ', async () => {
    const contact = { name: 'Đại sứ quán Việt Nam', address: '61 Rue de Miromesnil', phone: '+33 144 14 64 00' };

    const withContact = await render(<AnswerCard answer={guidance} contact={contact} onFeedback={() => {}} />);
    expect(withContact.getByTestId('contact-card')).toBeTruthy();
    expect(withContact.getByText('+33 144 14 64 00')).toBeTruthy();

    const noContact = await render(<AnswerCard answer={guidance} contact={{ name: 'Chỉ có tên' }} onFeedback={() => {}} />);
    expect(noContact.queryByTestId('contact-card')).toBeNull();

    const notUrgent = await render(<AnswerCard answer={{ ...guidance, needsOfficialHelp: false }} contact={contact} onFeedback={() => {}} />);
    expect(notUrgent.queryByTestId('contact-card')).toBeNull();
  });
});
