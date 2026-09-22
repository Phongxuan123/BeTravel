import { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import * as Speech from 'expo-speech';
import * as Clipboard from 'expo-clipboard';
import { ArrowUpDown, Mic, X, Languages, Volume2, Copy, Maximize } from 'lucide-react-native';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { colors } from '@/lib/theme';
import { useCountry } from '@/lib/countryContext';
import { fetchQuickPhrases, translateText } from '@/mocks/client';
import type { QuickPhrase } from '@/mocks/schemas';

export default function TranslatorScreen() {
  const { countryCode, country } = useCountry();
  const [input, setInput] = useState('Tôi cần giúp đỡ');
  const [result, setResult] = useState<{ translated: string; phonetic: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const phrasesQuery = useQuery({ queryKey: ['quick-phrases', countryCode], queryFn: () => fetchQuickPhrases(countryCode) });

  const runTranslate = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    const r = await translateText(text);
    setResult(r);
    setLoading(false);
  };

  const onPickPhrase = (phrase: QuickPhrase) => {
    setSelectedId(phrase.id);
    setInput(phrase.vi);
    setResult({ translated: phrase.translated, phonetic: phrase.phonetic });
  };

  const onCopy = async () => {
    if (!result) return;
    await Clipboard.setStringAsync(result.translated);
    Alert.alert('Đã sao chép');
  };

  const onSpeak = () => {
    if (!result) return;
    Speech.speak(result.translated, { language: 'ja-JP' });
  };

  return (
    <View className="flex-1 bg-bg">
      <PageHeader
        title="Dịch khẩn cấp"
        subtitle="Hoạt động cả khi ngoại tuyến"
        right={<Badge label="● Đã tải" tone="success" />}
      />
      <ScrollView contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: 48 }}>
        <View className="h-[76px] flex-row items-center rounded-lg border border-line bg-surface px-4">
          <View className="flex-1">
            <Text className="text-xs text-muted">Từ</Text>
            <Text className="text-lg font-body-bold text-ink">Tiếng Việt</Text>
          </View>
          <View className="h-12 w-12 items-center justify-center rounded-md bg-primary-soft">
            <ArrowUpDown size={20} color={colors.primary} />
          </View>
          <View className="flex-1 items-end">
            <Text className="text-xs text-muted">Sang</Text>
            <Text className="text-lg font-body-bold text-ink">{country?.language}</Text>
          </View>
        </View>

        <View className="rounded-lg border border-line bg-surface p-4">
          <Text className="text-[11px] font-body-bold uppercase tracking-wider text-muted">CÂU CỦA BẠN</Text>
          <TextInput
            className="mt-2 text-xl font-body-bold text-ink"
            value={input}
            onChangeText={(t) => {
              setInput(t);
              setSelectedId(null);
            }}
            multiline
            placeholder="Nhập câu cần dịch..."
            placeholderTextColor={colors.subtle}
          />
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
              <Text className="text-xs font-body-bold text-white/70">BẢN DỊCH · {country?.language.toUpperCase()}</Text>
              <View className="h-10 w-10 items-center justify-center rounded-md bg-white/15">
                <Maximize size={18} color="#fff" />
              </View>
            </View>
            <Text className="mt-2 font-display text-white" style={{ fontSize: 34 }}>
              {result.translated}
            </Text>
            <Text className="mt-1 text-[17px] italic text-white/80">{result.phonetic}</Text>
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
    </View>
  );
}
