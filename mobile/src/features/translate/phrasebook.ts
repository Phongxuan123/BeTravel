import resources from './vi-en.json';

export const englishPhrases = resources.phrases;
export const phrasebookLicense = resources.license;
export const phrasebookLicenseUrl = resources.licenseUrl;
const normalize = (text: string) => text.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();

// Không bỏ dấu tiếng Việt hay ghép từng từ: có thể đổi hẳn nghĩa của câu.
export function findEnglishPhrase(text: string, from: string, to: string) {
  const source = ['vi', 'Tiếng Việt', 'Vietnamese'].includes(from) ? 'vi' : ['en', 'Tiếng Anh', 'English'].includes(from) ? 'en' : null;
  const target = ['vi', 'Tiếng Việt', 'Vietnamese'].includes(to) ? 'vi' : ['en', 'Tiếng Anh', 'English'].includes(to) ? 'en' : null;
  if (!source || !target || source === target) return null;
  const phrase = englishPhrases.find((item) => normalize(item[source]) === normalize(text));
  return phrase ? { translated: phrase[target], phonetic: '' } : null;
}
