import dictionary from './data/dictionary-vi-en.json';
import travel from './data/travel-phrases.json';
import { englishPhrases } from './phrasebook';

export const travelPhrases = travel.phrases;
export const dictionaryInfo = {
  count: dictionary.entries.length,
  source: dictionary.source,
  sourceUrl: dictionary.sourceUrl,
  license: dictionary.license,
  licenseUrl: dictionary.licenseUrl,
};
export type TranslationEngine = 'bundled-phrase' | 'bundled-vocabulary' | 'bundled-dictionary' | 'mlkit';
export type TranslationResult = {
  translated: string;
  phonetic: string;
  engine?: TranslationEngine;
  sourceTerms?: string[];
};
const normalize = (text: string) =>
  text.normalize('NFC').trim().replace(/\s+/gu, ' ').toLowerCase();
const phraseKey = (text: string) =>
  normalize(text)
    .replace(/[.!?]+$/u, '')
    .trim();
export const hasBundledPair = (source: string | null, target: string | null) =>
  (source === 'vi' && target === 'en') || (source === 'en' && target === 'vi');

const pairs = [...travelPhrases, ...englishPhrases];
function lookupPhrase(text: string, source: 'vi' | 'en', target: 'vi' | 'en') {
  return pairs.find((phrase) => phraseKey(phrase[source]) === phraseKey(text))?.[target];
}

type DictionaryMatch = { value: string; term: string };
let indexes: { vi: Map<string, DictionaryMatch[]>; en: Map<string, DictionaryMatch[]> } | null =
  null;
function dictionaryIndexes() {
  if (indexes) return indexes;
  indexes = { vi: new Map(), en: new Map() };
  // Tạo chỉ mục một lần khi tra từ; không ghép các mục từ để giả lập dịch câu.
  for (const [vi, en] of dictionary.entries) {
    for (const [language, key, value] of [
      ['vi', vi, en],
      ['en', en, vi],
    ] as const) {
      const matches = indexes[language].get(normalize(key)) ?? [];
      if (!matches.some((match) => match.value === value)) matches.push({ value, term: vi });
      indexes[language].set(normalize(key), matches);
    }
  }
  return indexes;
}

export function translateBundled(
  text: string,
  source: string,
  target: string,
): TranslationResult | null {
  if (!hasBundledPair(source, target)) return null;
  const from = source as 'vi' | 'en';
  const to = target as 'vi' | 'en';
  const exact = lookupPhrase(text, from, to);
  if (exact) return { translated: exact, phonetic: '', engine: 'bundled-phrase' };
  // Chỉ dịch đoạn khi MỌI câu đều có bản dịch; không bỏ câu lạ, phủ định hoặc con số.
  const sentences = text
    .trim()
    .replace(/([.!?])\s+/gu, '$1\n')
    .split(/\n+/u)
    .filter(Boolean);
  if (sentences.length > 1) {
    const translated = sentences.map((sentence) => lookupPhrase(sentence, from, to));
    if (translated.every((sentence) => sentence !== undefined)) {
      return { translated: translated.join(' '), phonetic: '', engine: 'bundled-phrase' };
    }
    return null;
  }
  const coreWord = travel.vocabulary.find((word) => normalize(word[from]) === normalize(text));
  if (coreWord) return { translated: coreWord[to], phonetic: '', engine: 'bundled-vocabulary' };
  const matches = dictionaryIndexes()[from].get(normalize(text));
  if (!matches?.length) return null;
  return {
    translated: matches.map((match) => match.value).join('; '),
    phonetic: '',
    engine: 'bundled-dictionary',
    sourceTerms: [...new Set(matches.map((match) => match.term))],
  };
}
