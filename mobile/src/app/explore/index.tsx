import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Search, Bookmark, Check, ShieldCheck, Map as MapIcon, Languages, TriangleAlert, SlidersHorizontal } from 'lucide-react-native';
import { AppShell, APP_SHELL_CONTENT_BOTTOM_PADDING } from '@/components/common/AppShell';
import { IconButton } from '@/components/ui/IconButton';
import { FilterChip } from '@/components/ui/FilterChip';
import { Badge } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/common/SectionHeader';
import { SimpleSheet } from '@/components/common/SimpleSheet';
import { ComingSoonScreen } from '@/components/common/ComingSoonScreen';
import { TopInsetView } from '@/components/common/screenTopInset';
import { CountryFlag } from '@/components/brand/CountryFlag';
import { colors } from '@/lib/theme';
import { useCountry } from '@/lib/countryContext';
import { fetchTopics, fetchArticles, fetchCountries } from '@/lib/data';
import { useSavedArticles } from '@/features/explore/useSavedArticles';
import { isFeatureDisabledError } from '@/lib/api/http';
import type { Article } from '@/lib/data';

// Lối tắt công cụ dưới thanh tìm kiếm (spec 3.5).
const TOOL_SHORTCUTS = [
  { label: 'Bản đồ hỗ trợ', href: '/sos/map', icon: MapIcon },
  { label: 'Dịch khẩn cấp', href: '/translate', icon: Languages },
  { label: 'Xử lý sự cố', href: '/incidents', icon: TriangleAlert },
] as const;

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ saved?: string }>();
  const { countryCode, setCountryCode, country } = useCountry();
  const [savedOnly, setSavedOnly] = useState(params.saved === '1');
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [pickingCountry, setPickingCountry] = useState(false);

  const { isSaved, toggleSaved } = useSavedArticles();

  const countriesQuery = useQuery({ queryKey: ['countries'], queryFn: fetchCountries });
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
          <Text className="font-display text-ink" style={{ fontSize: 26 }}>
            Cẩm nang pháp luật
          </Text>
          <IconButton accessibilityLabel="Đã lưu" variant="soft" icon={<Bookmark size={20} color={colors.primary} />} onPress={() => setSavedOnly((v) => !v)} />
        </View>
        <Pressable onPress={() => router.push('/search')} className="mt-3 h-12 flex-row items-center rounded-lg border border-line bg-bg px-4">
          <Search size={20} color={colors.subtle} />
          <Text className="ml-2.5 flex-1 text-sm text-subtle">Tìm quy định...</Text>
          <SlidersHorizontal size={18} color={colors.primary} />
        </Pressable>
        <View className="mt-3 flex-row" style={{ gap: 8 }}>
          {TOOL_SHORTCUTS.map(({ label, href, icon: Icon }) => (
            <Pressable
              key={label}
              accessibilityRole="button"
              onPress={() => router.push(href)}
              className="min-h-[44px] flex-1 items-center justify-center rounded-lg bg-primary-soft px-1"
              style={{ gap: 2 }}
            >
              <Icon size={18} color={colors.primaryStrong} />
              <Text className="text-[11px] font-body-bold text-primary-strong" numberOfLines={1}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
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

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: APP_SHELL_CONTENT_BOTTOM_PADDING, gap: 24 }}>
        {(!countryCode || topicsQuery.isLoading || articlesQuery.isLoading) && (
          <Text className="text-center text-sm text-muted">Đang tải…</Text>
        )}
        {(topicsQuery.isError || articlesQuery.isError) && (
          <View className="rounded-md bg-danger-tint p-3">
            <Text className="text-center text-sm text-danger">Không tải được dữ liệu. Kiểm tra kết nối mạng.</Text>
          </View>
        )}

        <View>
          <SectionHeader
            title={savedOnly ? 'Quy định đã lưu' : 'Quy định đã xác minh'}
            actionLabel={!savedOnly && topicFilter ? 'Xem tất cả' : undefined}
            onAction={() => setTopicFilter(null)}
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
                topicLabel={topicsQuery.data?.data.find((t) => t.key === article.topicKey)?.label}
                saved={isSaved(article.id)}
                onToggleSaved={() => toggleSaved(article.id)}
              />
            ))}
          </View>
        </View>
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
  topicLabel,
  saved,
  onToggleSaved,
}: {
  article: Article;
  countryCode: string;
  topicLabel?: string;
  saved: boolean;
  onToggleSaved: () => void;
}) {
  const { country } = useCountry();
  return (
    <Pressable
      className="rounded-lg border border-line bg-surface p-4"
      onPress={() => router.push(`/explore/${countryCode}/${article.slug}` as never)}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row" style={{ gap: 8 }}>
          <Badge label={country?.name ?? ''} tone="info" />
          {topicLabel && <Badge label={topicLabel} tone="neutral" />}
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
      <View className="mt-3 flex-row items-center" style={{ gap: 8 }}>
        <View className="flex-row items-center" style={{ gap: 4 }}>
          <ShieldCheck size={14} color={colors.successStrong} />
          <Text className="text-xs font-body-bold text-success-strong">Đã xác minh</Text>
        </View>
        <Text className="flex-1 text-[13px] text-subtle" numberOfLines={1}>
          {article.source.agency} · {article.updatedAt}
        </Text>
      </View>
    </Pressable>
  );
}
