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

describe('ngoài phạm vi, tiêu đề 3 phần và nguồn chưa kiểm chứng', () => {
  it('biến thể "out_of_scope" hiện lời từ chối của backend kèm lối sang Cẩm nang và SOS, không có nút báo sai', async () => {
    const { getByTestId, getByText, queryByText } = await render(
      <AnswerCard answer={{ status: 'out_of_scope', message: 'Mình chỉ hỗ trợ thông tin pháp lý.', greeting: false }} onFeedback={() => {}} />,
    );
    expect(getByTestId('answer-card-out-of-scope')).toBeTruthy();
    expect(getByText('Ngoài phạm vi hỗ trợ')).toBeTruthy();
    expect(getByText('Mình chỉ hỗ trợ thông tin pháp lý.')).toBeTruthy();
    expect(queryByText('Báo sai')).toBeNull();
  });

  it('lời chào đổi nhãn đầu thẻ', async () => {
    const { getByText } = await render(
      <AnswerCard answer={{ status: 'out_of_scope', message: 'Xin chào', greeting: true }} onFeedback={() => {}} />,
    );
    expect(getByText('Be.Travel AI')).toBeTruthy();
  });

  it('tiêu đề 3 phần hiện thành nhãn, không còn dấu sao', async () => {
    const content = ['**Trả lời ngắn**', 'Không được mang vape [S1].', '', '**Việc nên làm**', '1. Để vape ở nhà [S1]', '', '**Điều cần tránh**', '- Giấu vape trong hành lý [S1]'].join(String.fromCharCode(10));
    const { getByText, queryByText } = await render(
      <AnswerCard answer={{ ...answered, content, sources: [{ name: 'Luật A', url: '', marker: 'S1' }] }} onFeedback={() => {}} />,
    );
    expect(getByText('Trả lời ngắn')).toBeTruthy();
    expect(getByText('Việc nên làm')).toBeTruthy();
    expect(getByText('Điều cần tránh')).toBeTruthy();
    expect(queryByText(/\*\*/)).toBeNull();
  });

  it('nguồn luật gốc chưa kiểm chứng được gắn nhãn cảnh báo; không có nguồn thì không hiện huy hiệu "Có nguồn pháp lý"', async () => {
    const unverified = await render(
      <AnswerCard
        answer={{ ...answered, sources: [{ name: 'Migration Act 1958', url: 'https://example.com', marker: 'S1', verified: false }] }}
        onFeedback={() => {}}
      />,
    );
    expect(unverified.getByText('Văn bản luật gốc, chưa được Be.Travel kiểm chứng')).toBeTruthy();
    expect(unverified.getByText('Gồm luật gốc chưa kiểm chứng')).toBeTruthy();
    expect(unverified.queryByText('Có nguồn pháp lý')).toBeNull();

    const noSource = await render(<AnswerCard answer={{ ...answered, sources: [] }} onFeedback={() => {}} />);
    expect(noSource.queryByText('Có nguồn pháp lý')).toBeNull();
  });

  it('lỗi nhà cung cấp AI đổi nhãn và tiêu đề thẻ, không dùng "Chưa đủ dữ liệu"', async () => {
    const { getByText, queryByText } = await render(
      <AnswerCard
        answer={{ status: 'insufficient_evidence', badge: 'AI đang bận', title: 'Chưa thể trả lời lúc này.', reason: 'Thử lại sau.', suggestions: [] }}
        onFeedback={() => {}}
      />,
    );
    expect(getByText('AI đang bận')).toBeTruthy();
    expect(getByText('Chưa thể trả lời lúc này.')).toBeTruthy();
    expect(queryByText('Chưa đủ dữ liệu')).toBeNull();
  });

  it('câu trả lời đã duyệt hiện nhãn "Đã được Be.Travel duyệt", câu AI thường thì không', async () => {
    const answered = { status: 'answered' as const, updatedAt: '10/2026', content: 'Nội dung [S1]', sources: [] };
    const approved = await render(<AnswerCard answer={{ ...answered, approved: true }} onFeedback={() => {}} />);
    expect(approved.getByText('Đã được Be.Travel duyệt')).toBeTruthy();
    const plain = await render(<AnswerCard answer={answered} onFeedback={() => {}} />);
    expect(plain.queryByTestId('answer-card-approved')).toBeNull();
  });
});
