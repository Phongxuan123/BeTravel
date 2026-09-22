import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Search, Bookmark, Star, Plus, ChevronRight, FileText, IdCard, CircleDollarSign, Shield, BriefcaseBusiness, Car, Users } from 'lucide-react-native';
import { AppShell, APP_SHELL_CONTENT_BOTTOM_PADDING } from '@/components/common/AppShell';
import { IconButton } from '@/components/ui/IconButton';
import { IconTile, type Tone } from '@/components/ui/IconTile';
import { FilterChip } from '@/components/ui/FilterChip';
import { Badge } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/common/SectionHeader';
import { CountryFlag } from '@/components/brand/CountryFlag';
import { colors } from '@/lib/theme';
import { useCountry } from '@/lib/countryContext';
import { fetchTopics, fetchArticles } from '@/lib/data';
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
  const { countryCode, country } = useCountry();
  const [savedOnly, setSavedOnly] = useState(params.saved === '1');

  const topicsQuery = useQuery({ queryKey: ['topics', countryCode], queryFn: () => fetchTopics(countryCode) });
  const articlesQuery = useQuery({ queryKey: ['articles', countryCode, savedOnly], queryFn: () => fetchArticles(countryCode, { savedOnly }) });

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
            <FilterChip label={country?.name ?? ''} active iconLeft={<CountryFlag code={countryCode} width={18} height={13} />} showChevron />
            <FilterChip label="Chủ đề" showChevron />
            <FilterChip label="Đã lưu" active={savedOnly} iconLeft={<Bookmark size={14} color={savedOnly ? '#fff' : colors.ink} />} onPress={() => setSavedOnly((v) => !v)} />
          </View>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: APP_SHELL_CONTENT_BOTTOM_PADDING, gap: 24 }}>
        {!savedOnly && (
          <View>
            <Text className="mb-3 text-base font-body-bold text-ink">Chủ đề pháp lý</Text>
            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              {topicsQuery.data?.data.map((topic) => {
                const meta = TOPIC_ICON[topic.iconKey];
                const Icon = meta.icon;
                return (
                  <Pressable key={topic.key} style={{ width: '47%' }} className="rounded-lg border border-line bg-surface p-3.5">
                    <IconTile tone={meta.tone} size={44}>
                      <Icon size={20} color={colors.primary} />
                    </IconTile>
                    <Text className="mt-2 text-[17px] font-body-bold text-ink">{topic.label}</Text>
                    <Text className="text-sm text-muted">{topic.count} quy định</Text>
                  </Pressable>
                );
              })}
              <Pressable style={{ width: '47%' }} className="items-start rounded-lg border border-dashed border-[#C9D6EE] bg-[#FAFCFF] p-3.5">
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
          <SectionHeader title={savedOnly ? 'Quy định đã lưu' : 'Đọc nhiều tuần này'} actionLabel={savedOnly ? undefined : 'Xem tất cả'} />
          <View className="mt-3" style={{ gap: 12 }}>
            {articlesQuery.data?.data.map((article) => (
              <ArticleCard key={article.id} article={article} countryCode={countryCode} topicLabel={topicsQuery.data?.data.find((t) => t.key === article.topicKey)?.label} />
            ))}
          </View>
        </View>
      </ScrollView>
    </AppShell>
  );
}

function ArticleCard({ article, countryCode, topicLabel }: { article: Article; countryCode: string; topicLabel?: string }) {
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
        <View className={`h-10 w-10 items-center justify-center rounded-md ${article.saved ? 'bg-warning-soft' : 'bg-[#F0F4F9]'}`}>
          <Star size={18} color={article.saved ? colors.warning : colors.muted} fill={article.saved ? colors.warning : 'none'} />
        </View>
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
