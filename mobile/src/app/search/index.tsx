import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, MessageCircle, Search as SearchIcon, X, Check, CircleCheck, Sparkles } from 'lucide-react-native';
import { PageHeader } from '@/components/common/PageHeader';
import { ComingSoonScreen } from '@/components/common/ComingSoonScreen';
import { Button } from '@/components/ui/Button';
import { QuickChip } from '@/components/ui/QuickChip';
import { FilterChip } from '@/components/ui/FilterChip';
import { EmptyState } from '@/components/common/EmptyState';
import { SimpleSheet } from '@/components/common/SimpleSheet';
import { CountryFlag } from '@/components/brand/CountryFlag';
import { colors } from '@/lib/theme';
import { useCountry } from '@/lib/countryContext';
import { searchArticles, fetchTopics } from '@/lib/data';
import { isFeatureDisabledError } from '@/lib/api/http';

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const { countryCode, country } = useCountry();
  const [query, setQuery] = useState(params.q ?? '');
  const [debounced, setDebounced] = useState(query);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [pickingTopic, setPickingTopic] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const topicsQuery = useQuery({ queryKey: ['topics', countryCode], queryFn: () => fetchTopics(countryCode) });
  // Gợi ý lấy theo chủ đề đang có bài, tránh gợi ý một câu mà kho chưa có bài nào trả lời (B16).
  const topicWithArticles = topicsQuery.data?.data.find((topic) => topic.count > 0);
  // Gợi ý lấy từ chủ đề thật của quốc gia (chỉ chủ đề đã có bài), không cố định trong code (V-17).
  const suggestionTopics = (topicsQuery.data?.data ?? []).filter((topic) => topic.count > 0).slice(0, 4);
  const searchPlaceholder = topicWithArticles
    ? `Ví dụ: ${topicWithArticles.label.toLowerCase()}`
    : 'Nhập từ khoá cần tìm';
  const resultsQuery = useQuery({
    queryKey: ['search', debounced, countryCode],
    queryFn: () => searchArticles(debounced, countryCode),
    enabled: debounced.trim().length > 0,
  });

  // searchArticles() giu nguyen chu ky (query, countryCode) de dong bo voi
  // mocks/client.ts (CLAUDE.md B3 muc 9) -- loc theo chu de o phia client
  // thay vi them tham so moi cho ham API.
  const allResults = resultsQuery.data?.data ?? [];
  const results = topicFilter ? allResults.filter((r) => r.topicLabel === topicFilter) : allResults;
  const hasQuery = debounced.trim().length > 0;
  const hasResults = results.length > 0;
  const hasError = resultsQuery.isError;

  // Tra cuu phap luat dang bi phong toa o backend: chan ca man thay vi bao nham loi mang.
  if (isFeatureDisabledError(resultsQuery.error)) {
    return <ComingSoonScreen title="Tìm quy định" detail={resultsQuery.error.message} />;
  }

  return (
    <View className="flex-1 bg-bg">
      <PageHeader title="Tìm kiếm pháp lý" subtitle="Tra cứu quy định pháp luật sở tại bằng tiếng Việt" />
      <View className="border-b border-line bg-surface px-[18px] pb-3 pt-3">
        <View className={`h-14 flex-row items-center rounded-lg border bg-bg px-4 ${query ? 'border-primary' : 'border-line'}`}>
          <SearchIcon size={20} color={colors.primary} />
          <TextInput
            className="ml-2.5 flex-1 text-base text-ink"
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.subtle}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <Pressable accessibilityLabel="Xóa" onPress={() => setQuery('')} className="h-11 w-11 items-center justify-center rounded-md bg-[#F3F4F6]">
              <X size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          <View className="flex-row" style={{ gap: 8 }}>
            <FilterChip label={`Quốc gia: ${country?.name ?? ''}`} active iconLeft={<CountryFlag code={countryCode} width={18} height={13} />} />
            <FilterChip label={`Chủ đề: ${topicFilter ?? 'Tất cả'}`} active={!!topicFilter} showChevron onPress={() => setPickingTopic(true)} />
          </View>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 48 }}>
        {!hasQuery && (
          <Text className="text-center text-muted">Nhập từ khoá để tìm quy định pháp luật.</Text>
        )}

        {hasQuery && hasError && (
          <View className="rounded-md bg-danger-tint p-4">
            <Text className="text-center text-sm text-danger-strong">Không thể tìm kiếm lúc này. Kiểm tra kết nối mạng và thử lại.</Text>
          </View>
        )}

        {hasQuery && !hasError && hasResults && (
          <>
            <Text className="mb-3 text-[13px] text-muted">
              Tìm thấy {results.length} kết quả phù hợp · {country?.name}
            </Text>
            <View style={{ gap: 12 }}>
              {results.map((r) => (
                <Pressable key={r.id} className="rounded-2xl border border-line bg-surface p-4" onPress={() => router.push(`/explore/${r.countryCode}/${r.slug}` as never)}>
                  <View className="flex-row flex-wrap items-center" style={{ columnGap: 6 }}>
                    <Text className="text-xs font-body-bold text-primary-strong">{country?.name}</Text>
                    <Text className="text-xs text-muted">· {r.topicLabel}</Text>
                    <View className="flex-row items-center" style={{ gap: 3 }}>
                      <CircleCheck size={13} color={colors.successStrong} />
                      <Text className="text-xs font-body-bold text-success-strong">Đã xác minh</Text>
                    </View>
                  </View>
                  <View className="mt-1.5 flex-row items-start justify-between" style={{ gap: 8 }}>
                    <Text className="flex-1 text-base font-body-bold text-ink">{r.title}</Text>
                    <ArrowUpRight size={18} color={colors.primary} />
                  </View>
                  <Text className="mt-1 text-sm leading-relaxed text-muted" numberOfLines={3}>
                    {r.summary}
                  </Text>
                  <View className="mt-3 h-px bg-line" />
                  <Text className="mt-3 text-xs text-subtle" numberOfLines={1}>
                    Nguồn: {r.source}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="mt-4 flex-row items-center rounded-2xl bg-primary-soft p-4" style={{ gap: 12 }}>
              <View className="flex-1">
                <Text className="text-sm font-body-bold text-ink">Cần phân tích tình huống cụ thể của bạn?</Text>
                <Text className="mt-0.5 text-xs text-muted">Be.Travel AI trả lời kèm trích dẫn nguồn đã kiểm chứng.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/chat?q=${encodeURIComponent(query)}` as never)}
                className="min-h-[44px] flex-row items-center justify-center rounded-2xl bg-primary px-4"
                style={{ gap: 6 }}
              >
                <Sparkles size={16} color="#fff" />
                <Text className="text-sm font-body-bold text-white">Hỏi AI</Text>
              </Pressable>
            </View>
          </>
        )}

        {hasQuery && !hasError && !hasResults && !resultsQuery.isLoading && (
          <View>
            <Text className="mb-3 text-[13px] text-muted">Tìm thấy 0 kết quả phù hợp</Text>
            <EmptyState
              title="Không tìm thấy thông tin phù hợp"
              description={`Chưa có bài viết cố định khớp với từ khóa "${debounced.trim()}". Hãy thử từ khóa gợi ý bên dưới hoặc hỏi trực tiếp Trợ lý AI pháp lý.`}
            >
              <Button label="Hỏi AI" iconLeft={<MessageCircle size={18} color="#fff" />} onPress={() => router.push(`/chat?q=${encodeURIComponent(query)}` as never)} />
              <Button label="Xem tất cả chủ đề" variant="secondary" onPress={() => router.push('/explore')} />
            </EmptyState>

            {suggestionTopics.length > 0 && (
              <>
                <Text className="mb-3 mt-4 text-sm font-body-bold text-ink">Từ khóa gợi ý</Text>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {suggestionTopics.map((topic) => (
                    <QuickChip key={topic.key} label={topic.label} onPress={() => setQuery(topic.label)} />
                  ))}
                </View>
              </>
            )}

            <Text className="mb-3 mt-5 text-sm font-body-bold text-ink">Chủ đề phổ biến</Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {(topicsQuery.data?.data ?? []).slice(0, 6).map((topic) => (
                <QuickChip key={topic.key} label={topic.label} onPress={() => router.push('/explore')} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <SimpleSheet visible={pickingTopic} onClose={() => setPickingTopic(false)} title="Chọn chủ đề">
        <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: topicFilter === null }}
            onPress={() => {
              setTopicFilter(null);
              setPickingTopic(false);
            }}
            className={`h-14 flex-row items-center justify-between rounded-lg border px-4 ${topicFilter === null ? 'border-[1.5px] border-primary bg-bg' : 'border-line bg-surface'}`}
          >
            <Text className="text-base font-body-semibold text-ink">Tất cả chủ đề</Text>
            {topicFilter === null && <Check size={18} color={colors.primary} />}
          </Pressable>
          {topicsQuery.data?.data.map((topic) => {
            const selected = topic.label === topicFilter;
            return (
              <Pressable
                key={topic.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => {
                  setTopicFilter(topic.label);
                  setPickingTopic(false);
                }}
                className={`h-14 flex-row items-center justify-between rounded-lg border px-4 ${selected ? 'border-[1.5px] border-primary bg-bg' : 'border-line bg-surface'}`}
              >
                <Text className="text-base font-body-semibold text-ink">{topic.label}</Text>
                {selected && <Check size={18} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      </SimpleSheet>
    </View>
  );
}
