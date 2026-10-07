import { act, renderHook } from '@testing-library/react-native';
import { Alert, AppState, type AppStateStatus } from 'react-native';
import { useVoiceInput } from '../useVoiceInput';
import { getRecognitionModule } from '../voiceRecognition';

jest.mock('../voiceRecognition', () => ({ getRecognitionModule: jest.fn() }));
const callbacks = new Map<string, (event: any) => void>();
const native = {
  abort: jest.fn(),
  stop: jest.fn(),
  start: jest.fn(),
  isRecognitionAvailable: jest.fn(() => true),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  addListener: jest.fn((event: string, callback: (event: any) => void) => {
    callbacks.set(event, callback);
    return { remove: () => callbacks.delete(event) };
  }),
};
beforeEach(() => {
  jest.clearAllMocks();
  callbacks.clear();
  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' });
  (getRecognitionModule as jest.Mock).mockReturnValue(native);
  native.requestPermissionsAsync.mockResolvedValue({ granted: true });
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.[1]?.onPress?.();
  });
});
afterEach(() => jest.restoreAllMocks());

test('app rời foreground hủy micro và bỏ kết quả đến sau', async () => {
  let change!: (state: AppStateStatus) => void;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    change = callback;
    return { remove: jest.fn() };
  });
  const transcript = jest.fn();
  const hook = await renderHook(() => useVoiceInput('vi-VN', transcript));
  await act(async () => {
    await hook.result.current.start();
  });
  const late = callbacks.get('result');
  await act(async () => {
    change('background');
    late?.({ results: [{ transcript: 'late' }] });
  });
  expect(hook.result.current.busy).toBe(false);
  expect(transcript).not.toHaveBeenCalled();
  expect(native.abort).toHaveBeenCalled();
  await hook.unmount();
});

test('chỉ xin quyền khi bấm; nhận văn bản theo locale và không lưu âm thanh', async () => {
  const transcript = jest.fn();
  const hook = await renderHook(() => useVoiceInput('ko-KR', transcript));
  expect(native.requestPermissionsAsync).not.toHaveBeenCalled();
  await act(async () => {
    await hook.result.current.start();
  });
  expect(native.start).toHaveBeenCalledWith(
    expect.objectContaining({ lang: 'ko-KR', recordingOptions: { persist: false } }),
  );
  await act(async () => {
    callbacks.get('result')?.({ results: [{ transcript: '도와주세요' }] });
  });
  expect(transcript).toHaveBeenCalledWith('도와주세요');
  await act(async () => {
    callbacks.get('end')?.({});
  });
  expect(hook.result.current.busy).toBe(false);
  await hook.unmount();
});

test('từ chối quyền không bật micro; permission đến muộn sau cancel không start', async () => {
  native.requestPermissionsAsync.mockResolvedValue({ granted: false });
  const hook = await renderHook(() => useVoiceInput('vi-VN', jest.fn()));
  await act(async () => {
    await hook.result.current.start();
  });
  expect(native.start).not.toHaveBeenCalled();
  expect(hook.result.current.error).toMatch(/quyền micro/);
  let finish!: (value: { granted: boolean }) => void;
  native.requestPermissionsAsync.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  let pending!: Promise<void>;
  await act(async () => {
    pending = hook.result.current.start();
  });
  await act(async () => {
    hook.result.current.stop();
    finish({ granted: true });
    await pending;
  });
  expect(native.start).not.toHaveBeenCalled();
  await hook.unmount();
});

test('callback cũ sau đổi ngôn ngữ không ghi đè văn bản mới', async () => {
  const transcript = jest.fn();
  const hook = await renderHook(
    ({ locale }: { locale: string }) => useVoiceInput(locale, transcript),
    { initialProps: { locale: 'vi-VN' } },
  );
  await act(async () => {
    await hook.result.current.start();
  });
  const late = callbacks.get('result');
  await hook.rerender({ locale: 'en-US' });
  await act(async () => {
    late?.({ results: [{ transcript: 'old' }] });
  });
  expect(transcript).not.toHaveBeenCalled();
  expect(native.abort).toHaveBeenCalled();
  await hook.unmount();
});

test('30 giây tự dừng; văn bản dài giới hạn 500 ký tự', async () => {
  jest.useFakeTimers();
  try {
    const transcript = jest.fn();
    const hook = await renderHook(() => useVoiceInput('vi-VN', transcript));
    await act(async () => {
      await hook.result.current.start();
    });
    await act(async () => {
      callbacks.get('result')?.({ results: [{ transcript: 'a'.repeat(600) }] });
    });
    expect(transcript).toHaveBeenCalledWith('a'.repeat(500));
    await act(async () => {
      jest.advanceTimersByTime(30000);
    });
    expect(hook.result.current.busy).toBe(false);
    expect(hook.result.current.error).toMatch(/30 giây/);
    await hook.unmount();
  } finally {
    jest.useRealTimers();
  }
});
