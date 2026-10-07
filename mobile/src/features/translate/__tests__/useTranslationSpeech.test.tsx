import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import * as Speech from 'expo-speech';
import { useTranslationSpeech } from '../useTranslationSpeech';

jest.mock('expo-speech', () => ({
  stop: jest.fn(async () => {}),
  speak: jest.fn(),
  getAvailableVoicesAsync: jest.fn(),
}));
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
});
test('chọn giọng đúng và callback kết thúc cập nhật nút dừng', async () => {
  (Speech.getAvailableVoicesAsync as jest.Mock).mockResolvedValue([
    { language: 'ja-JP', identifier: 'japanese' },
  ]);
  const hook = await renderHook(() => useTranslationSpeech('ja-JP'));
  await act(async () => {
    await hook.result.current.play('助けて');
  });
  expect(Speech.speak).toHaveBeenCalledWith(
    '助けて',
    expect.objectContaining({ language: 'ja-JP', voice: 'japanese' }),
  );
  expect(hook.result.current.speaking).toBe(true);
  await act(async () => {
    (Speech.speak as jest.Mock).mock.calls[0][1].onDone();
  });
  expect(hook.result.current.speaking).toBe(false);
  await hook.unmount();
});
test('thiếu giọng đích không phát bằng ngôn ngữ khác', async () => {
  (Speech.getAvailableVoicesAsync as jest.Mock).mockResolvedValue([
    { language: 'en-US', identifier: 'english' },
  ]);
  const hook = await renderHook(() => useTranslationSpeech('ko-KR'));
  await act(async () => {
    await hook.result.current.play('도와주세요');
  });
  expect(Speech.speak).not.toHaveBeenCalled();
  expect(hook.result.current.error).toMatch(/chưa có giọng đọc/);
  await hook.unmount();
});
test('hủy khi chờ voice list không phát lại kết quả cũ', async () => {
  let finish!: (value: unknown) => void;
  (Speech.getAvailableVoicesAsync as jest.Mock).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const hook = await renderHook(() => useTranslationSpeech('en-US'));
  let pending!: Promise<void>;
  await act(async () => {
    pending = hook.result.current.play('old');
  });
  await act(async () => {
    hook.result.current.cancel();
    finish([{ language: 'en-US', identifier: 'english' }]);
    await pending;
  });
  expect(Speech.speak).not.toHaveBeenCalled();
  await hook.unmount();
});

test('đổi locale trong lúc chờ không đọc câu bằng giọng cũ', async () => {
  let finish!: (value: unknown) => void;
  (Speech.getAvailableVoicesAsync as jest.Mock).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const hook = await renderHook(({ locale }: { locale: string }) => useTranslationSpeech(locale), {
    initialProps: { locale: 'en-US' },
  });
  let pending!: Promise<void>;
  await act(async () => {
    pending = hook.result.current.play('old');
  });
  await hook.rerender({ locale: 'vi-VN' });
  await act(async () => {
    finish([{ language: 'en-US', identifier: 'english' }]);
    await pending;
  });
  expect(Speech.speak).not.toHaveBeenCalled();
  await hook.unmount();
});
