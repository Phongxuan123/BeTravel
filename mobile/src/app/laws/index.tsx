import { useState } from 'react';
import { View, Text, FlatList, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react-native';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { FilterChip } from '@/components/ui/FilterChip';
import { TextField } from '@/components/ui/TextField';
import { colors } from '@/lib/theme';
import { LawRow } from '@/features/laws/LawRow';
import { isFeatureDisabledError } from '@/lib/api/http';
import {
  AU_COLLECTIONS,
  AU_NAME_VI_NOTICE,
  AU_SCOPE_NOTICE,
  fetchAuLaws,
  fetchAuLawTopics,
} from '@/lib/api/auLaws';

export default function AustraliaLawsScreen() {
  const params = useLocalSearchParams<{ topic?: string }>();
  const [topic, setTopic] = useState<string>(params.topic ?? '');
  const [draftQuery, setDraftQuery] = useState('');
  const [query, setQuery] = useState('');
  const [collection, setCollection] = useState<string>('Act');
  const [inForce, setInForce] = useState(true);

  const topicsQuery = useQuery({ queryKey: ['au-law-topics'], queryFn: fetchAuLawTopics, retry: false });
  const activeTopic = topicsQuery.data?.find((item) => item.slug === topic);

  const lawsQuery = useInfiniteQuery({
    queryKey: ['au-laws', query, collection, topic, inForce],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchAuLaws({ q: query, collection, topic, inForce, page: pageParam }),
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });

  const laws = lawsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const disabled = isFeatureDisabledError(lawsQuery.error);

  const header = (
    <View style={{ gap: 12 }} className="pb-3">
      <View className="rounded-md bg-amber-soft p-3">
        <Text className="text-xs text-warning-strong">{AU_SCOPE_NOTICE}</Text>
        <Text className="mt-1.5 text-xs text-warning-strong">{AU_NAME_VI_NOTICE}</Text>
      </View>
      <TextField
        placeholder="Tìm theo tên văn bản (tiếng Anh), vd: migration"
        value={draftQuery}
        onChangeText={setDraftQuery}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={() => setQuery(draftQuery.trim())}
        iconLeft={<Search size={20} color={colors.subtle} />}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row" style={{ gap: 8 }}>
          <FilterChip label="Tất cả mục" active={!topic} onPress={() => setTopic('')} />
          {topicsQuery.data?.map((item) => (
            <FilterChip
              key={item.slug}
              label={item.label}
              active={topic === item.slug}
              onPress={() => setTopic(topic === item.slug ? '' : item.slug)}
            />
          ))}
        </View>
      </ScrollView>
      {activeTopic && <Text className="text-xs text-muted">{activeTopic.note}</Text>}
      {/* Trong một mục luật gồm cả Act lẫn văn bản dưới luật nên không lọc theo loại văn bản. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row" style={{ gap: 8 }}>
          {!topic && AU_COLLECTIONS.map((item) => (
            <FilterChip
              key={item.value}
              label={item.label}
              active={collection === item.value}
              onPress={() => setCollection(collection === item.value ? '' : item.value)}
            />
          ))}
          <FilterChip label="Đang có hiệu lực" active={inForce} onPress={() => setInForce((value) => !value)} />
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View className="flex-1 bg-bg">
      <PageHeader title="Luật liên bang Úc" subtitle="Tra cứu từ nguồn chính thức, chỉ đọc" />
      <FlatList
        data={laws}
        keyExtractor={(law) => law.id}
        contentContainerStyle={{ padding: 18, paddingBottom: 48, gap: 10 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        renderItem={({ item }) => <LawRow law={item} />}
        ListEmptyComponent={
          lawsQuery.isLoading ? (
            <Text className="py-6 text-center text-sm text-muted">Đang tải…</Text>
          ) : lawsQuery.isError ? (
            <Text className="py-6 text-center text-sm text-danger-strong">
              {disabled ? 'Tra cứu pháp luật đang tạm ngưng. Vui lòng quay lại sau.' : 'Không tải được dữ liệu. Kiểm tra kết nối mạng.'}
            </Text>
          ) : (
            <EmptyState title="Không có văn bản nào khớp" description="Thử đổi từ khóa hoặc bộ lọc." />
          )
        }
        ListFooterComponent={
          lawsQuery.hasNextPage ? (
            <Button
              label="Tải thêm"
              variant="secondary"
              loading={lawsQuery.isFetchingNextPage}
              onPress={() => lawsQuery.fetchNextPage()}
            />
          ) : null
        }
      />
    </View>
  );
}
