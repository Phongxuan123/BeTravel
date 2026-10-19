import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import ChatScreen from '@/features/chat/ChatScreen';
import { askLegalAssistant } from '@/lib/data';

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useLocalSearchParams: () => ({}) }));
jest.mock('@/components/common/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => children,
  useAppShellNavClearance: () => 0,
}));
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ isGuest: false }) }));
jest.mock('@/lib/countryContext', () => ({
  useCountry: () => ({ countryCode: 'KR', country: { name: 'Hàn Quốc', embassy: null } }),
}));
jest.mock('@/lib/data', () => ({
  askLegalAssistant: jest.fn(async () => ({
    status: 'answered',
    updatedAt: '03/2026',
    content: 'Câu trả lời mẫu [S1].',
    sources: [{ name: 'Nguồn mẫu', url: '', marker: 'S1' }],
  })),
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

// Nút "Tạo lại" thay đúng câu trả lời đó, không thêm lượt hỏi mới và báo backend bỏ qua cache.
test('Tạo lại: gọi lại với regenerate=true và không nhân đôi câu hỏi', async () => {
  const screen = await render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ChatScreen />
    </SafeAreaProvider>,
  );

  await fireEvent.press(screen.getByLabelText('Luật pháp địa phương'));
  await waitFor(() => expect(screen.getByLabelText('Tạo lại câu trả lời')).toBeTruthy());
  expect(askLegalAssistant).toHaveBeenCalledTimes(1);
  expect(askLegalAssistant).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ regenerate: false }));
  const question = (askLegalAssistant as jest.Mock).mock.calls[0][0] as string;

  await fireEvent.press(screen.getByLabelText('Tạo lại câu trả lời'));
  await waitFor(() => expect(askLegalAssistant).toHaveBeenCalledTimes(2));
  expect(askLegalAssistant).toHaveBeenLastCalledWith(question, expect.objectContaining({ regenerate: true }));
  await waitFor(() => expect(screen.getAllByText(question)).toHaveLength(1));
});
