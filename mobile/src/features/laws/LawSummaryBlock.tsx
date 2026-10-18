import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/Badge';
import { fetchAuLawSummary } from '@/lib/api/auLaws';

const OUTLINE_PREVIEW_COUNT = 8;
const SUMMARY_STALE_TIME_MS = 24 * 60 * 60 * 1000;
// Tóm tắt từng phần được sinh nền: hỏi lại định kỳ cho tới khi xong.
const GENERATING_POLL_MS = 15_000;

/*
 * Tóm lược nội dung chính của một luật Úc. Phần "Mục đích" và "Cấu trúc chính" lấy thẳng
 * từ văn bản chính thức; phần tiếng Việt do AI diễn giải CHỈ từ hai phần đó và luôn gắn nhãn AI.
 * Lỗi tải tóm lược không chặn các phần còn lại của màn chi tiết.
 */
export function LawSummaryBlock({ id }: { id: string }) {
  const [showAllOutline, setShowAllOutline] = useState(false);
  const summaryQuery = useQuery({
    queryKey: ['au-law-summary', id],
    queryFn: () => fetchAuLawSummary(id),
    retry: false,
    staleTime: SUMMARY_STALE_TIME_MS,
    refetchInterval: (query) => (query.state.data?.deepStatus === 'generating' ? GENERATING_POLL_MS : false),
  });

  if (summaryQuery.isLoading) {
    return <Text className="py-2 text-sm text-muted">Đang tạo tóm lược (lần đầu có thể mất vài chục giây)…</Text>;
  }
  if (summaryQuery.isError || !summaryQuery.data) {
    return <Text className="py-2 text-sm text-muted">Chưa tải được tóm lược. Bạn vẫn có thể đọc nội dung bên dưới.</Text>;
  }

  const { purpose, outline, outlineTruncated, summaryVi, disclaimer, deepStatus, deepSummary } = summaryQuery.data;
  const visibleOutline = showAllOutline ? outline : outline.slice(0, OUTLINE_PREVIEW_COUNT);

  return (
    <View className="rounded-2xl border border-line bg-surface p-4" style={{ gap: 12 }}>
      <Text className="text-base font-body-bold text-ink">Tóm lược nội dung chính</Text>

      {summaryVi && (
        <View style={{ gap: 8 }}>
          <Badge label="AI diễn giải bằng tiếng Việt" tone="info" />
          <Text className="text-sm text-ink">{summaryVi.summary}</Text>
          {summaryVi.keyPoints.map((point) => (
            <Text key={point} className="text-sm text-ink">
              {'\u2022 '}
              {point}
            </Text>
          ))}
        </View>
      )}

      {deepStatus === 'generating' && (
        <Text className="text-sm text-muted">Đang chuẩn bị tóm tắt chi tiết từng phần, vài phút nữa sẽ hiện tại đây…</Text>
      )}
      {deepSummary && deepSummary.parts.length > 0 && (
        <View style={{ gap: 12 }}>
          <Text className="text-sm font-body-bold text-ink">Tóm tắt nội dung từng phần</Text>
          {deepSummary.parts.map((part) => (
            <View key={part.citationId} className="rounded-xl bg-bg p-3" style={{ gap: 6 }}>
              <Text className="text-xs font-body-bold text-primary">{part.heading}</Text>
              <Text className="text-sm text-ink">{part.summary}</Text>
              {part.keyPoints.map((point) => (
                <Text key={point.text} className="text-sm text-ink">
                  {'• '}
                  {point.text}
                </Text>
              ))}
              {part.partial && <Text className="text-[11px] text-muted">Phần này dài: tóm tắt dựa trên các điều đầu tiên.</Text>}
            </View>
          ))}
          {(deepSummary.skippedParts > 0 || deepSummary.truncated) && (
            <Text className="text-[11px] text-muted">
              Một số phần chưa có tóm tắt (chưa qua kiểm tra nguồn hoặc quá dài). Xem nội dung gốc để biết đầy đủ.
            </Text>
          )}
        </View>
      )}

      {purpose && (
        <View style={{ gap: 2 }}>
          <Text className="text-[11px] text-muted">Mục đích của luật (nguyên văn, tiếng Anh)</Text>
          <Text className="text-sm text-ink">{purpose.text}</Text>
        </View>
      )}

      {outline.length > 0 && (
        <View style={{ gap: 4 }}>
          <Text className="text-[11px] text-muted">Cấu trúc chính (nguyên văn, tiếng Anh)</Text>
          {visibleOutline.map((item) => (
            <Text key={item.citationId} className="text-sm text-ink">
              {item.text}
            </Text>
          ))}
          {outline.length > OUTLINE_PREVIEW_COUNT && (
            <Pressable accessibilityRole="button" onPress={() => setShowAllOutline((value) => !value)}>
              <Text className="py-1 text-sm font-body-bold text-primary">
                {showAllOutline ? 'Thu gọn' : `Xem tất cả ${outline.length}${outlineTruncated ? '+' : ''} mục`}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {!summaryVi && !purpose && outline.length === 0 && (
        <Text className="text-sm text-muted">Văn bản này chưa có đủ dữ liệu để tóm lược. Xem nội dung bên dưới.</Text>
      )}

      <Text className="text-[11px] text-muted">{disclaimer}</Text>
    </View>
  );
}
