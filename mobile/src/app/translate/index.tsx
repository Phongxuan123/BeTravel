import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, ScrollView, Pressable, TextInput, Alert, Modal, Linking, Image } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { ArrowLeftRight, Mic, X, Languages, Volume2, Copy, Maximize, Shrink, Star } from 'lucide-react-native';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { colors } from '@/lib/theme';
import { useCountry } from '@/lib/countryContext';
import { fetchQuickPhrases, translateText } from '@/lib/data';
import type { QuickPhrase } from '@/lib/data';
import { englishPhrases, phrasebookLicense, phrasebookLicenseUrl } from '@/features/translate/phrasebook';
import { useAuth } from '@/lib/auth';
import { useUserStorage } from '@/lib/useUserStorage';
import { Switch } from '@/components/ui/Switch';
import { speechLocale } from '@/features/translate/speechLocale';
import { getRecognitionModule } from '@/features/translate/voiceRecognition';
import { useVoiceInput } from '@/features/translate/useVoiceInput';
import { useTranslationSpeech } from '@/features/translate/useTranslationSpeech';

import { BundledPhrasePanel } from '@/features/translate/BundledPhrasePanel';
import { dictionaryInfo, hasBundledPair, type TranslationResult, type TranslationEngine } from '@/features/translate/bundledTranslation';
import { OfflinePackPanel } from '@/features/translate/OfflinePackPanel';
import { VoiceTools } from '@/features/translate/VoiceTools';
import { translateOffline, translationLanguage, OFFLINE_TEXT_LIMIT, ONLINE_TEXT_LIMIT } from '@/features/translate/offlineTranslation';

type SavedPhrase = { vi: string; translated: string; phonetic: string; targetLanguage?: string; engine?: TranslationEngine; sourceTerms?: string[] };

export default function TranslatorScreen() {
  const { countryCode } = useCountry();
  const { user } = useAuth();
  return <TranslatorForm key={`${countryCode}:${user?.email ?? 'guest'}`} />;
}

