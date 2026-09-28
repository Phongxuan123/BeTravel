// Giới hạn tên ngôn ngữ để không chèn chỉ dẫn tùy ý vào prompt.
export const TRANSLATION_LANGUAGES = {
  vi: ["Vietnamese", "Tiếng Việt"],
  en: ["English", "Tiếng Anh"],
  ko: ["Korean", "Tiếng Hàn"],
  ja: ["Japanese", "Tiếng Nhật"],
  th: ["Thai", "Tiếng Thái"],
  zh: ["Chinese", "Tiếng Trung"],
  fr: ["French", "Tiếng Pháp"],
  de: ["German", "Tiếng Đức"],
};

export function normalizeLanguage(value) {
  const normalized = value.normalize("NFC").trim().toLowerCase();
  const code = normalized.split("-")[0];
  if (Object.hasOwn(TRANSLATION_LANGUAGES, code) && /^[a-z]{2}(?:-[a-z]{2})?$/.test(normalized))
    return code;
  return Object.keys(TRANSLATION_LANGUAGES).find((key) =>
    TRANSLATION_LANGUAGES[key].some((label) => label.toLowerCase() === normalized),
  );
}
