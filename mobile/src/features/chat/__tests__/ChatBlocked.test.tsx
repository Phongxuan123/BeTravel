import { render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import ChatScreen from '@/app/chat';
import { listChatSessions } from '@/lib/data';
import { ApiError } from '@/lib/api/http';

// Backend phong toa tra cuu phap luat (FEATURE_DISABLED) --> chan ca man chat
// bang man "dang hoan thien", khong hien khung chat vo dung.
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useLocalSearchParams: () => ({}) }));
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ isGuest: false }) }));
jest.mock('@/lib/countryContext', () => ({
  useCountry: () => ({ countryCode: 'KR', country: { name: 'Hàn Quốc' } }),
}));
jest.mock('@/lib/data', () => ({
  askLegalAssistant: jest.fn(),
  listChatSessions: jest.fn(),
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

test('chat bi phong toa o backend --> man chan, khong co o nhap cau hoi', async () => {
  (listChatSessions as jest.Mock).mockRejectedValue(
    new ApiError('FORBIDDEN', 'Tính năng tra cứu pháp luật đang tạm ngưng.', 403, { reason: 'FEATURE_DISABLED' }),
  );
  const screen = await render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <ChatScreen />
    </SafeAreaProvider>,
  );

  await waitFor(() => expect(screen.getByText('Tính năng tra cứu pháp luật đang tạm ngưng.')).toBeTruthy());
  expect(screen.queryByPlaceholderText(/Hỏi/i)).toBeNull();
});
