const LOCALES: Record<string, string> = {
  'tiếng việt': 'vi-VN',
  vi: 'vi-VN',
  'tiếng anh': 'en-US',
  en: 'en-US',
  'tiếng hàn': 'ko-KR',
  ko: 'ko-KR',
  'tiếng nhật': 'ja-JP',
  ja: 'ja-JP',
  'tiếng thái': 'th-TH',
  th: 'th-TH',
  'tiếng trung': 'zh-CN',
  zh: 'zh-CN',
  'tiếng pháp': 'fr-FR',
  fr: 'fr-FR',
  'tiếng đức': 'de-DE',
  de: 'de-DE',
};

// Ngôn ngữ đến từ lựa chọn dịch, không suy đoán từ mã quốc gia.
export function speechLocale(label: string): string | null {
  return LOCALES[label.trim().toLowerCase()] ?? null;
}

export function matchingVoice<T extends { language: string }>(
  voices: T[],
  locale: string,
): T | undefined {
  const normalized = locale.toLowerCase().replace(/_/g, '-');
  const normalize = (value: string) => value.toLowerCase().replace(/_/g, '-');
  return (
    voices.find((voice) => normalize(voice.language) === normalized) ??
    voices.find((voice) => normalize(voice.language).split('-')[0] === normalized.split('-')[0])
  );
}
