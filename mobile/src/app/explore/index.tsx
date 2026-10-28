import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Search, Bookmark, Check, CircleCheck, Map as MapIcon, Languages, TriangleAlert } from 'lucide-react-native';
import { AppShell, useAppShellBottomPadding } from '@/components/common/AppShell';
import { FilterChip } from '@/components/ui/FilterChip';
import { SectionHeader } from '@/components/common/SectionHeader';
import { SimpleSheet } from '@/components/common/SimpleSheet';
import { ComingSoonScreen } from '@/components/common/ComingSoonScreen';
import { TopInsetView } from '@/components/common/screenTopInset';
import { CountryFlag } from '@/components/brand/CountryFlag';
import { colors } from '@/lib/theme';
import { useCountry } from '@/lib/countryContext';
import { fetchTopics, fetchArticles, fetchCountries } from '@/lib/data';
import { AuLawsSection } from '@/features/laws/AuLawsSection';
import { AU_COUNTRY_CODE } from '@/lib/api/auLaws';
import { useSavedArticles } from '@/features/explore/useSavedArticles';
import { isFeatureDisabledError } from '@/lib/api/http';
import type { Article } from '@/lib/data';

// Lối tắt công cụ dưới thanh tìm kiếm (spec 3.5).
const TOOL_SHORTCUTS = [
  { label: 'Bản đồ hỗ trợ', hint: 'ĐSQ & Cảnh sát', href: '/sos/map', icon: MapIcon },
  { label: 'Dịch khẩn cấp', hint: 'Mẫu câu phát âm', href: '/translate', icon: Languages },
  { label: 'Xử lý sự cố', hint: 'Hướng dẫn từng bước', href: '/incidents', icon: TriangleAlert },
] as const;

