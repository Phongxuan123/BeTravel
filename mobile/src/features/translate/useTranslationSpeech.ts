import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Speech from 'expo-speech';
import { matchingVoice } from './speechLocale';

export function useTranslationSpeech(locale: string | null) {
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const cancel = useCallback(() => {
    generation.current += 1;
    if (mounted.current) {
      setSpeaking(false);
      setError(null);
    }
    void Speech.stop().catch(() => {
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
  useEffect(() => () => cancel(), [locale, cancel]);

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
      const voices = await Speech.getAvailableVoicesAsync();
      if (!current() || AppState.currentState !== 'active') return;
      const voice = matchingVoice(voices, locale);
      if (!voice) {
        setSpeaking(false);
        setError('Thiết bị chưa có giọng đọc ngôn ngữ này. Hãy cài giọng đọc trong Cài đặt.');
        return;
      }
      setSpeaking(true);
      Speech.speak(text, {
        language: locale,
        voice: voice.identifier,
        useApplicationAudioSession: false,
        onDone: () => {
          if (current()) setSpeaking(false);
        },
        onStopped: () => {
          if (current()) setSpeaking(false);
        },
        onError: () => {
          if (current()) {
            setSpeaking(false);
            setError('Không phát âm được. Kiểm tra âm lượng và giọng đọc trên thiết bị.');
          }
        },
      });
    } catch {
      if (current()) {
        setSpeaking(false);
        setError('Không phát âm được. Vui lòng thử lại.');
      }
    }
  };
  return { speaking, error, play, cancel };
}
