import { requireOptionalNativeModule } from 'expo';

export type RecognitionModule =
  typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;

// Không import runtime của thư viện: Expo Go/binary cũ thiếu module vẫn mở màn dịch.
export function getRecognitionModule(): RecognitionModule | null {
  return requireOptionalNativeModule<RecognitionModule>('ExpoSpeechRecognition');
}
