import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { getRecognitionModule } from './voiceRecognition';
import { getOfflineModule } from './offlineTranslation';

export function VoiceTools({ locale, disabled }: { locale: string | null; disabled: boolean }) {
  const [message, setMessage] = useState(
    'Micro offline cần dịch vụ nhận giọng và gói ngôn ngữ phù hợp trên máy.',
  );
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const prepareVoice = async () => {
    const module = getRecognitionModule();
    if (!module) {
      setMessage('Micro cần bản native mới, không hỗ trợ trong Expo Go.');
      return;
    }
    if (!locale || busy) return;
    if (Platform.OS !== 'android') {
      setMessage(
        'iPhone: bật Đọc chính tả và tải ngôn ngữ trong Cài đặt > Cài đặt chung > Bàn phím. Khả năng nhận giọng offline tùy máy/ngôn ngữ.',
      );
      return;
    }
    setBusy(true);
    try {
      const result = await module.androidTriggerOfflineModelDownload({ locale });
      if (mounted.current)
        setMessage(
          result.status === 'download_success'
            ? 'Gói micro đã tải. Bấm micro để nói thử.'
            : 'Đã yêu cầu hệ điều hành tải gói micro. Hoàn tất tải trong hộp thoại/cài đặt rồi nói thử.',
        );
    } catch {
      if (mounted.current)
        setMessage(
          'Máy/dịch vụ chưa hỗ trợ tải gói micro trong app. Cài dịch vụ nhận giọng và ngôn ngữ trong Cài đặt của máy.',
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const settings = async () => {
    try {
      const module = getOfflineModule();
      if (Platform.OS === 'android') {
        if (module) await module.openVoiceSettings();
        else setMessage('Android: cài giọng đọc trong Cài đặt > Quản lý chung > Văn bản thành giọng nói (tên mục tùy máy). Trong Expo Go, dùng micro trên bàn phím hoặc cài bản Be.Travel native để nhận giọng trong app.');
      } else {
        setMessage(
          'iPhone: tải giọng ở Cài đặt > Trợ năng > Nội dung được đọc > Giọng nói; kiểm tra quyền Micro/Nhận dạng giọng nói của Be.Travel.',
        );
        await Linking.openSettings();
      }
    } catch {
      setMessage('Không mở được Cài đặt. Hãy mở Cài đặt của máy để cài giọng đọc/ngôn ngữ.');
    }
  };
  return (
    <View className="gap-2 rounded-lg border border-line bg-surface p-4">
      <Text className="font-body-bold text-ink">Chuẩn bị micro và giọng đọc</Text>
      <Text accessibilityLiveRegion="polite" className="text-xs text-muted">
        {message}
      </Text>
      <View className="flex-row flex-wrap gap-3">
        <Pressable
          accessibilityRole="button"
          disabled={disabled || busy}
          onPress={() => {
            void prepareVoice();
          }}
          className="min-h-12 justify-center"
        >
          <Text className="text-primary">{busy ? 'Đang chuẩn bị…' : 'Chuẩn bị micro offline'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={disabled || busy}
          onPress={() => {
            void settings();
          }}
          className="min-h-12 justify-center"
        >
          <Text className="text-primary">Cài giọng đọc / quyền</Text>
        </Pressable>
      </View>
    </View>
  );
}