function TranslatorForm() {
  const { countryCode, country } = useCountry();
  const [offlineMode, setOfflineMode] = useState(true);
  const [showMachinePacks, setShowMachinePacks] = useState(false);
  const [translationProgress, setTranslationProgress] = useState('');
  const maxLength = offlineMode ? OFFLINE_TEXT_LIMIT : ONLINE_TEXT_LIMIT;
  const [input, setInput] = useState('Tôi cần giúp đỡ');
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reversed, setReversed] = useState(false); // false: Việt -> ngôn ngữ nước sở tại
  const [fullscreen, setFullscreen] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [englishMode, setEnglishMode] = useState(true);
  const [localLanguage, setLocalLanguage] = useState('');
  const { isGuest } = useAuth();
  const [autoSpeak, setAutoSpeak] = useState(false);
  const autoSpeakRef = useRef(false);
  const requestId = useRef(0);
  const inputRef = useRef<TextInput>(null);
  const savedPhrases = useUserStorage<SavedPhrase[]>('saved-phrases', []);
  useEffect(() => () => { requestId.current += 1; }, []);

  const phrasesQuery = useQuery({ queryKey: ['quick-phrases', countryCode], queryFn: () => fetchQuickPhrases(countryCode), enabled: !englishMode && (!localLanguage || localLanguage === country?.language) });
  const isOffline = phrasesQuery.data?.fromCache === true;

  const otherLanguage = englishMode ? 'Tiếng Anh' : localLanguage || country?.language || '';
  const fromLabel = reversed ? otherLanguage : 'Tiếng Việt';
  const toLabel = reversed ? 'Tiếng Việt' : otherLanguage;
  const sourceLanguage = translationLanguage(fromLabel);
  const targetLanguage = translationLanguage(toLabel);
  const audio = useTranslationSpeech(speechLocale(toLabel), offlineMode);
  const voice = useVoiceInput(speechLocale(fromLabel), (text) => {
    requestId.current += 1;
    setLoading(false);
    setResult(null);
    setSelectedId(null);
    setInput(text);
    setTranslateError(null);
    audio.cancel();
  }, offlineMode, maxLength);
  const cancelVoice = voice.cancel;
  const cancelAudio = audio.cancel;
  useFocusEffect(useCallback(() => () => {
    requestId.current += 1;
    setLoading(false);
    cancelVoice();
    cancelAudio();
  }, [cancelVoice, cancelAudio]));
  const phrases: QuickPhrase[] = englishMode ? englishPhrases.map((phrase) => ({
    id: String(phrase.enId), countryCode, vi: phrase.vi, translated: phrase.en, phonetic: '',
  })) : (otherLanguage === country?.language ? phrasesQuery.data?.data ?? [] : []);

  const invalidateResult = () => {
    voice.cancel();
    requestId.current += 1;
    setLoading(false);
    setResult(null);
    setSelectedId(null);
    setTranslateError(null);
    setFullscreen(false);
    audio.cancel();
  };

  const runTranslate = async (text: string) => {
    if (loading || voice.busy || !otherLanguage) return;
    if (!offlineMode && isGuest) { setTranslateError('Dịch online cần đăng nhập. Bạn vẫn có thể dịch offline.'); return; }
    const trimmed = text.trim();
    if (!trimmed) {
      setTranslateError('Nhập nội dung cần dịch.');
      return;
    }
    if (trimmed.length > maxLength) {
      setTranslateError(`Chỉ dịch được tối đa ${maxLength} ký tự.`);
      return;
    }
    setTranslateError(null);
    setResult(null);
    setLoading(true);
    audio.cancel();
    setTranslationProgress('');
    const id = ++requestId.current;
    try {
      if (!sourceLanguage || !targetLanguage) throw new Error('Chưa hỗ trợ cặp ngôn ngữ này.');
      const r = offlineMode
        ? await translateOffline(trimmed, sourceLanguage, targetLanguage,
          () => id === requestId.current,
          (done, total) => setTranslationProgress(`${done}/${total} đoạn`))
        : await translateText(trimmed, { countryCode, from: fromLabel, to: toLabel, mode: 'text' });
      if (id === requestId.current) {
        setResult(r);
        if (autoSpeakRef.current) void audio.play(r.translated);
      }
    } catch (error) {
      if (id === requestId.current) setTranslateError(error instanceof Error ? error.message : 'Không thể dịch. Vui lòng thử lại.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  const onSwapDirection = () => {
    const nextInput = result?.translated ?? '';
    invalidateResult();
    setReversed((v) => !v);
    setInput(nextInput);
  };

  const onPickPhrase = (phrase: QuickPhrase, engine?: TranslationEngine) => {
    invalidateResult();
    setSelectedId(phrase.id);
    setInput(reversed ? phrase.translated : phrase.vi);
    setTranslateError(null);
    setResult({ translated: reversed ? phrase.vi : phrase.translated, phonetic: reversed ? '' : phrase.phonetic, engine });
    if (autoSpeakRef.current) void audio.play(reversed ? phrase.vi : phrase.translated);
  };

  // Câu đã lưu luôn lưu theo chiều Việt -> ngôn ngữ đích để hiển thị thống nhất.
  const currentPhrase: SavedPhrase | null = result
    ? reversed
      ? { vi: result.translated, translated: input.trim(), phonetic: '', targetLanguage: otherLanguage, engine: result.engine, sourceTerms: result.sourceTerms }
      : { vi: input.trim(), translated: result.translated, phonetic: result.phonetic, targetLanguage: otherLanguage, engine: result.engine, sourceTerms: result.sourceTerms }
    : null;
  const isCurrentSaved = !!currentPhrase && savedPhrases.value.some((p) => p.vi === currentPhrase.vi && p.translated === currentPhrase.translated && p.targetLanguage === otherLanguage);
  const onToggleSave = () => {
    if (!currentPhrase) return;
    void savedPhrases.update((list) =>
      isCurrentSaved
        ? list.filter((p) => !(p.vi === currentPhrase.vi && p.translated === currentPhrase.translated && p.targetLanguage === otherLanguage))
        : [currentPhrase, ...list],
    );
  };

  const onCopy = async () => {
    if (!result) return;
    try {
      await Clipboard.setStringAsync(result.translated);
      Alert.alert('Đã sao chép');
    } catch { Alert.alert('Không sao chép được', 'Vui lòng thử lại.'); }
  };

  const onSpeak = () => {
    if (!result) return;
    voice.cancel();
    if (audio.speaking) audio.cancel();
    else void audio.play(result.translated);
  };

  return (
    <View className="flex-1 bg-bg">
      <PageHeader
        title="Dịch khẩn cấp"
        subtitle="Từ điển và câu Việt–Anh có sẵn · không cần tải thêm"
        right={<Badge label={englishMode ? 'Câu mẫu có sẵn' : isOffline ? 'Bản lưu' : phrasesQuery.isLoading ? 'Đang tải' : phrasesQuery.isError ? 'Lỗi tải' : 'Đã tải'} tone={!englishMode && (isOffline || phrasesQuery.isError) ? 'warning' : 'success'} />}
      />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, gap: 16, paddingBottom: 48 }}>
        <View className="flex-row items-center gap-3 rounded-lg border border-line bg-surface p-4">
          <View className="flex-1"><Text className="font-body-bold text-ink">Dịch không cần mạng</Text>
            <Text className="mt-1 text-xs text-muted">{offlineMode ? 'Tra từ và câu Việt–Anh có sẵn trong app, tối đa 5.000 ký tự. Câu tự do ngoài bộ cần dịch máy mở rộng hoặc online. Micro/giọng đọc phụ thuộc thiết bị.' : 'Chế độ online gửi văn bản đến máy chủ; tối đa 500 ký tự.'}</Text></View>
          <Switch accessibilityLabel="Dịch không cần mạng" value={offlineMode} onValueChange={(next) => { invalidateResult(); setOfflineMode(next); }} />
        </View>
        {!englishMode && phrasesQuery.isLoading && <Text className="text-muted">Đang tải câu mẫu…</Text>}
        {!englishMode && phrasesQuery.isError && <View className="gap-2"><Text className="text-danger">Không tải được câu mẫu.</Text><Pressable onPress={() => { void phrasesQuery.refetch(); }}><Text className="font-body-bold text-primary">Thử lại</Text></Pressable></View>}
        {!englishMode && !phrasesQuery.isLoading && !phrasesQuery.isError && phrases.length === 0 && <Text className="text-muted">Chưa có câu mẫu cho quốc gia này.</Text>}
        <View className="flex-row gap-2">
          {[true, false].map((english) => (
            <Pressable key={String(english)} accessibilityRole="button" accessibilityState={{ selected: englishMode === english }}
              onPress={() => { invalidateResult(); setEnglishMode(english); setReversed(false); setInput(''); }}
              className={`min-h-12 flex-1 items-center justify-center rounded-lg border px-3 ${englishMode === english ? 'border-primary bg-primary-soft' : 'border-line bg-surface'}`}>
              <Text className="font-body-bold text-primary">{english ? 'Việt - Anh' : 'Ngôn ngữ sở tại'}</Text>
            </Pressable>
          ))}
        </View>
        {!englishMode && <View className="flex-row flex-wrap gap-2">{['Tiếng Anh', 'Tiếng Hàn', 'Tiếng Nhật', 'Tiếng Thái', 'Tiếng Trung', 'Tiếng Pháp', 'Tiếng Đức'].map((language) =>
          <Pressable key={language} accessibilityRole="button" accessibilityState={{ selected: otherLanguage === language }} onPress={() => { invalidateResult(); setLocalLanguage(language); }} className={`min-h-12 justify-center rounded-md border px-3 ${otherLanguage === language ? 'border-primary bg-primary-soft' : 'border-line bg-surface'}`}><Text className="text-ink">{language}</Text></Pressable>
        )}</View>}
        <View className="flex-row items-center rounded-2xl border border-line bg-surface p-3" style={{ gap: 8 }}>
          <View className="flex-1 rounded-xl bg-bg px-3 py-2.5">
            <Text className="text-[11px] text-muted">Từ</Text>
            <Text className="text-sm font-body-bold text-ink" numberOfLines={1}>{fromLabel}</Text>
          </View>
          <Pressable
            accessibilityLabel="Đổi chiều dịch"
            onPress={onSwapDirection}
            className="h-11 w-11 items-center justify-center rounded-xl bg-primary-soft"
          >
            <ArrowLeftRight size={18} color={colors.primary} />
          </Pressable>
          <View className="flex-1 rounded-xl bg-primary-soft px-3 py-2.5">
            <Text className="text-[11px] text-muted">Sang</Text>
            <Text className="text-sm font-body-bold text-primary-strong" numberOfLines={1}>{toLabel}</Text>
          </View>
        </View>

        {offlineMode && <View className="gap-2 rounded-lg border border-line bg-surface p-4">
          <Text className="font-body-bold text-ink">{hasBundledPair(sourceLanguage, targetLanguage) ? 'Bộ Việt–Anh đã tích hợp sẵn' : 'Chưa có bộ tích hợp cho cặp ngôn ngữ này'}</Text>
          <Text className="text-sm text-muted">{dictionaryInfo.count.toLocaleString('vi-VN')} cặp từ/nghĩa và câu thông dụng. Dùng được từ lần mở đầu, không cần tài khoản hay tải gói. Không dịch từng từ để ghép thành câu.</Text>
          <Text className="text-xs text-muted">Từ điển: Wiktionary qua Kaikki · {dictionaryInfo.license}. Dữ liệu cộng đồng có thể có nhiều nghĩa.</Text>
          <Pressable accessibilityRole="button" onPress={() => Linking.openURL(dictionaryInfo.licenseUrl).catch(() => Alert.alert('Cần mạng để mở giấy phép'))} className="min-h-11 justify-center"><Text className="text-primary">Giấy phép từ điển CC BY-SA 4.0</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showMachinePacks }} onPress={() => setShowMachinePacks((value) => !value)} className="min-h-11 justify-center">
            <Text className="text-primary">{showMachinePacks ? 'Ẩn dịch máy mở rộng' : 'Dịch câu tự do bằng ML Kit (tùy chọn)'}</Text>
          </Pressable>
          {showMachinePacks && <OfflinePackPanel key={`${sourceLanguage}:${targetLanguage}`} source={sourceLanguage} target={targetLanguage} disabled={loading || voice.busy} />}
        </View>}
        <VoiceTools key={fromLabel} locale={speechLocale(fromLabel)} disabled={loading || voice.busy || audio.speaking} />
        <View className="rounded-lg border border-line bg-surface p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-body-bold text-muted">Nội dung {fromLabel}</Text>
            <Text className={`text-[11px] ${input.length > maxLength ? 'text-danger' : 'text-muted'}`}>
              {input.length}/{maxLength}
            </Text>
          </View>
          <TextInput
            ref={inputRef}
            editable={!voice.busy}
            className="mt-2 text-xl font-body-bold text-ink"
            value={input}
            onChangeText={(t) => {
              invalidateResult();
              setInput(t);
              setSelectedId(null);
              setTranslateError(null);
            }}
            multiline
            maxLength={maxLength + 20}
            placeholder="Nhập câu cần dịch..."
            placeholderTextColor={colors.subtle}
          />
          {loading && <Pressable accessibilityRole="button" onPress={invalidateResult} className="min-h-12 justify-center"><Text className="text-primary">Hủy dịch</Text></Pressable>}
          {translateError && <Text className="mt-1 text-xs text-danger">{translateError}</Text>}
          {voice.busy && <Text accessibilityLiveRegion="polite" className="mt-2 text-sm text-primary">{voice.listening ? `Đang nghe ${fromLabel}. Bấm dừng, kiểm tra văn bản rồi dịch.` : 'Đang chuẩn bị micro...'}</Text>}
          {voice.error && <Text accessibilityLiveRegion="polite" className="mt-2 text-sm text-danger">{voice.error}</Text>}
          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-row" style={{ gap: 8 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={voice.busy ? 'Dừng nhận giọng nói' : 'Nhập bằng giọng nói'}
                onPress={() => { if (voice.busy) voice.stop(); else { audio.cancel(); if (!getRecognitionModule()) inputRef.current?.focus(); void voice.start(); } }}
                className={`h-[50px] w-[50px] items-center justify-center rounded-lg border ${voice.busy ? 'border-primary bg-primary-soft' : 'border-line'}`}>
                <Mic size={20} color={colors.primary} />
              </Pressable>
              <Pressable
                accessibilityLabel="Xoá"
                onPress={() => {
                  invalidateResult();
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
              disabled={loading || voice.busy || !input.trim() || !otherLanguage}
              accessibilityState={{ disabled: loading || voice.busy || !input.trim() || !otherLanguage }}
              onPress={() => runTranslate(input)}
              className="h-[50px] flex-row items-center rounded-lg bg-primary px-5"
            >
              <Text className="font-body-bold text-white">{loading ? `Đang dịch ${translationProgress}…` : offlineMode ? 'Dịch offline' : 'Dịch ngay'}</Text>
            </Pressable>
          </View>
        </View>

        <View className="flex-row items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4">
          <View className="flex-1"><Text className="font-body-bold text-ink">Tự phát âm sau khi dịch</Text>
            <Text className="mt-1 text-xs text-muted">Giọng đọc theo ngôn ngữ đích. Trên iPhone, bật âm lượng và tắt chế độ im lặng.</Text></View>
          <Switch value={autoSpeak} accessibilityLabel="Tự phát âm sau khi dịch" onValueChange={(next) => { autoSpeakRef.current = next; setAutoSpeak(next); audio.cancel(); }} />
        </View>
        {audio.error && <Text accessibilityLiveRegion="polite" className="text-sm text-danger">{audio.error}</Text>}

        {result && (
          <View className="rounded-xl bg-ink p-[18px]" style={{ shadowColor: 'rgba(16,42,67,1)', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-body-bold text-white/70">Kết quả bản dịch ({toLabel})</Text>
              <View className="flex-row" style={{ gap: 8 }}>
                <Pressable onPress={onToggleSave} accessibilityLabel={isCurrentSaved ? 'Bỏ lưu câu này' : 'Lưu câu này'} className="h-11 w-11 items-center justify-center rounded-md bg-white/15">
                  <Star size={18} color="#fff" fill={isCurrentSaved ? '#fff' : 'none'} />
                </Pressable>
                <Pressable onPress={onCopy} accessibilityLabel="Sao chép bản dịch" className="h-11 w-11 items-center justify-center rounded-md bg-white/15">
                  <Copy size={18} color="#fff" />
                </Pressable>
                <Pressable onPress={() => setFullscreen(true)} accessibilityLabel="Phóng to toàn màn hình" className="h-11 w-11 items-center justify-center rounded-md bg-white/15">
                  <Maximize size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
            <Text className="mt-2 font-display text-white" style={{ fontSize: 34 }}>
              {result.translated}
            </Text>
            {result.engine === 'bundled-vocabulary' && <Text className="mt-3 text-xs text-white">Từ du lịch cốt lõi · BeTravel. Nghĩa theo ngữ cảnh du lịch.</Text>}
            {result.engine === 'bundled-phrase' && <Text className="mt-3 text-xs text-white">Câu có sẵn trong app · BeTravel / Tatoeba. Xem nguồn câu mẫu bên dưới.</Text>}
            {result.engine === 'bundled-dictionary' && <View className="mt-3 gap-2">
              <Text className="text-xs text-white">Tra từ điển, các nghĩa phân cách bằng dấu chấm phẩy; không phải bản dịch câu. Wiktionary / Kaikki · CC BY-SA 4.0.</Text>
              {result.sourceTerms?.map((term) => <Pressable key={term} accessibilityRole="button" onPress={() => Linking.openURL(`https://en.wiktionary.org/wiki/${encodeURIComponent(term)}#Vietnamese`).catch(() => Alert.alert('Cần mạng để mở nguồn'))} className="min-h-11 justify-center"><Text className="text-primary-soft">Nguồn và lịch sử đóng góp: {term}</Text></Pressable>)}
            </View>}
            {result.engine === 'mlkit'  && <View className="mt-3 gap-2">
              <Text className="text-xs text-white">Bản dịch tự động trên máy · Google Translate. Có thể sai nghĩa; kiểm tra lại khi dùng cho y tế/pháp luật.</Text>
              <Pressable onPress={() => Linking.openURL('https://translate.google.com').catch(() => Alert.alert('Cần mạng để mở nguồn'))}><Image source={require('../../../assets/translation/white-regular.png')} style={{ width: 176, height: 16 }} resizeMode="contain" accessibilityLabel="powered by Google Translate" /></Pressable>
            </View>}
            {result.phonetic ? <Text className="mt-2 font-mono text-[15px] text-primary-soft">Phiên âm đọc: {result.phonetic}</Text> : null}
            <Pressable onPress={onSpeak} className="mt-4 h-[52px] flex-row items-center justify-center gap-2 rounded-xl bg-primary">
              <Volume2 size={18} color="#fff" />
              <Text className="font-body-bold text-white">{audio.speaking ? 'Dừng phát âm' : 'Phát âm to rõ'}</Text>
            </Pressable>
          </View>
        )}

        {savedPhrases.value.length > 0 && (
          <View>
            <Text className="text-base font-body-bold text-ink">Câu đã lưu</Text>
            <View className="mt-3" style={{ gap: 10 }}>
              {savedPhrases.value.filter((phrase) => !phrase.targetLanguage || phrase.targetLanguage === otherLanguage).map((phrase) => (
                <Pressable
                  key={`${phrase.vi}|${phrase.translated}`}
                  onPress={() => { invalidateResult(); setReversed(false); setInput(phrase.vi);
                    if (phrase.targetLanguage) setResult({ translated: phrase.translated, phonetic: phrase.phonetic, engine: phrase.engine, sourceTerms: phrase.sourceTerms }); }}
                  className="min-h-[60px] flex-row items-center gap-3 rounded-lg border border-line bg-surface px-3 py-3"
                >
                  <Star size={18} color={colors.warning} fill={colors.warning} />
                  <Text className="flex-1 text-base font-body-bold text-ink">{phrase.vi}{!phrase.targetLanguage ? ' · Cần dịch lại để xác định ngôn ngữ' : ''}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {hasBundledPair(sourceLanguage, targetLanguage) && <BundledPhrasePanel reversed={reversed} onPick={(phrase) => onPickPhrase({ id: phrase.id, countryCode, vi: phrase.vi, translated: phrase.en, phonetic: '' }, 'bundled-phrase')} />}
        <View>
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-body-bold text-ink">{englishMode ? 'Mẫu câu Việt - Anh' : 'Mẫu câu khẩn cấp một chạm'}</Text>
            <Text className="text-[13px] text-muted">Chạm để dịch</Text>
          </View>
          <View className="mt-3" style={{ gap: 10 }}>
            {!englishMode && phrasesQuery.isError && <Text className="text-sm text-danger">Không tải được câu mẫu. Vui lòng thử lại khi có mạng.</Text>}
            {!englishMode && !phrasesQuery.isLoading && !phrasesQuery.isError && phrases.length === 0 && <Text className="text-sm text-muted">Chưa có câu mẫu cho ngôn ngữ này.</Text>}
            {phrases.map((phrase) => {
              const selected = selectedId === phrase.id;
              return (
                <Pressable
                  key={phrase.id}
                  onPress={() => onPickPhrase(phrase)}
                  className={`min-h-[60px] flex-row items-center gap-3 rounded-lg border px-3 py-3 ${selected ? 'border-[1.5px] border-primary' : 'border-line'} bg-surface`}
                >
                  <View className={`h-10 w-10 items-center justify-center rounded-md ${selected ? 'bg-primary' : 'bg-primary-soft'}`}>
                    <Languages size={18} color={selected ? '#fff' : colors.primary} />
                  </View>
                  <Text className="flex-1 text-[17px] font-body-bold text-ink">{reversed ? phrase.translated : phrase.vi}</Text>
                </Pressable>
              );
            })}
          </View>
          {englishMode && <View className="mt-3 gap-2">
            <Text className="text-xs text-muted">Câu mẫu: cộng đồng Tatoeba · {phrasebookLicense}. Không phải bản dịch được chứng nhận.</Text>
            <Pressable onPress={() => Linking.openURL(phrasebookLicenseUrl).catch(() => Alert.alert('Không mở được liên kết'))}><Text className="text-sm text-primary">Giấy phép và ghi công</Text></Pressable>
            {englishPhrases.filter((p) => String(p.enId) === selectedId).map((p) => <View key={p.enId} className="flex-row gap-4">
              <Pressable onPress={() => Linking.openURL(`https://tatoeba.org/en/sentences/show/${p.enId}`).catch(() => Alert.alert('Không mở được nguồn'))}><Text className="text-sm text-primary">Nguồn câu Anh</Text></Pressable>
              <Pressable onPress={() => Linking.openURL(`https://tatoeba.org/en/sentences/show/${p.viId}`).catch(() => Alert.alert('Không mở được nguồn'))}><Text className="text-sm text-primary">Nguồn câu Việt</Text></Pressable>
            </View>)}
          </View>}
        </View>
      </ScrollView>

      {result && <FullscreenTranslation text={result.translated} phonetic={result.phonetic} google={result.engine === 'mlkit'} visible={fullscreen} onClose={() => setFullscreen(false)} />}
    </View>
  );
}

// Nut phong to toan man hinh -- de dua dien thoai cho canh sat/nguoi ban dia
// doc, chu that lon (CLAUDE.md B7 muc 13). Cham bat cu dau de dong lai.
function FullscreenTranslation({
  text,
  phonetic,
  google,
  visible,
  onClose,
}: {
  text: string;
  phonetic: string;
  google: boolean;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-ink px-8" onPress={onClose} style={{ paddingTop: insets.top }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 90 }}><Text className="text-center font-display text-white" style={{ fontSize: 48, lineHeight: 56 }}>
          {text}
        </Text>
        {google && <Image source={require('../../../assets/translation/white-regular.png')} style={{ width: 176, height: 16, alignSelf: 'center', marginTop: 16 }} resizeMode="contain" accessibilityLabel="powered by Google Translate" />}
        {phonetic ? <Text className="mt-4 text-center font-mono text-xl text-white/85">{phonetic}</Text> : null}</ScrollView>
        <View className="absolute flex-row items-center gap-2" style={{ bottom: insets.bottom + 24 }}>
          <Shrink size={16} color="rgba(255,255,255,0.7)" />
          <Text className="text-sm text-white/70">Chạm để đóng</Text>
        </View>
      </Pressable>
    </Modal>
  );
}
