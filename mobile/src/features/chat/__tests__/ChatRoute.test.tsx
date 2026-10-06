import { render } from '@testing-library/react-native';
import ChatRoute from '@/app/chat';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/features/chat/ChatScreen', () => {
  const { Text } = jest.requireActual('react-native');
  return { __esModule: true, default: () => <Text>CHAT_SCREEN</Text> };
});

const originalFlag = process.env.EXPO_PUBLIC_AI_CHAT_ENABLED;
afterEach(() => {
  process.env.EXPO_PUBLIC_AI_CHAT_ENABLED = originalFlag;
});

test('mac dinh khoa AI: hien man cho, khong render ChatScreen', async () => {
  delete process.env.EXPO_PUBLIC_AI_CHAT_ENABLED;
  const screen = await render(<ChatRoute />);
  expect(screen.getByText('Trợ lý AI sắp ra mắt')).toBeTruthy();
  expect(screen.queryByText('CHAT_SCREEN')).toBeNull();
});

test('bat co EXPO_PUBLIC_AI_CHAT_ENABLED=true thi mo lai ChatScreen', async () => {
  process.env.EXPO_PUBLIC_AI_CHAT_ENABLED = 'true';
  const screen = await render(<ChatRoute />);
  expect(screen.getByText('CHAT_SCREEN')).toBeTruthy();
});
