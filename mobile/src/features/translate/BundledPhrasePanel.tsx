import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { travelPhrases } from './bundledTranslation';

type Phrase = (typeof travelPhrases)[number];
type Props = { reversed: boolean; onPick: (phrase: Phrase) => void };
const searchKey = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
const categories = ['Tất cả', ...new Set(travelPhrases.map((phrase) => phrase.category))];

export function BundledPhrasePanel({ reversed, onPick }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [limit, setLimit] = useState(8);
  const matches = travelPhrases.filter(
    (phrase) =>
      (category === 'Tất cả' || phrase.category === category) &&
      searchKey(`${phrase.vi} ${phrase.en}`).includes(searchKey(query.trim())),
  );
  return (
    <View className="gap-3 rounded-lg border border-line bg-surface p-4">
      <Text className="text-base font-body-bold text-ink">
        Câu thông dụng có sẵn ({travelPhrases.length})
      </Text>
      <Text className="text-sm text-muted">
        Dùng ngay khi mất mạng. Chạm câu để xem, sao chép hoặc phát âm.
      </Text>
      <TextInput
        accessibilityLabel="Tìm câu thông dụng"
        placeholder="Tìm câu: taxi, khách sạn, hộ chiếu..."
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          setLimit(8);
        }}
        className="min-h-12 rounded-md border border-line px-3 text-ink"
      />
      <View className="flex-row flex-wrap gap-2">
        {categories.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: category === item }}
            onPress={() => {
              setCategory(item);
              setLimit(8);
            }}
            className={`min-h-11 justify-center rounded-md px-3 ${category === item ? 'bg-primary-soft' : 'bg-bg'}`}
          >
            <Text className="text-primary-strong">{item}</Text>
          </Pressable>
        ))}
      </View>
      {matches.slice(0, limit).map((phrase) => (
        <Pressable
          key={phrase.id}
          accessibilityRole="button"
          onPress={() => onPick(phrase)}
          className="min-h-12 justify-center rounded-md border border-line p-3"
        >
          <Text className="font-body-bold text-ink">{reversed ? phrase.en : phrase.vi}</Text>
          <Text className="mt-1 text-sm text-muted">{reversed ? phrase.vi : phrase.en}</Text>
        </Pressable>
      ))}
      {!matches.length && (
        <Text className="text-muted">Không có câu phù hợp. Thử từ khóa khác.</Text>
      )}
      {matches.length > limit && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setLimit((value) => value + 8)}
          className="min-h-12 justify-center"
        >
          <Text className="font-body-bold text-primary-strong">
            Xem thêm câu ({matches.length - limit})
          </Text>
        </Pressable>
      )}
      <Text className="text-xs text-muted">
        Câu giao tiếp do BeTravel biên soạn; không phải bản dịch được chứng nhận.
      </Text>
    </View>
  );
}
