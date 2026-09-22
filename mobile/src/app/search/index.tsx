import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, MessageCircle, Search as SearchIcon, X } from 'lucide-react-native';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { QuickChip } from '@/components/ui/QuickChip';
import { FilterChip } from '@/components/ui/FilterChip';
import { EmptyState } from '@/components/common/EmptyState';
import { CountryFlag } from '@/components/brand/CountryFlag';
import { colors } from '@/lib/theme';
import { useCountry } from '@/lib/countryContext';
import { searchArticles } from '@/lib/data';

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const { countryCode, country } = useCountry();
  const [query, setQuery] = useState(params.q ?? '');
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const resultsQuery = useQuery({
    queryKey: ['search', debounced, countryCode],
    queryFn: () => searchArticles(debounced, countryCode),
    enabled: debounced.trim().length > 0,
  });

  const results = resultsQuery.data?.data ?? [];
  const hasQuery = debounced.trim().length > 0;
  const hasResults = results.length > 0;

  return (
    <View className="flex-1 bg-bg">
      <PageHeader title="Bạn muốn tìm gì?" />
      <View className="border-b border-line bg-surface px-[18px] pb-3 pt-3">
        <View className={`h-14 flex-row items-center rounded-lg border bg-[#F9FBFD] px-4 ${query ? 'border-primary' : 'border-line'}`}>
          <SearchIcon size={20} color={colors.primary} />
          <TextInput
            className="ml-2.5 flex-1 text-base text-ink"
            placeholder="Tìm quy định..."
            placeholderTextColor={colors.subtle}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <Pressable accessibilityLabel="Xoá" onPress={() => setQuery('')} className="h-11 w-11 items-center justify-center rounded-md bg-[#F0F4F9]">
              <X size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          <View className="flex-row" style={{ gap: 8 }}>
            <FilterChip label={country?.name ?? ''} active iconLeft={<CountryFlag code={countryCode} width={18} height={13} />} />
            <FilterChip label="Chủ đề" showChevron />
          </View>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 48 }}>
        {!hasQuery && (
          <Text className="text-center text-muted">Nhập từ khoá để tìm quy định pháp luật.</Text>
        )}

        {hasQuery && hasResults && (
          <>
            <Text className="mb-3 text-[15px] text-muted">
              {results.length} kết quả · lọc theo <Text className="font-body-bold text-ink">{country?.name}</Text>
            </Text>
            <View style={{ gap: 12 }}>
              {results.map((r) => (
                <Pressable key={r.id} className="rounded-lg border border-line bg-surface p-[18px]" onPress={() => router.push(`/explore/${r.countryCode}/${r.slug}` as never)}>
                  <Text className="text-[18px] font-body-bold text-ink">{r.title}</Text>
                  <Text className="mt-1 text-[15px] text-muted" numberOfLines={3}>
                    {r.summary}
                  </Text>
                  <View className="mt-3 flex-row items-center justify-between">
                    <View className="flex-1 flex-row items-center" style={{ gap: 8 }}>
                      <Badge label={r.topicLabel} tone="neutral" />
                      <Text className="flex-1 text-[13px] text-subtle" numberOfLines={2}>
                        {r.source}
                      </Text>
                    </View>
                    <Text className="text-base font-body-bold text-primary">Xem chi tiết ›</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <Pressable
              className="mt-4 flex-row items-center rounded-lg bg-primary-soft p-4"
              onPress={() => router.push(`/chat?q=${encodeURIComponent(query)}` as never)}
            >
              <View className="h-10 w-10 items-center justify-center rounded-md bg-white">
                <MessageCircle size={20} color={colors.primary} />
              </View>
              <Text className="ml-3 flex-1 text-[15px] font-body-semibold text-primary-strong">
                Chưa đúng ý bạn? Hỏi AI Legal Assistant bằng tiếng Việt.
              </Text>
              <View className="h-10 w-10 items-center justify-center rounded-md bg-primary">
                <ArrowRight size={18} color="#fff" />
              </View>
            </Pressable>
          </>
        )}

        {hasQuery && !hasResults && !resultsQuery.isLoading && (
          <View>
            <EmptyState
              title="Không tìm thấy quy định phù hợp"
              description={`Chúng tôi chưa có văn bản nào khớp với truy vấn này cho ${country?.name}.`}
            >
              <Button label="Hỏi AI Legal Assistant" iconLeft={<MessageCircle size={18} color="#fff" />} onPress={() => router.push(`/chat?q=${encodeURIComponent(query)}` as never)} />
              <Button label="Xem tất cả chủ đề" variant="secondary" onPress={() => router.push('/explore')} />
            </EmptyState>

            <Text className="mb-3 mt-4 text-[11px] font-body-bold uppercase tracking-wider text-muted">CÓ THỂ BẠN CẦN</Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {['Thuốc mang theo người', 'Hàng cấm nhập cảnh', 'Khai báo hải quan'].map((s) => (
                <QuickChip key={s} label={s} onPress={() => setQuery(s)} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
