import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import { matchingVoice } from './speechLocale';

// Chỉ liệt kê giọng hệ điều hành cung cấp, không gán cứng ID hay tải âm thanh ngoài app.
export function KoreanSpeechPanel({ selectedVoice, onSelect, onPreview, speaking, disabled }: {
  selectedVoice?: string;
  onSelect: (id: string | undefined) => void;
  onPreview: () => void;
  speaking: boolean;
  disabled: boolean;
}) {
  const [voices, setVoices] = useState<Speech.Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++generation.current;
    try {
      const available = await Speech.getAvailableVoicesAsync();
      if (id === generation.current) {
        setVoices(available.filter((voice) => matchingVoice([voice], 'ko-KR')));
        setFailed(false);
      }
    } catch {
      if (id === generation.current) { setVoices([]); setFailed(true); }
    } finally {
      if (id === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    // Truy vấn engine sau khi mount; bỏ qua nếu màn đã đóng trước lượt truy vấn.
    void Promise.resolve().then(() => { if (active) return refresh(); });
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') { setLoading(true); void refresh(); } });
    return () => { active = false; generation.current += 1; subscription.remove(); };
  }, [refresh]);
  const selectedExists = voices.some((voice) => voice.identifier === selectedVoice);
  return (
    <View className="gap-2 rounded-lg border border-line bg-surface p-4">
      <Text className="font-body-bold text-ink">Giọng phát âm tiếng Hàn</Text>
      <Text className="text-xs text-muted">Đọc bằng giọng 한국어 của thiết bị. Chế độ offline chỉ dùng giọng đã cài; một số giọng cần mạng.</Text>
      {loading ? <Text accessibilityLiveRegion="polite" className="text-muted">Đang tìm giọng Hàn…</Text> : failed ? (
        <Text accessibilityLiveRegion="polite" className="text-danger-strong">Không tải được danh sách giọng. Hãy thử làm mới.</Text>
      ) : voices.length === 0 ? (
        <Text accessibilityLiveRegion="polite" className="text-muted">Chưa tìm thấy giọng Hàn. Dùng “Cài giọng đọc / quyền” bên dưới để xem hướng dẫn cài 한국어, sau đó làm mới.</Text>
      ) : (
        <View className="gap-1">
          {[{ identifier: '', name: 'Tự chọn giọng Hàn' }, ...voices].map((voice) => (
            <Pressable key={voice.identifier} accessibilityRole="radio"
              accessibilityState={{ checked: voice.identifier ? voice.identifier === selectedVoice : !selectedExists, disabled }}
              disabled={disabled} onPress={() => onSelect(voice.identifier || undefined)}
              className={`min-h-12 justify-center rounded-md border px-3 ${(voice.identifier ? voice.identifier === selectedVoice : !selectedExists) ? 'border-primary bg-primary-soft' : 'border-line'}`}>
              <Text className="text-primary-strong">{voice.name || voice.identifier}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Pressable accessibilityRole="button" disabled={disabled || loading} onPress={() => { setLoading(true); void refresh(); }} className="min-h-12 justify-center">
        <Text className="text-primary-strong">Làm mới giọng Hàn</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={disabled || loading || (!speaking && voices.length === 0)} onPress={onPreview} className="min-h-12 justify-center">
        <Text className="text-primary-strong">{speaking ? 'Dừng phát âm' : 'Nghe thử tiếng Hàn'}</Text>
      </Pressable>
    </View>
  );
}
