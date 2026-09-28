import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import ChatScreen from '@/app/chat';
import { askLegalAssistant } from '@/lib/data';

// Test dat o features/ vi moi file trong app/ la mot route cua expo-router.
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useLocalSearchParams: () => ({}) }));
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ isGuest: false }) }));
jest.mock('@/lib/countryContext', () => ({
  useCountry: () => ({ countryCode: 'KR', country: { name: 'Hàn Quốc' } }),
}));
jest.mock('@/lib/data', () => ({
  askLegalAssistant: jest.fn(() => new Promise(() => {})),
  listChatSessions: jest.fn(async () => ({ ok: true, data: [] })),
  deleteChatSession: jest.fn(),
  renameChatSession: jest.fn(),
  loadChatSessionMessages: jest.fn(),
  setChatMessageFeedback: jest.fn(),
  reportWrongAnswer: jest.fn(),
  startNewChatSession: jest.fn(),
  setActiveChatSession: jest.fn(),
  getActiveChatSessionId: jest.fn(() => null),
  getLastChatMessageId: jest.fn(() => null),
}));

const initialMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

// Khong await fireEvent: askLegalAssistant co y treo mai (dang cho tra loi), RNTL
// 14 se cho handler do vo han. Bam tiep khi luot truoc chua xong chinh la kich
// ban can tai hien, nen canh bao "overlapping act()" la du kien -- chi loc dung
// canh bao nay (phat ra ca sau khi test ket thuc), loi khac van in ra.
const originalConsoleError = console.error;
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((message, ...rest) => {
    if (String(message).includes('overlapping act()')) return;
    originalConsoleError(message, ...rest);
  });
});
afterAll(() => jest.restoreAllMocks());

// INV-07.6 (docs/07_QA_BugHunt.md): dang cho cau tra loi thi khong gui them
// -- hai luot song song lam getLastChatMessageId() gan nham id, "Bao sai" roi
// vao tin nhan khac.
test('đang chờ trả lời thì không gửi thêm câu hỏi (nút gửi và câu gợi ý)', async () => {
  const screen = await render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ChatScreen />
    </SafeAreaProvider>,
  );

  void fireEvent.press(screen.getByText('Mất hộ chiếu thì sao?'));
  void fireEvent.press(screen.getByText('Hàng cấm nhập cảnh'));
  void fireEvent.changeText(screen.getByPlaceholderText('Hỏi về quy định...'), 'Câu hỏi thứ ba');
  void fireEvent.press(screen.getByLabelText('Gửi câu hỏi'));

  expect(askLegalAssistant).toHaveBeenCalledTimes(1);
});
