import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TranslatorScreen from '@/app/translate';
import { translateText } from '@/lib/data';
import * as Speech from 'expo-speech';
import { AppState } from 'react-native';

jest.mock('expo-router', () => ({ useFocusEffect: (callback: () => void) => {
  const React = jest.requireActual('react'); React.useEffect(callback, [callback]);
} }));
jest.mock('../voiceRecognition', () => ({ getRecognitionModule: () => null }));

jest.mock('@/lib/auth', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('@/lib/countryContext', () => ({ useCountry: () => ({ countryCode: 'KR', country: { language: 'Tiếng Hàn' } }) }));
jest.mock('@/components/common/PageHeader', () => ({ PageHeader: () => null }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('expo-speech', () => ({ stop: jest.fn(async () => {}), speak: jest.fn(), getAvailableVoicesAsync: jest.fn(async () => [
  { identifier: 'english', language: 'en-US' }, { identifier: 'vietnamese', language: 'vi-VN' }, { identifier: 'korean', language: 'ko-KR' },
]) }));
jest.mock('@/lib/data', () => ({ fetchQuickPhrases: jest.fn(), translateText: jest.fn() }));

async function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return render(<QueryClientProvider client={client}><TranslatorScreen /></QueryClientProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
});

test('micro thiếu native module vẫn cho nhập tay và báo cách dùng bản dựng mới', async () => {
  const screen = await setup();
  await fireEvent.press(screen.getByLabelText('Nhập bằng giọng nói'));
  expect(screen.getByText(/Micro cần bản cài đặt mới/)).toBeTruthy();
  expect(screen.getByPlaceholderText('Nhập câu cần dịch...')).toBeTruthy();
});

test('phát âm theo chiều dịch và ngôn ngữ sở tại', async () => {
  const screen = await setup();
  await fireEvent.press(screen.getByText('Cứu tôi với!'));
  await fireEvent.press(screen.getByText('Phát âm'));
  await waitFor(() => expect(Speech.speak).toHaveBeenCalledWith('Help me!', expect.objectContaining({ language: 'en-US', voice: 'english' })));
  await fireEvent.press(screen.getByLabelText('Đổi chiều dịch'));
  await fireEvent.press(screen.getByText('Help us.'));
  await fireEvent.press(screen.getByText('Phát âm'));
  await waitFor(() => expect(Speech.speak).toHaveBeenLastCalledWith('Giúp chúng tôi với.', expect.objectContaining({ language: 'vi-VN' })));
});

test('tự phát sau API thành công; tắt trong lúc chờ không phát nữa', async () => {
  (translateText as jest.Mock).mockResolvedValue({ translated: 'Please help.', phonetic: '' });
  const screen = await setup();
  await fireEvent(screen.getByLabelText('Tự phát âm sau khi dịch'), 'valueChange', true);
  await fireEvent.press(screen.getByText('Dịch ngay →'));
  await waitFor(() => expect(Speech.speak).toHaveBeenCalledWith('Please help.', expect.objectContaining({ language: 'en-US' })));
  let finish!: (value: unknown) => void;
  (translateText as jest.Mock).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  let press!: Promise<unknown>;
  await act(async () => { press = fireEvent.press(screen.getByText('Dịch ngay →')); });
  await fireEvent(screen.getByLabelText('Tự phát âm sau khi dịch'), 'valueChange', false);
  (Speech.speak as jest.Mock).mockClear();
  await act(async () => { finish({ translated: 'New result', phonetic: '' }); await press; });
  expect(Speech.speak).not.toHaveBeenCalled();
});

test('mặc định Việt-Anh không phụ thuộc Hàn Quốc; câu mẫu đổi chiều đúng', async () => {
  const screen = await setup();
  expect(screen.getByText('Tiếng Anh')).toBeTruthy();
  await fireEvent.press(screen.getByText('Cứu tôi với!'));
  expect(screen.getByDisplayValue('Cứu tôi với!')).toBeTruthy();
  expect(screen.getByText('Help me!')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Đổi chiều dịch'));
  expect(screen.getByDisplayValue('Help me!')).toBeTruthy();
  await fireEvent.press(screen.getByText('Help us.'));
  expect(screen.getByDisplayValue('Help us.')).toBeTruthy();
  expect(screen.getByText('Giúp chúng tôi với.')).toBeTruthy();
});

test('response dịch đến muộn không ghi đè câu đã sửa', async () => {
  let finish!: (value: unknown) => void;
  (translateText as jest.Mock).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const screen = await setup();
  // Không await handler chưa hoàn tất: người dùng sửa câu trong lúc request chạy.
  let press!: Promise<unknown>;
  await act(async () => { press = fireEvent.press(screen.getByText('Dịch ngay →')); });
  await waitFor(() => expect(translateText).toHaveBeenCalled());
  await fireEvent.changeText(screen.getByPlaceholderText('Nhập câu cần dịch...'), 'Tôi cần taxi');
  await act(async () => { finish({ translated: 'OLD RESPONSE', phonetic: '' }); await press; });
  expect(screen.queryByText('OLD RESPONSE')).toBeNull();
  expect(screen.getByDisplayValue('Tôi cần taxi')).toBeTruthy();
});
