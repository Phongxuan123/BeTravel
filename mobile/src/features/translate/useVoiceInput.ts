import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { getRecognitionModule, type RecognitionModule } from './voiceRecognition';

const VOICE_TIMEOUT_MS = 30000;
const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Chưa có quyền micro hoặc nhận giọng nói. Hãy cấp quyền trong Cài đặt.',
  'no-speech': 'Chưa nghe được giọng nói. Hãy bấm micro và thử lại.',
  network: 'Nhận giọng nói cần mạng hoặc gói ngôn ngữ trên thiết bị. Hãy kiểm tra và thử lại.',
  'language-not-supported': 'Thiết bị chưa hỗ trợ nhận giọng nói cho ngôn ngữ này.',
  'audio-capture': 'Không truy cập được micro. Kiểm tra ứng dụng khác đang dùng micro.',
};

export function useVoiceInput(
  locale: string | null,
  onTranscript: (text: string) => void,
  offlineOnly = false,
  maxLength = 500,
) {
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = useRef(0);
  const native = useRef<RecognitionModule | null>(null);
  const listeners = useRef<{ remove: () => void }[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);
  const mounted = useRef(true);
  const explained = useRef(false);
  const awaitingPermission = useRef(false);
  const cleanup = useCallback(() => {
    listeners.current.forEach((listener) => listener.remove());
    listeners.current = [];
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    active.current = false;
  }, []);
  const cancel = useCallback(() => {
    session.current += 1;
    cleanup();
    try {
      native.current?.abort();
    } catch {
      /* Binary thiếu dịch vụ vẫn cho nhập tay. */
    }
    if (mounted.current) {
      setBusy(false);
      setListening(false);
      setError(null);
    }
  }, [cleanup]);

  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', (state) => {
      // Hộp thoại xin quyền micro của Android đẩy app ra khỏi 'active' trong giây lát; hủy lúc
      // đó làm lượt nghe không bao giờ bắt đầu. Rời app khi đang nghe thì vẫn tắt micro.
      if (state !== 'active' && !awaitingPermission.current) cancel();
    });
    return () => {
      mounted.current = false;
      cancel();
      subscription.remove();
    };
  }, [cancel]);
  useEffect(() => () => cancel(), [locale, offlineOnly, cancel]);
  useEffect(() => {
    explained.current = false;
  }, [offlineOnly]);

  const stop = () => {
    if (!listeners.current.length) {
      cancel();
      return;
    }
    try {
      native.current?.stop();
    } catch {
      cancel();
      setError('Không kết thúc được nhận giọng nói. Hãy thử lại.');
    }
  };
  const start = async () => {
    if (active.current || AppState.currentState !== 'active') return;
    setError(null);
    if (!locale) {
      setError('Chưa hỗ trợ giọng nói cho ngôn ngữ đã chọn.');
      return;
    }
    const module = getRecognitionModule();
    if (!module) {
      setError(
        'Micro cần bản cài đặt mới của Be.Travel; Expo Go không chứa bộ nhận giọng nói. Bạn có thể chạm ô nhập rồi dùng micro trên bàn phím của máy. Chế độ mạng của đọc chính tả do bàn phím quản lý.',
      );
      return;
    }
    native.current = module;
    active.current = true;
    setBusy(true);
    const id = ++session.current;
    const current = () => mounted.current && session.current === id;
    try {
      if (!module.isRecognitionAvailable()) throw new Error('unavailable');
      if (offlineOnly && !module.supportsOnDeviceRecognition()) {
        cancel();
        setError(
          'Thiết bị chưa có dịch vụ micro offline. Chuẩn bị gói micro bên dưới hoặc nhập tay.',
        );
        return;
      }
      // Alert giải thích cũng có thể đưa iOS sang inactive, giống hộp thoại quyền.
      awaitingPermission.current = true;
      const approved =
        explained.current ||
        (await new Promise<boolean>((resolve) =>
          Alert.alert(
            'Nhập bằng giọng nói',
            offlineOnly
              ? 'Micro chỉ bật khi bạn chọn nói và chỉ nhận giọng trên máy. Cần gói nhận giọng offline. Be.Travel không lưu file ghi âm. Kiểm tra văn bản trước khi dịch.'
              : 'Micro chỉ bật khi bạn chọn nói. Dịch vụ nhận giọng nói của thiết bị có thể gửi âm thanh qua mạng. Be.Travel không lưu file ghi âm. Kiểm tra văn bản trước khi dịch.',
            [
              { text: 'Để sau', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Tiếp tục', onPress: () => resolve(true) },
            ],
            { cancelable: true, onDismiss: () => resolve(false) },
          ),
        ));
      awaitingPermission.current = false;
      if (!current()) return;
      if (!approved) {
        cancel();
        return;
      }
      explained.current = true;
      awaitingPermission.current = true;
      const permission = await module.requestPermissionsAsync().finally(() => {
        awaitingPermission.current = false;
      });
      if (!current()) return;
      if (String(AppState.currentState) === 'background') { cancel(); return; }
      if (!permission.granted) {
        cancel();
        setError(ERROR_MESSAGES['not-allowed']);
        return;
      }
      listeners.current = [
        module.addListener('result', (event) => {
          if (!current()) return;
          const text = event.results[0]?.transcript?.trim();
          if (text) onTranscript(text.slice(0, maxLength));
          if (text && text.length > maxLength)
            setError(`Đã nhận tối đa ${maxLength} ký tự. Hãy chia câu thành đoạn ngắn hơn.`);
        }),
        module.addListener('error', (event) => {
          if (!current()) return;
          cancel();
          if (event.error !== 'aborted')
            setError(
              ERROR_MESSAGES[event.error] ??
                'Không nhận được giọng nói. Hãy thử lại hoặc nhập tay.',
            );
        }),
        module.addListener('end', () => {
          if (current()) {
            session.current += 1;
            cleanup();
            setBusy(false);
            setListening(false);
          }
        }),
      ];
      timer.current = setTimeout(() => {
        if (current()) {
          cancel();
          setError('Đã kết thúc lượt nghe sau 30 giây. Bạn có thể nói tiếp bằng lượt mới.');
        }
      }, VOICE_TIMEOUT_MS);
      setListening(true);
      module.start({
        lang: locale,
        interimResults: true,
        continuous: false,
        requiresOnDeviceRecognition: offlineOnly,
        maxAlternatives: 1,
        recordingOptions: { persist: false },
      });
    } catch {
      awaitingPermission.current = false;
      if (current()) {
        cancel();
        setError(
          'Nhận giọng nói không khả dụng. Kiểm tra dịch vụ/ngôn ngữ trên thiết bị hoặc nhập tay.',
        );
      }
    }
  };
  return { busy, listening, error, start, stop, cancel };
}
