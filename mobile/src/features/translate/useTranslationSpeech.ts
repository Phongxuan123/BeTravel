import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { matchingVoice } from './speechLocale';
import { getOfflineModule, splitTranslationText } from './offlineTranslation';

export function useTranslationSpeech(locale: string | null, offlineOnly = false) {
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const releaseAudio = () => {
    if (Platform.OS === 'ios')
      void getOfflineModule()
        ?.finishSpeech()
        .catch(() => {});
  };
  const cancel = useCallback(() => {
    const id = ++generation.current;
    if (mounted.current) {
      setSpeaking(false);
      setError(null);
    }
    void Speech.stop()
      .then(() => {
        if (id === generation.current && Platform.OS === 'ios') {
          return getOfflineModule()?.finishSpeech();
        }
      })
      .catch(() => {
        /* Không phát lại khi tác vụ đã bị hủy. */
      });
  }, []);
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') cancel();
    });
    return () => {
      mounted.current = false;
      cancel();
      subscription.remove();
    };
  }, [cancel]);
  useEffect(() => () => cancel(), [locale, offlineOnly, cancel]);

  const play = async (text: string) => {
    const id = ++generation.current;
    const current = () => mounted.current && id === generation.current;
    setError(null);
    if (!locale) {
      setError('Chưa hỗ trợ phát âm cho ngôn ngữ đã chọn.');
      return;
    }
    try {
      await Speech.stop();
      let voices = await Speech.getAvailableVoicesAsync();
      if (offlineOnly && Platform.OS === 'android') {
        const native = getOfflineModule();
        if (!native) throw new Error('Thiếu bản native để kiểm tra giọng offline.');
        const localIds = await native.offlineVoiceIds();
        voices = voices.filter((voice) => localIds.includes(voice.identifier));
      }
      if (!current() || AppState.currentState !== 'active') return;
      const voice = matchingVoice(voices, locale);
      if (!voice) {
        setSpeaking(false);
        setError('Thiết bị chưa có giọng đọc ngôn ngữ này. Hãy cài giọng đọc trong Cài đặt.');
        return;
      }
      setSpeaking(true);
      const sharedAudio = Platform.OS === 'ios' ? getOfflineModule() : null;
      if (sharedAudio) await sharedAudio.prepareSpeech();
      if (!current()) return;
      // Android giới hạn độ dài mỗi utterance. Chỉ xếp đoạn tiếp khi đoạn trước xong;
      // callback cũ không được đọc tiếp sau khi đổi ngôn ngữ hoặc hủy.
      const chunks = splitTranslationText(
        text,
        Math.min(Speech.maxSpeechInputLength || 1000, 1000),
      );
      const speakChunk = (index: number) => {
        if (!current()) return;
        if (index >= chunks.length) {
          setSpeaking(false);
          releaseAudio();
          return;
        }
        try {
          Speech.speak(chunks[index], {
            language: locale,
            voice: voice.identifier,
            useApplicationAudioSession: Boolean(sharedAudio),
            onDone: () => {
              speakChunk(index + 1);
            },
            onStopped: () => {
              if (current()) {
                setSpeaking(false);
                releaseAudio();
              }
            },
            onError: () => {
              if (current()) {
                setSpeaking(false);
                releaseAudio();
                setError('Không phát âm được. Kiểm tra âm lượng và giọng đọc trên thiết bị.');
              }
            },
          });
        } catch {
          if (current()) {
            setSpeaking(false);
            releaseAudio();
            setError('Không phát âm được đoạn tiếp theo. Hãy thử lại.');
          }
        }
      };
      speakChunk(0);
    } catch {
      if (current()) {
        setSpeaking(false);
        releaseAudio();
        setError('Không phát âm được. Vui lòng thử lại.');
      }
    }
  };
  return { speaking, error, play, cancel };
}
