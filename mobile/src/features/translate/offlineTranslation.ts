import { requireOptionalNativeModule } from 'expo';
import { speechLocale } from './speechLocale';

export const OFFLINE_TEXT_LIMIT = 5000;
export const ONLINE_TEXT_LIMIT = 500;
export const TRANSLATION_CHUNK_LIMIT = 450;
export const NATIVE_TRANSLATION_MESSAGE =
  'Dịch offline cần bản cài đặt native mới của Be.Travel, không chạy trong Expo Go.';

export type OfflineTranslationModule = {
  installedLanguages(): Promise<string[]>;
  prepare(source: string, target: string, cellular: boolean): Promise<void>;
  translate(text: string, source: string, target: string): Promise<string>;
  deleteLanguage(language: string): Promise<void>;
  offlineVoiceIds(): Promise<string[]>;
  openVoiceSettings(): Promise<void>;
  prepareSpeech(): Promise<void>;
  finishSpeech(): Promise<void>;
};

export function getOfflineModule(): OfflineTranslationModule | null {
  return requireOptionalNativeModule<OfflineTranslationModule>('BeTravelTranslation');
}

export function translationLanguage(label: string): string | null {
  return speechLocale(label)?.split('-')[0] ?? null;
}

export function hasLanguagePair(installed: string[], source: string, target: string): boolean {
  // ML Kit dùng tiếng Anh làm cầu nối; chỉ các gói không phải Anh cần tải riêng.
  return [source, target].every((language) => language === 'en' || installed.includes(language));
}

// Giữ nguyên mọi ký tự, ưu tiên ngắt câu/từ. Không cắt đôi surrogate pair.
export function splitTranslationText(text: string, limit = TRANSLATION_CHUNK_LIMIT): string[] {
  if (limit < 2) throw new Error('Giới hạn đoạn phải ít nhất 2 ký tự.');
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > limit) {
    const window = rest.slice(0, limit);
    const boundaries = [...window.matchAll(/[.!?。！？\n]\s*|\s+/gu)];
    const last = boundaries.at(-1);
    let end = last && last.index! > limit / 2 ? last.index! + last[0].length : limit;
    if (/[\uD800-\uDBFF]/.test(rest[end - 1])) end -= 1;
    chunks.push(rest.slice(0, end));
    rest = rest.slice(end);
  }
  if (rest) chunks.push(rest);
  return chunks;
}

export async function translateOffline(
  text: string,
  source: string,
  target: string,
  current: () => boolean,
  progress: (done: number, total: number) => void,
): Promise<{ translated: string; phonetic: string }> {
  if (!text.trim() || text.length > OFFLINE_TEXT_LIMIT)
    throw new Error('Nhập từ 1 đến 5.000 ký tự.');
  const native = getOfflineModule();
  if (!native) throw new Error(NATIVE_TRANSLATION_MESSAGE);
  if (!hasLanguagePair(await native.installedLanguages(), source, target)) {
    throw new Error(
      'Chưa có đủ gói dịch. Hãy tải gói ngôn ngữ khi còn mạng trước khi dùng offline.',
    );
  }
  const chunks = splitTranslationText(text);
  const translated: string[] = [];
  for (const [index, chunk] of chunks.entries()) {
    if (!current()) throw new Error('Đã hủy dịch.');
    const value = chunk.trim() ? await native.translate(chunk.trim(), source, target) : '';
    if (!current()) throw new Error('Đã hủy dịch.');
    if (chunk.trim() && !value.trim())
      throw new Error('Gói ngôn ngữ trả bản dịch rỗng. Hãy thử lại.');
    translated.push(value + (chunk.match(/\s+$/u)?.[0] ?? (index < chunks.length - 1 ? ' ' : '')));
    progress(index + 1, chunks.length);
  }
  return { translated: translated.join('').trim(), phonetic: '' };
}
