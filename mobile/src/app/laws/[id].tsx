import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react-native';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { colors } from '@/lib/theme';
import { LawSummaryBlock } from '@/features/laws/LawSummaryBlock';
import { openUrl } from '@/lib/openExternal';
import {
  AU_LAW_CONTENT_PAGE_SIZE,
  AU_SCOPE_NOTICE,
  fetchAuLaw,
  fetchAuLawContent,
  fetchAuLawContentVi,
  type AuLawBlock,
} from '@/lib/api/auLaws';

type LawView = 'summary' | 'original';

export default function AustraliaLawDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Mặc định đọc tóm tắt; người dùng bấm "Nguyên bản" khi muốn đọc toàn văn.
  const [view, setView] = useState<LawView>('summary');
  const [translate, setTranslate] = useState(false);
  const lawQuery = useQuery({ queryKey: ['au-law', id], queryFn: () => fetchAuLaw(id), enabled: !!id, retry: false });
  const law = lawQuery.data;

  return (
    <View className="flex-1 bg-bg">
      <PageHeader title={law?.nameVi ?? law?.name ?? 'Văn bản luật Úc'} subtitle={law?.id} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 48, gap: 16 }}>
        <View className="rounded-md bg-amber-soft p-3">
          <Text className="text-xs text-warning-strong">{AU_SCOPE_NOTICE}</Text>
        </View>

        {lawQuery.isLoading && <Text className="py-6 text-center text-sm text-muted">Đang tải…</Text>}
        {lawQuery.isError && (
          <Text className="py-6 text-center text-sm text-danger">Không tải được văn bản. Kiểm tra kết nối mạng.</Text>
        )}

        {law && (
          <>
            <View className="rounded-2xl border border-line bg-surface p-4" style={{ gap: 10 }}>
              <Text className="text-base font-body-bold text-ink">{law.nameVi ?? law.name}</Text>
              {law.nameVi ? <Text className="text-xs text-muted">{law.name}</Text> : null}
              <Badge label={law.isInForce ? 'Đang có hiệu lực' : (law.status ?? 'Hết hiệu lực')} tone={law.isInForce ? 'success' : 'neutral'} />
              <InfoLine label="Mã văn bản" value={law.id} />
              <InfoLine label="Loại" value={law.collection} />
              <InfoLine label="Ngày ban hành" value={law.makingDate} />
              <InfoLine label="Năm / số" value={law.year && law.number ? `${law.year} / ${law.number}` : null} />
              <InfoLine label="Phiên bản (bản biên soạn)" value={law.version?.compilationNumber} />
              <InfoLine label="Mã đăng ký phiên bản" value={law.version?.registerId} />
              <InfoLine label="Phiên bản có hiệu lực từ" value={law.version?.startDate} />
            </View>

            <Button
              label="Mở nguồn chính thức"
              variant="secondary"
              iconLeft={<ExternalLink size={18} color={colors.ink} />}
              onPress={() => openUrl(law.officialUrl)}
            />

            {law.hasReadableText ? (
              <>
                <SegmentedTabs<LawView>
                  options={[
                    { value: 'summary', label: 'Tóm tắt' },
                    { value: 'original', label: 'Nguyên bản' },
                  ]}
                  value={view}
                  onChange={setView}
                />
                {view === 'summary' && <LawSummaryBlock id={law.id} />}
                {view === 'original' && law.canTranslate && (
                  <Button
                    label={translate ? 'Xem bản gốc tiếng Anh' : 'Dịch sang tiếng Việt'}
                    variant="soft"
                    onPress={() => setTranslate((value) => !value)}
                  />
                )}
                {view === 'original' && <ContentViewer id={law.id} translate={translate} />}
              </>
            ) : (
              <Text className="text-sm text-muted">
                Văn bản này chưa có bản đọc được qua API (chỉ PDF/Word). Xem bản chính thức theo liên kết ở trên.
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View>
      <Text className="text-[11px] text-muted">{label}</Text>
      <Text className="text-sm text-ink">{value}</Text>
    </View>
  );
}

function ContentViewer({ id, translate }: { id: string; translate: boolean }) {
  const contentQuery = useInfiniteQuery({
    queryKey: ['au-law', id, 'content', translate ? 'vi' : 'en'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => (translate ? fetchAuLawContentVi(id, pageParam) : fetchAuLawContent(id, pageParam)),
    getNextPageParam: (last) => {
      const nextOffset = last.offset + AU_LAW_CONTENT_PAGE_SIZE;
      return nextOffset < last.totalBlocks ? nextOffset : undefined;
    },
    retry: false,
  });

  if (contentQuery.isLoading) {
    return <Text className="py-6 text-center text-sm text-muted">
        {translate ? 'Đang dịch sang tiếng Việt (lần đầu có thể mất vài chục giây)…' : 'Đang tải văn bản (lần đầu có thể mất vài giây)…'}
      </Text>;
  }
  if (contentQuery.isError) {
    return <Text className="py-6 text-center text-sm text-danger">{translate ? 'Chưa dịch được lúc này. Thử lại sau hoặc xem bản gốc.' : 'Không tải được nội dung. Thử lại sau.'}</Text>;
  }

  const blocks = contentQuery.data?.pages.flatMap((page) => page.blocks) ?? [];
  const total = contentQuery.data?.pages[0]?.totalBlocks ?? 0;
  const translationNotice = contentQuery.data?.pages[0]?.translationNotice;

  return (
    <View style={{ gap: 12 }}>
      {translate && translationNotice && (
        <View className="rounded-md bg-amber-soft p-3">
          <Text className="text-xs text-warning-strong">{translationNotice}</Text>
        </View>
      )}
      <View className="rounded-2xl border border-line bg-surface p-4">
        {blocks.map((block) => (
          <BlockLine key={block.citationId} block={block} translate={translate} />
        ))}
      </View>
      <Text className="text-center text-xs text-muted">
        Đã tải {blocks.length}/{total} đoạn
      </Text>
      {contentQuery.hasNextPage && (
        <Button
          label="Tải thêm"
          variant="secondary"
          loading={contentQuery.isFetchingNextPage}
          onPress={() => contentQuery.fetchNextPage()}
        />
      )}
    </View>
  );
}

function BlockLine({ block, translate }: { block: AuLawBlock; translate: boolean }) {
  const style =
    block.kind === 'heading' ? 'font-body-bold text-ink' : block.kind === 'note' ? 'text-xs italic text-muted' : 'text-ink';
  // Chế độ dịch: tiếng Việt là chính, bản gốc tiếng Anh nhỏ bên dưới để đối chiếu; đoạn chưa dịch hiện bản gốc.
  if (translate && block.textVi) {
    return (
      <View className="py-1.5">
        <Text className={`text-sm ${style}`}>{block.textVi}</Text>
        <Text className="text-[11px] text-muted">{block.text}</Text>
      </View>
    );
  }
  return <Text className={`py-1 text-sm ${style}`}>{block.text}</Text>;
}
