import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Speech from 'expo-speech';
import { KoreanSpeechPanel } from '../KoreanSpeechPanel';

jest.mock('expo-speech', () => ({ getAvailableVoicesAsync: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

test('thiếu giọng thì không nghe thử; làm mới sau cài giọng chỉ liệt kê tiếng Hàn', async () => {
  (Speech.getAvailableVoicesAsync as jest.Mock).mockResolvedValue([]);
  const onSelect = jest.fn();
  const onPreview = jest.fn();
  const screen = await render(<KoreanSpeechPanel onSelect={onSelect} onPreview={onPreview} speaking={false} disabled={false} />);
  await waitFor(() => expect(screen.getByText(/Chưa tìm thấy giọng Hàn/)).toBeTruthy());
  await fireEvent.press(screen.getByText('Nghe thử tiếng Hàn'));
  expect(onPreview).not.toHaveBeenCalled();
  (Speech.getAvailableVoicesAsync as jest.Mock).mockResolvedValue([
    { identifier: 'english', language: 'en-US', name: 'English voice' },
    { identifier: 'korean', language: 'kor_KOR', name: 'Korean voice' },
  ]);
  await fireEvent.press(screen.getByText('Làm mới giọng Hàn'));
  await waitFor(() => expect(screen.getByText('Korean voice')).toBeTruthy());
  expect(screen.queryByText('English voice')).toBeNull();
  await fireEvent.press(screen.getByText('Korean voice'));
  expect(onSelect).toHaveBeenCalledWith('korean');
  await fireEvent.press(screen.getByText('Nghe thử tiếng Hàn'));
  expect(onPreview).toHaveBeenCalledTimes(1);
});

test('đọc danh sách giọng thất bại có trạng thái lỗi và có thể thử lại', async () => {
  (Speech.getAvailableVoicesAsync as jest.Mock).mockRejectedValue(new Error('TTS unavailable'));
  const screen = await render(<KoreanSpeechPanel onSelect={jest.fn()} onPreview={jest.fn()} speaking={false} disabled={false} />);
  await waitFor(() => expect(screen.getByText(/Không tải được danh sách giọng/)).toBeTruthy());
  (Speech.getAvailableVoicesAsync as jest.Mock).mockResolvedValue([]);
  await fireEvent.press(screen.getByText('Làm mới giọng Hàn'));
  await waitFor(() => expect(screen.getByText(/Chưa tìm thấy giọng Hàn/)).toBeTruthy());
});
