import { act, renderHook } from '@testing-library/react-native';
import { AppState, Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { useTranslationSpeech } from '../useTranslationSpeech';
import * as offlineTranslation from '../offlineTranslation';

jest.mock('expo-speech', () => ({
  maxSpeechInputLength: 4000,
  stop: jest.fn(async () => {}),
  speak: jest.fn(),
  getAvailableVoicesAsync: jest.fn(),
}));

test('đọc đoạn dài tuần tự và hủy không cho callback cũ đọc đoạn tiếp', async () => {
  (Speech.getAvailableVoicesAsync as jest.Mock).mockResolvedValue([{ language: 'en-US', identifier: 'english' }]);
  const hook = await renderHook(() => useTranslationSpeech('en-US'));
  await act(async () => { await hook.result.current.play('Long sentence. '.repeat(400)); });
  expect((Speech.speak as jest.Mock).mock.calls[0][0].length).toBeLessThanOrEqual(1000);
  const done = (Speech.speak as jest.Mock).mock.calls[0][1].onDone;
  await act(async () => { hook.result.current.cancel(); done(); });
  expect(Speech.speak).toHaveBeenCalledTimes(1);
  await hook.unmount();
});
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

test('chọn giọng Hàn theo ID; ID sai ngôn ngữ không làm đọc bằng tiếng Anh', async () => {
  (Speech.getAvailableVoicesAsync as jest.Mock).mockResolvedValue([
    { language: 'en-US', identifier: 'english' },
    { language: 'ko-KR', identifier: 'korean-one' },
    { language: 'kor_KOR', identifier: 'korean-two' },
  ]);
  const hook = await renderHook(({ id }: { id: string }) => useTranslationSpeech('ko-KR', false, id), {
    initialProps: { id: 'korean-two' },
  });
  await act(async () => { await hook.result.current.play('안녕하세요'); });
  expect(Speech.speak).toHaveBeenLastCalledWith('안녕하세요', expect.objectContaining({ language: 'ko-KR', voice: 'korean-two' }));
  await hook.rerender({ id: 'english' });
  await act(async () => { await hook.result.current.play('감사합니다'); });
  expect(Speech.speak).toHaveBeenLastCalledWith('감사합니다', expect.objectContaining({ language: 'ko-KR', voice: 'korean-one' }));
  await hook.unmount();
});

test('offline không chọn giọng Hàn cần mạng dù người dùng đã chọn trước đó', async () => {
  const platform = jest.replaceProperty(Platform, 'OS', 'android');
  const native = jest.spyOn(offlineTranslation, 'getOfflineModule').mockReturnValue({
    offlineVoiceIds: async () => ['korean-local'],
  } as NonNullable<ReturnType<typeof offlineTranslation.getOfflineModule>>);
  try {
    (Speech.getAvailableVoicesAsync as jest.Mock).mockResolvedValue([
      { language: 'ko-KR', identifier: 'korean-online' },
      { language: 'ko-KR', identifier: 'korean-local' },
    ]);
    const hook = await renderHook(() => useTranslationSpeech('ko-KR', true, 'korean-online'));
    await act(async () => { await hook.result.current.play('감사합니다'); });
    expect(Speech.speak).toHaveBeenLastCalledWith('감사합니다', expect.objectContaining({ voice: 'korean-local' }));
    await hook.unmount();
  } finally {
    native.mockRestore();
    platform.restore();
  }
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
