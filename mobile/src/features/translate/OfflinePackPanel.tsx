import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Pressable, Text, View } from 'react-native';
import {
  getOfflineModule,
  hasLanguagePair,
  NATIVE_TRANSLATION_MESSAGE,
} from './offlineTranslation';

type Props = { source: string | null; target: string | null; disabled: boolean };

export function OfflinePackPanel({ source, target, disabled }: Props) {
  const [installed, setInstalled] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(() =>
    getOfflineModule() ? 'Đang kiểm tra gói dịch…' : NATIVE_TRANSLATION_MESSAGE,
  );
  const mounted = useRef(true);
  const operation = useRef(false);
  const refresh = useCallback(() => {
    const module = getOfflineModule();
    if (!module) return;
    return module
      .installedLanguages()
      .then((languages) => {
        if (!mounted.current) return;
        setInstalled(languages);
        setMessage(
          source && target && hasLanguagePair(languages, source, target)
            ? 'Đã sẵn sàng dịch hai chiều không cần mạng.'
            : 'Chưa đủ gói dịch. Tải trước khi đi; mỗi ngôn ngữ khoảng 30 MB.',
        );
      })
      .catch(() => {
        if (mounted.current) setMessage('Không kiểm tra được gói dịch. Bấm kiểm tra lại.');
      });
  }, [source, target]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !operation.current) void refresh();
    });
    return () => {
      mounted.current = false;
      listener.remove();
    };
  }, [refresh]);

  const download = async (cellular: boolean) => {
    const native = getOfflineModule();
    if (!native || !source || !target || operation.current) return;
    operation.current = true;
    setBusy(true);
    setMessage(
      cellular
        ? 'Đang tải gói; có thể dùng dữ liệu di động…'
        : 'Đang tải gói qua Wi-Fi; hãy giữ kết nối…',
    );
    try {
      await native.prepare(source, target, cellular);
      if (mounted.current) await refresh();
    } catch {
      if (mounted.current) setMessage('Tải chưa hoàn tất. Kiểm tra mạng/bộ nhớ rồi thử lại.');
    } finally {
      operation.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const askDownload = () =>
    Alert.alert(
      'Tải gói dịch',
      'Gói dịch được lưu trên máy để dùng offline. Chọn loại kết nối được phép dùng.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Chỉ Wi-Fi',
          onPress: () => {
            void download(false);
          },
        },
        {
          text: 'Cho phép dữ liệu di động',
          onPress: () => {
            void download(true);
          },
        },
      ],
    );
  const remove = (language: string) =>
    Alert.alert(
      'Xóa gói dịch?',
      `Gói ${language} dùng chung cho các chiều dịch trên máy. Bạn cần mạng để tải lại. Câu đã lưu vẫn giữ nguyên.`,
      [
        { text: 'Giữ lại', style: 'cancel' },
        {
          text: 'Xóa gói',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const native = getOfflineModule();
              if (!native || operation.current) return;
              operation.current = true;
              setBusy(true);
              try {
                await native.deleteLanguage(language);
                if (mounted.current) await refresh();
              } catch {
                if (mounted.current) setMessage('Không xóa được gói dịch. Hãy thử lại.');
              } finally {
                operation.current = false;
                if (mounted.current) setBusy(false);
              }
            })();
          },
        },
      ],
    );
  return (
    <View className="gap-2 rounded-lg border border-line bg-surface p-4">
      <Text className="font-body-bold text-ink">Gói dịch trên máy</Text>
      <Text accessibilityLiveRegion="polite" className="text-sm text-muted">
        {message}
      </Text>
      <View className="flex-row flex-wrap gap-3">
        <Pressable
          accessibilityRole="button"
          disabled={busy || disabled || !source || !target || !getOfflineModule()}
          onPress={askDownload}
          className="min-h-12 justify-center"
        >
          <Text className="font-body-bold text-primary">
            {busy ? 'Đang xử lý gói…' : 'Tải gói dịch'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            void refresh();
          }}
          className="min-h-12 justify-center"
        >
          <Text className="text-primary">Kiểm tra gói</Text>
        </Pressable>
        {installed
          .filter((language) => language !== 'en' && [source, target].includes(language))
          .map((language) => (
            <Pressable
              key={language}
              accessibilityRole="button"
              disabled={busy || disabled}
              onPress={() => remove(language)}
              className="min-h-12 justify-center"
            >
              <Text className="text-muted">Xóa gói {language.toUpperCase()}</Text>
            </Pressable>
          ))}
      </View>
      <Text className="text-xs text-muted">
        Gói dịch khác với gói micro và giọng đọc. Không tự chuyển nội dung sang dịch online khi
        thiếu gói.
      </Text>
    </View>
  );
}
