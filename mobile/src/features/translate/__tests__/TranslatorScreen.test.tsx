import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TranslatorScreen from '@/app/translate';
import { translateText } from '@/lib/data';

jest.mock('@/lib/auth', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('@/lib/countryContext', () => ({ useCountry: () => ({ countryCode: 'KR', country: { language: 'Tiếng Hàn' } }) }));
jest.mock('@/components/common/PageHeader', () => ({ PageHeader: () => null }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('expo-speech', () => ({ stop: jest.fn(async () => {}), speak: jest.fn() }));
jest.mock('@/lib/data', () => ({ fetchQuickPhrases: jest.fn(), translateText: jest.fn() }));

async function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return render(<QueryClientProvider client={client}><TranslatorScreen /></QueryClientProvider>);
}

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
