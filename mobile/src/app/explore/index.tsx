import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Search, Bookmark, Star, Plus, ChevronRight, Check, FileText, IdCard, CircleDollarSign, Shield, BriefcaseBusiness, Car, Users } from 'lucide-react-native';
import { AppShell, APP_SHELL_CONTENT_BOTTOM_PADDING } from '@/components/common/AppShell';
import { IconButton } from '@/components/ui/IconButton';
import { IconTile, type Tone } from '@/components/ui/IconTile';
import { FilterChip } from '@/components/ui/FilterChip';
import { Badge } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/common/SectionHeader';
import { SimpleSheet } from '@/components/common/SimpleSheet';
import { CountryFlag } from '@/components/brand/CountryFlag';
import { colors } from '@/lib/theme';
import { useCountry } from '@/lib/countryContext';
import { fetchTopics, fetchArticles, fetchCountries } from '@/lib/data';
import { useSavedArticles } from '@/features/explore/useSavedArticles';
import type { Topic, Article } from '@/mocks/schemas';

const TOPIC_ICON: Record<Topic['iconKey'], { icon: typeof FileText; tone: Tone }> = {
  entry: { icon: BriefcaseBusiness, tone: 'blue' },
  traffic: { icon: Car, tone: 'blue' },
  public: { icon: Users, tone: 'blue' },
  documents: { icon: IdCard, tone: 'blue' },
  fines: { icon: CircleDollarSign, tone: 'orange' },
  security: { icon: Shield, tone: 'red' },
};

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ saved?: string }>();
  const { countryCode, setCountryCode, country } = useCountry();
  const [savedOnly, setSavedOnly] = useState(params.saved === '1');
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [pickingCountry, setPickingCountry] = useState(false);
  const [pickingTopic, setPickingTopic] = useState(false);

  const { isSaved, toggleSaved } = useSavedArticles();

  const countriesQuery = useQuery({ queryKey: ['countries'], queryFn: fetchCountries });
  const topicsQuery = useQuery({ queryKey: ['topics', countryCode], queryFn: () => fetchTopics(countryCode) });
  // "Da luu" duoc loc CLIENT-SIDE sau khi fetch (favorites la mot nguon du
  // lieu rieng, khong phai tham so loc cua API bai luat) -- content.ts luon
  // tra rong cho tham so nay.
  const articlesQuery = useQuery({
    queryKey: ['articles', countryCode, topicFilter],
    queryFn: () => fetchArticles(countryCode, { topicKey: topicFilter ?? undefined }),
  });
  const visibleArticles = (articlesQuery.data?.data ?? []).filter((a) => !savedOnly || isSaved(a.id));

  const topicFilterLabel = topicsQuery.data?.data.find((t) => t.key === topicFilter)?.label ?? 'Chủ đề';

  const onPickTopic = (key: string | null) => {
    setTopicFilter(key);
    setPickingTopic(false);
  };

  return (
    <AppShell active="explore">
      <View className="border-b border-line bg-surface px-[18px] pb-4 pt-4">
        <View className="flex-row items-center justify-between">
          <Text className="font-display text-ink" style={{ fontSize: 26 }}>
            Cẩm nang pháp luật
          </Text>
          <IconButton accessibilityLabel="Đã lưu" variant="soft" icon={<Bookmark size={20} color={colors.primary} />} onPress={() => setSavedOnly((v) => !v)} />
        </View>
        <Pressable onPress={() => router.push('/search')} className="mt-3 h-14 flex-row items-center rounded-lg border border-line bg-[#F9FBFD] px-4">
          <Search size={20} color={colors.subtle} />
          <Text className="ml-2.5 text-base text-subtle">Tìm quy định...</Text>
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          <View className="flex-row" style={{ gap: 8 }}>
            <FilterChip
              label={country?.name ?? ''}
              active
              iconLeft={<CountryFlag code={countryCode} width={18} height={13} />}
              showChevron
              onPress={() => setPickingCountry(true)}
            />
            <FilterChip label={topicFilterLabel} active={!!topicFilter} showChevron onPress={() => setPickingTopic(true)} />
            <FilterChip label="Đã lưu" active={savedOnly} iconLeft={<Bookmark size={14} color={savedOnly ? '#fff' : colors.ink} />} onPress={() => setSavedOnly((v) => !v)} />
          </View>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: APP_SHELL_CONTENT_BOTTOM_PADDING, gap: 24 }}>
        {(topicsQuery.isError || articlesQuery.isError) && (
          <View className="rounded-md bg-danger-tint p-3">
            <Text className="text-center text-sm text-danger">Không tải được dữ liệu. Kiểm tra kết nối mạng.</Text>
          </View>
        )}

        {!savedOnly && (
          <View>
            <Text className="mb-3 text-base font-body-bold text-ink">Chủ đề pháp lý</Text>
            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              {topicsQuery.data?.data.map((topic) => {
                const meta = TOPIC_ICON[topic.iconKey];
                const Icon = meta.icon;
                return (
                  <Pressable
                    key={topic.key}
                    style={{ width: '47%' }}
                    className="rounded-lg border border-line bg-surface p-3.5"
                    onPress={() => setTopicFilter(topic.key)}
                  >
                    <IconTile tone={meta.tone} size={44}>
                      <Icon size={20} color={colors.primary} />
                    </IconTile>
                    <Text className="mt-2 text-[17px] font-body-bold text-ink">{topic.label}</Text>
                    <Text className="text-sm text-muted">{topic.count} quy định</Text>
                  </Pressable>
                );
              })}
              <Pressable
                style={{ width: '47%' }}
                className="items-start rounded-lg border border-dashed border-[#C9D6EE] bg-[#FAFCFF] p-3.5"
                onPress={() => setPickingTopic(true)}
              >
                <IconTile tone="blue" size={44}>
                  <Plus size={20} color={colors.primary} />
                </IconTile>
                <View className="mt-2 flex-row items-center" style={{ gap: 4 }}>
                  <Text className="text-base font-body-bold text-ink">Chủ đề khác</Text>
                  <ChevronRight size={16} color={colors.muted} />
                </View>
              </Pressable>
            </View>
          </View>
        )}

        <View>
          <SectionHeader
            title={savedOnly ? 'Quy định đã lưu' : 'Đọc nhiều tuần này'}
            actionLabel={!savedOnly && topicFilter ? 'Xem tất cả' : undefined}
            onAction={() => setTopicFilter(null)}
          />
          <View className="mt-3" style={{ gap: 12 }}>
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
                className={`h-16 flex-row items-center rounded-lg border px-3 ${selected ? 'border-[1.5px] border-primary bg-[#F4F8FF]' : 'border-line bg-surface'}`}
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

      <SimpleSheet visible={pickingTopic} onClose={() => setPickingTopic(false)} title="Chọn chủ đề">
        <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: topicFilter === null }}
            onPress={() => onPickTopic(null)}
            className={`h-14 flex-row items-center justify-between rounded-lg border px-4 ${topicFilter === null ? 'border-[1.5px] border-primary bg-[#F4F8FF]' : 'border-line bg-surface'}`}
          >
            <Text className="text-base font-body-semibold text-ink">Tất cả chủ đề</Text>
            {topicFilter === null && <Check size={18} color={colors.primary} />}
          </Pressable>
          {topicsQuery.data?.data.map((topic) => {
            const selected = topic.key === topicFilter;
            return (
              <Pressable
                key={topic.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => onPickTopic(topic.key)}
                className={`h-14 flex-row items-center justify-between rounded-lg border px-4 ${selected ? 'border-[1.5px] border-primary bg-[#F4F8FF]' : 'border-line bg-surface'}`}
              >
                <Text className="text-base font-body-semibold text-ink">{topic.label}</Text>
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
          className={`h-10 w-10 items-center justify-center rounded-md ${saved ? 'bg-warning-soft' : 'bg-[#F0F4F9]'}`}
        >
          <Star size={18} color={saved ? colors.warning : colors.muted} fill={saved ? colors.warning : 'none'} />
        </Pressable>
      </View>
      <Text className="mt-2 text-[18px] font-body-bold text-ink">{article.title}</Text>
      <Text className="mt-1 text-[15px] text-muted" numberOfLines={2}>
        {article.summary}
      </Text>
      <View className="mt-3 h-px bg-line" />
      <View className="mt-3 flex-row items-center" style={{ gap: 8 }}>
        <Badge label="Đang hiệu lực" tone="success" dot />
        <Text className="flex-1 text-[13px] text-subtle" numberOfLines={1}>
          {article.source.agency} · {article.updatedAt}
        </Text>
      </View>
    </Pressable>
  );
}
