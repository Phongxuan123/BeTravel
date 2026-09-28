import { englishPhrases, findEnglishPhrase } from '../phrasebook';

test.each(englishPhrases)('câu $enId dịch đúng hai chiều, không cần API', (phrase) => {
  expect(findEnglishPhrase(phrase.vi, 'vi', 'en')?.translated).toBe(phrase.en);
  expect(findEnglishPhrase(phrase.en, 'English', 'Tiếng Việt')?.translated).toBe(phrase.vi);
});

test('chuẩn hóa Unicode/khoảng trắng, giữ dấu và không thay nghĩa câu khác', () => {
  const phrase = englishPhrases[0];
  expect(findEnglishPhrase(`  ${phrase.vi.normalize('NFD')}  `, 'vi', 'en')?.translated).toBe(phrase.en);
  expect(findEnglishPhrase('Toi khong hieu.', 'vi', 'en')).toBeNull();
  expect(findEnglishPhrase('I do not understand French.', 'en', 'vi')).toBeNull();
  expect(findEnglishPhrase(phrase.vi, 'vi', 'vi')).toBeNull();
  expect(findEnglishPhrase(phrase.vi, 'vi', 'ko')).toBeNull();
});
