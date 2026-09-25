import { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, Modal } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import * as Clipboard from 'expo-clipboard';
import { ArrowUpDown, Mic, X, Languages, Volume2, Copy, Maximize, Shrink } from 'lucide-react-native';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { colors } from '@/lib/theme';
import { useCountry } from '@/lib/countryContext';
import { fetchQuickPhrases, translateText } from '@/lib/data';
import type { QuickPhrase } from '@/mocks/schemas';

const MAX_LENGTH = 500;

// expo-speech can ma ngon ngu BCP-47, khong doan duoc tu ten hien thi
// ("Tiếng Hàn") -- anh xa theo countryCode, giong REGION_BY_CODE o adapters.ts.
const SPEECH_LOCALE_BY_COUNTRY: Record<string, string> = {
  KR: 'ko-KR',
  JP: 'ja-JP',
  TH: 'th-TH',
  SG: 'en-SG',
};

export default function TranslatorScreen() {
  const { countryCode, country } = useCountry();
  const [input, setInput] = useState('Tôi cần giúp đỡ');
  const [result, setResult] = useState<{ translated: string; phonetic: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reversed, setReversed] = useState(false); // false: Việt -> ngôn ngữ nước sở tại
  const [fullscreen, setFullscreen] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  const phrasesQuery = useQuery({ queryKey: ['quick-phrases', countryCode], queryFn: () => fetchQuickPhrases(countryCode) });
  const isOffline = phrasesQuery.data?.fromCache === true;

  const fromLabel = reversed ? country?.language ?? '' : 'Tiếng Việt';
  const toLabel = reversed ? 'Tiếng Việt' : country?.language ?? '';

  const runTranslate = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setTranslateError('Nhập nội dung cần dịch.');
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      setTranslateError(`Chỉ dịch được tối đa ${MAX_LENGTH} ký tự.`);
      return;
    }
    setTranslateError(null);
    setLoading(true);
    try {
      const r = await translateText(trimmed, { countryCode, from: fromLabel, to: toLabel, mode: 'text' });
      setResult(r);
    } catch {
      Alert.alert('Không thể dịch', 'Kiểm tra kết nối mạng và thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const onSwapDirection = () => {
    setReversed((v) => !v);
    setResult(null);
    setSelectedId(null);
  };

  const onPickPhrase = (phrase: QuickPhrase) => {
    setSelectedId(phrase.id);
    setInput(phrase.vi);
    setTranslateError(null);
    setResult({ translated: phrase.translated, phonetic: phrase.phonetic });
  };

  const onCopy = async () => {
    if (!result) return;
    await Clipboard.setStringAsync(result.translated);
    Alert.alert('Đã sao chép');
  };

  const onSpeak = () => {
    if (!result) return;
    const locale = reversed ? 'vi-VN' : SPEECH_LOCALE_BY_COUNTRY[countryCode] ?? 'en-US';
    Speech.speak(result.translated, { language: locale });
  };

  return (
    <View className="flex-1 bg-bg">
      <PageHeader
        title="Dịch khẩn cấp"
        subtitle="Hoạt động cả khi ngoại tuyến"
        right={<Badge label={isOffline ? '● Ngoại tuyến' : '● Đã tải'} tone={isOffline ? 'warning' : 'success'} />}
      />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: 48 }}>
        <View className="h-[76px] flex-row items-center rounded-lg border border-line bg-surface px-4">
          <View className="flex-1">
            <Text className="text-xs text-muted">Từ</Text>
            <Text className="text-lg font-body-bold text-ink">{fromLabel}</Text>
          </View>
          <Pressable
            accessibilityLabel="Đổi chiều dịch"
            onPress={onSwapDirection}
            className="h-12 w-12 items-center justify-center rounded-md bg-primary-soft"
          >
            <ArrowUpDown size={20} color={colors.primary} />
          </Pressable>
          <View className="flex-1 items-end">
            <Text className="text-xs text-muted">Sang</Text>
            <Text className="text-lg font-body-bold text-ink">{toLabel}</Text>
          </View>
        </View>

        <View className="rounded-lg border border-line bg-surface p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-[11px] font-body-bold uppercase tracking-wider text-muted">CÂU CỦA BẠN</Text>
            <Text className={`text-[11px] ${input.length > MAX_LENGTH ? 'text-danger' : 'text-muted'}`}>
              {input.length}/{MAX_LENGTH}
            </Text>
          </View>
          <TextInput
            className="mt-2 text-xl font-body-bold text-ink"
            value={input}
            onChangeText={(t) => {
              setInput(t);
              setSelectedId(null);
              setTranslateError(null);
            }}
            multiline
            maxLength={MAX_LENGTH + 20}
            placeholder="Nhập câu cần dịch..."
            placeholderTextColor={colors.subtle}
          />
          {translateError && <Text className="mt-1 text-xs text-danger">{translateError}</Text>}
          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-row" style={{ gap: 8 }}>
              <View className="h-[50px] w-[50px] items-center justify-center rounded-lg border border-line opacity-50">
                <Mic size={20} color={colors.primary} />
              </View>
              <Pressable
                accessibilityLabel="Xoá"
                onPress={() => {
                  setInput('');
                  setResult(null);
                  setTranslateError(null);
                }}
                className="h-[50px] w-[50px] items-center justify-center rounded-lg"
              >
                <X size={20} color={colors.muted} />
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => runTranslate(input)}
              className="h-[50px] flex-row items-center rounded-lg bg-primary px-5"
            >
              <Text className="font-body-bold text-white">{loading ? 'Đang dịch…' : 'Dịch ngay →'}</Text>
            </Pressable>
          </View>
        </View>

        {result && (
          <View className="rounded-xl bg-primary p-[18px]" style={{ shadowColor: 'rgba(15,91,215,1)', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-body-bold text-white/70">BẢN DỊCH · {toLabel.toUpperCase()}</Text>
              <Pressable onPress={() => setFullscreen(true)} accessibilityLabel="Phóng to toàn màn hình" className="h-10 w-10 items-center justify-center rounded-md bg-white/15">
                <Maximize size={18} color="#fff" />
              </Pressable>
            </View>
            <Text className="mt-2 font-display text-white" style={{ fontSize: 34 }}>
              {result.translated}
            </Text>
            {result.phonetic ? <Text className="mt-1 text-[17px] italic text-white/80">{result.phonetic}</Text> : null}
            <View className="mt-4 flex-row" style={{ gap: 10 }}>
              <Pressable onPress={onSpeak} className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-md bg-white">
                <Volume2 size={18} color={colors.primaryStrong} />
                <Text className="font-body-bold text-primary-strong">Phát âm</Text>
              </Pressable>
              <Pressable onPress={onCopy} className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-md bg-white/15">
                <Copy size={18} color="#fff" />
                <Text className="font-body-bold text-white">Sao chép</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View>
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-body-bold text-ink">Câu khẩn cấp dùng nhiều</Text>
            <Text className="text-[13px] text-muted">Chạm để dịch</Text>
          </View>
          <View className="mt-3" style={{ gap: 10 }}>
            {phrasesQuery.data?.data.map((phrase) => {
              const selected = selectedId === phrase.id;
              return (
                <Pressable
                  key={phrase.id}
                  onPress={() => onPickPhrase(phrase)}
                  className={`h-[60px] flex-row items-center gap-3 rounded-lg border px-3 ${selected ? 'border-[1.5px] border-primary' : 'border-line'} bg-surface`}
                >
                  <View className={`h-10 w-10 items-center justify-center rounded-md ${selected ? 'bg-primary' : 'bg-primary-soft'}`}>
                    <Languages size={18} color={selected ? '#fff' : colors.primary} />
                  </View>
                  <Text className="flex-1 text-[17px] font-body-bold text-ink">{phrase.vi}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {result && <FullscreenTranslation text={result.translated} phonetic={result.phonetic} visible={fullscreen} onClose={() => setFullscreen(false)} />}
    </View>
  );
}

// Nut phong to toan man hinh -- de dua dien thoai cho canh sat/nguoi ban dia
// doc, chu that lon (CLAUDE.md B7 muc 13). Cham bat cu dau de dong lai.
function FullscreenTranslation({
  text,
  phonetic,
  visible,
  onClose,
}: {
  text: string;
  phonetic: string;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-primary px-8" onPress={onClose} style={{ paddingTop: insets.top }}>
        <Text className="text-center font-display text-white" style={{ fontSize: 48, lineHeight: 56 }}>
          {text}
        </Text>
        {phonetic ? <Text className="mt-4 text-center text-xl italic text-white/80">{phonetic}</Text> : null}
        <View className="absolute flex-row items-center gap-2" style={{ bottom: insets.bottom + 24 }}>
          <Shrink size={16} color="rgba(255,255,255,0.7)" />
          <Text className="text-sm text-white/70">Chạm để đóng</Text>
        </View>
      </Pressable>
    </Modal>
  );
}
