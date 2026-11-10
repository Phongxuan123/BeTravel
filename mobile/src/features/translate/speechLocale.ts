const LOCALES: Record<string, string> = {
  'tiếng việt': 'vi-VN',
  vi: 'vi-VN',
  'tiếng anh': 'en-US',
  en: 'en-US',
  'tiếng hàn': 'ko-KR',
  ko: 'ko-KR',
  kor: 'ko-KR',
  korean: 'ko-KR',
  '한국어': 'ko-KR',
  'ko-kr': 'ko-KR',
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
  return LOCALES[label.trim().normalize('NFC').toLowerCase().replace(/_/g, '-')] ?? null;
}

export function matchingVoice<T extends { language: string }>(
  voices: T[],
  locale: string,
): T | undefined {
  // Một số engine trả mã ISO 639-2 cho tiếng Hàn.
  const normalize = (value: string) => value.trim().toLowerCase().replace(/_/g, '-').replace(/^kor(?=-|$)/, 'ko').replace(/^ko-kor(?=-|$)/, 'ko-kr');
  const normalized = normalize(locale);
  return (
    voices.find((voice) => normalize(voice.language) === normalized) ??
    voices.find((voice) => normalize(voice.language).split('-')[0] === normalized.split('-')[0])
  );
}
