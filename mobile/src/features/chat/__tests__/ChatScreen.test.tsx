import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import ChatScreen from '@/features/chat/ChatScreen';
import { askLegalAssistant } from '@/lib/data';

// Test dat o features/ vi moi file trong app/ la mot route cua expo-router.
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useLocalSearchParams: () => ({}) }));
jest.mock('@/components/common/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => children,
  useAppShellNavClearance: () => 0,
}));
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ isGuest: false }) }));
jest.mock('@/lib/countryContext', () => ({
  useCountry: () => ({
    countryCode: 'KR',
    country: { name: 'Hàn Quốc', embassy: { name: 'Đại sứ quán Việt Nam', address: '123 Bukchon-ro, Seoul', phone: '+82-2-720-5124' } },
  }),
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
test('đang chờ trả lời thì không gửi thêm câu hỏi (nút gửi và thẻ nhanh)', async () => {
  const screen = await render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ChatScreen />
    </SafeAreaProvider>,
  );

  // Màn chào có thẻ nhanh thay cho chip gợi ý: bấm thẻ "Luật pháp địa phương" gửi câu hỏi đầu tiên.
  void fireEvent.press(screen.getByLabelText('Luật pháp địa phương'));
  void fireEvent.press(screen.getByLabelText('Gặp tình huống khẩn cấp'));
  void fireEvent.changeText(screen.getByPlaceholderText('Hỏi bất cứ điều gì về chuyến đi...'), 'Câu hỏi thứ ba');
  void fireEvent.press(screen.getByLabelText('Gửi câu hỏi'));

  expect(askLegalAssistant).toHaveBeenCalledTimes(1);
});