export default function ExploreScreen() {
  const bottomPadding = useAppShellBottomPadding();
  const params = useLocalSearchParams<{ saved?: string }>();
  const { countryCode: travelCountryCode } = useCountry();
  // Bộ lọc quốc gia của Khám phá chỉ là state cục bộ, không đổi quốc gia toàn app (BUG-17).
  const [filterCountryCode, setCountryCode] = useState('');
  const [savedOnly, setSavedOnly] = useState(params.saved === '1');
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [pickingCountry, setPickingCountry] = useState(false);

  const { isSaved, toggleSaved } = useSavedArticles();

  const countriesQuery = useQuery({ queryKey: ['countries'], queryFn: fetchCountries });
  const countryCode = filterCountryCode || travelCountryCode;
  const country = countriesQuery.data?.data.find((c) => c.code === countryCode);
  // enabled: !!countryCode -- countryCode rong trong luc CountryProvider con
  // dang xac dinh quoc gia mac dinh (xem lib/countryContext.tsx). Thieu guard
  // nay thi goi API voi countryCode rong, backend tra 400 VALIDATION_ERROR va
  // man hinh hien nham banner "Kiem tra ket noi mang" ngay khi vao app, phai
  // tu chon quoc gia moi het (cung mau voi app/index.tsx#L79).
  const topicsQuery = useQuery({
    queryKey: ['topics', countryCode],
    queryFn: () => fetchTopics(countryCode),
    enabled: !!countryCode,
  });
  const useServerSavedFilter = savedOnly && process.env.EXPO_PUBLIC_USE_MOCKS !== 'true';
  const articlesQuery = useQuery({
    queryKey: ['articles', countryCode, topicFilter, savedOnly],
    queryFn: () => fetchArticles(countryCode, { topicKey: topicFilter ?? undefined, savedOnly: useServerSavedFilter }),
    enabled: !!countryCode,
  });
  const visibleArticles = (articlesQuery.data?.data ?? []).filter(
    (article) => !savedOnly || useServerSavedFilter || isSaved(article.id),
  );

  const disabledError = [topicsQuery.error, articlesQuery.error].find(isFeatureDisabledError);

  // Tra cuu phap luat dang bi phong toa o backend: chan ca man, khong hien noi dung rong/loi mang.
  if (disabledError) {
    return (
      <AppShell active="explore">
        <ComingSoonScreen title="Cẩm nang pháp luật" detail={disabledError.message} showHeader={false} />
      </AppShell>
    );
  }

  return (
    <AppShell active="explore">
      <TopInsetView extra={16} className="border-b border-line bg-surface px-[18px] pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="font-display text-ink" style={{ fontSize: 26 }}>
              Cẩm nang pháp luật
            </Text>
            <Text className="text-xs text-muted" numberOfLines={2}>
              Quy định pháp luật du lịch đã xác minh, có nguồn trích dẫn
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/search')}
            className="ml-3 min-h-[44px] flex-row items-center justify-center rounded-2xl bg-primary-soft px-3"
            style={{ gap: 6 }}
          >
            <Search size={16} color={colors.primary} />
            <Text className="text-[13px] font-body-bold text-primary-strong">Tìm nâng cao</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => router.push('/search')} className="mt-3 h-12 flex-row items-center rounded-lg border border-line bg-bg px-4">
          <Search size={20} color={colors.subtle} />
          <Text className="ml-2.5 flex-1 text-sm text-subtle" numberOfLines={1}>
            Tìm luật giao thông, hộ chiếu, hải quan...
          </Text>
          <View className="rounded-xl bg-primary-soft px-3 py-1.5">
            <Text className="text-xs font-body-bold text-primary-strong">Bộ lọc</Text>
          </View>
        </Pressable>
        <View className="mt-3 flex-row" style={{ gap: 8 }}>
          {TOOL_SHORTCUTS.map(({ label, hint, href, icon: Icon }) => (
            <Pressable
              key={label}
              accessibilityRole="button"
              onPress={() => router.push(href)}
              className="min-h-[56px] flex-1 justify-center rounded-2xl border border-line bg-surface px-2.5 py-2"
            >
              <Icon size={16} color={colors.primary} />
              <Text className="mt-1 text-xs font-body-bold text-ink" numberOfLines={1}>{label}</Text>
              <Text className="text-[10px] text-muted" numberOfLines={1}>{hint}</Text>
            </Pressable>
          ))}
        </View>
        <View className="mt-4 flex-row flex-wrap items-center justify-between" style={{ columnGap: 8, rowGap: 2 }}>
          <Text className="text-xs font-body-bold text-ink">Lọc theo quốc gia và danh mục</Text>
          <Text className="shrink text-[11px] text-muted">Chỉ hiển thị nội dung đã xác minh</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
          <View className="flex-row" style={{ gap: 8 }}>
            <FilterChip
              label={country?.name ?? ''}
              active
              iconLeft={<CountryFlag code={countryCode} width={18} height={13} />}
              showChevron
              onPress={() => setPickingCountry(true)}
            />
            <FilterChip label="Tất cả" active={!topicFilter && !savedOnly} onPress={() => { setTopicFilter(null); setSavedOnly(false); }} />
            {topicsQuery.data?.data.map((topic) => (
              <FilterChip
                key={topic.key}
                label={topic.label}
                active={topicFilter === topic.key}
                onPress={() => setTopicFilter(topicFilter === topic.key ? null : topic.key)}
              />
            ))}
            <FilterChip label="Đã lưu" active={savedOnly} iconLeft={<Bookmark size={14} color={savedOnly ? '#fff' : colors.ink} />} onPress={() => setSavedOnly((v) => !v)} />
          </View>
        </ScrollView>
      </TopInsetView>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: bottomPadding, gap: 24 }}>
        {(!countryCode || topicsQuery.isLoading || articlesQuery.isLoading) && (
          <Text className="text-center text-sm text-muted">Đang tải…</Text>
        )}
        {(topicsQuery.isError || articlesQuery.isError) && (
          <View className="rounded-md bg-danger-tint p-3">
            <Text className="text-center text-sm text-danger-strong">Không tải được dữ liệu. Kiểm tra kết nối mạng.</Text>
            <Pressable accessibilityRole="button" className="mt-1 min-h-[44px] items-center justify-center" onPress={() => { void topicsQuery.refetch(); void articlesQuery.refetch(); }}>
              <Text className="font-body-bold text-primary-strong">Thử lại</Text>
            </Pressable>
          </View>
        )}

        <View>
          <SectionHeader
            title={
              articlesQuery.isLoading
                ? 'Bài viết pháp lý'
                : `Hiển thị ${visibleArticles.length} bài viết ${savedOnly ? 'đã lưu' : 'pháp lý đã xác minh'}`
            }
            actionLabel={topicFilter || savedOnly ? 'Đặt lại bộ lọc' : undefined}
            onAction={() => {
              setTopicFilter(null);
              setSavedOnly(false);
            }}
          />
          <View className="mt-3" style={{ gap: 12 }}>
            {!articlesQuery.isLoading && !articlesQuery.isError && visibleArticles.length === 0 && (
              <Text className="text-sm text-muted">
                {savedOnly ? 'Chưa có quy định đã lưu trong mục này.' : 'Chưa có quy định được xuất bản trong mục này.'}
              </Text>
            )}
            {visibleArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                countryCode={countryCode}
                countryName={country?.name}
                topicLabel={topicsQuery.data?.data.find((t) => t.key === article.topicKey)?.label}
                saved={isSaved(article.id)}
                onToggleSaved={() => toggleSaved(article.id)}
              />
            ))}
          </View>
        </View>

        {countryCode === AU_COUNTRY_CODE && <AuLawsSection />}
      </ScrollView>

      <SimpleSheet visible={pickingCountry} onClose={() => setPickingCountry(false)} title="Chọn quốc gia">
        <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
          {countriesQuery.data?.data.map((c) => {
            const selected = c.code === countryCode;
            const comingSoon = c.status === 'coming_soon';
            return (
              <Pressable
                key={c.code}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => {
                  setCountryCode(c.code);
                  setPickingCountry(false);
                }}
                className={`h-16 flex-row items-center rounded-lg border px-3 ${selected ? 'border-[1.5px] border-primary bg-[#F5F9FF]' : 'border-line bg-surface'}`}
              >
                <CountryFlag code={c.code} width={36} height={26} />
                <View className="ml-3 flex-1">
                  <Text className="text-base font-body-semibold text-ink">{c.name}</Text>
                  {comingSoon && <Text className="text-xs text-muted">Sắp ra mắt — chưa có cẩm nang pháp luật</Text>}
                </View>
                {selected && <Check size={18} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      </SimpleSheet>

    </AppShell>
  );
}

function ArticleCard({
  article,
  countryCode,
  countryName,
  topicLabel,
  saved,
  onToggleSaved,
}: {
  article: Article;
  countryCode: string;
  countryName?: string;
  topicLabel?: string;
  saved: boolean;
  onToggleSaved: () => void;
}) {
  return (
    <Pressable
      className="rounded-lg border border-line bg-surface p-4"
      onPress={() => router.push(`/explore/${countryCode}/${article.slug}` as never)}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row flex-wrap items-center" style={{ columnGap: 6 }}>
          <Text className="text-xs font-body-bold text-primary-strong">{countryName ?? ''}</Text>
          {topicLabel && <Text className="text-xs text-muted">· {topicLabel}</Text>}
          <View className="flex-row items-center" style={{ gap: 3 }}>
            <CircleCheck size={13} color={colors.successStrong} />
            <Text className="text-xs font-body-bold text-success-strong">Đã xác minh</Text>
          </View>
        </View>
        <Pressable
          accessibilityLabel={saved ? 'Bỏ lưu quy định' : 'Lưu quy định'}
          hitSlop={8}
          onPress={onToggleSaved}
          className={`h-10 w-10 items-center justify-center rounded-md ${saved ? 'bg-primary-soft' : 'bg-[#F3F4F6]'}`}
        >
          <Bookmark size={18} color={saved ? colors.primary : colors.muted} fill={saved ? colors.primary : 'none'} />
        </Pressable>
      </View>
      <Text className="mt-2 text-base font-body-bold text-ink">{article.title}</Text>
      <Text className="mt-1 text-sm leading-relaxed text-muted" numberOfLines={2}>
        {article.summary}
      </Text>
      <View className="mt-3 h-px bg-line" />
      <Text className="mt-3 text-[13px] text-subtle" numberOfLines={1}>
        {article.source.agency} · Cập nhật {article.updatedAt}
      </Text>
    </Pressable>
  );
}
