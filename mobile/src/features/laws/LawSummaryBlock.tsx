import { useState, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react-native';
import { Badge } from '@/components/ui/Badge';
import { colors } from '@/lib/theme';
import { fetchAuLawSummary } from '@/lib/api/auLaws';

const OUTLINE_PREVIEW_COUNT = 8;
// Tóm tắt mở đầu chỉ giữ vài ý chính để đọc nhanh; chi tiết nằm ở các phần bấm để mở.
const KEY_POINTS_PREVIEW = 4;
const SUMMARY_STALE_TIME_MS = 24 * 60 * 60 * 1000;
// Tóm tắt từng phần được sinh nền: hỏi lại định kỳ cho tới khi xong.
const GENERATING_POLL_MS = 15_000;
// Ý chính nói về mức phạt, án tù hay số tiền được tô đỏ để người đọc thấy ngay; chỉ là kiểu hiển thị, không đổi nội dung.
// "tù" khoảng trắng/dấu câu hai bên (JS coi chữ có dấu không phải ký tự chữ nên không dùng \b), tránh khớp nhầm "tùy".
const PENALTY_PATTERN = /phạt|(^|[\s,.;(])tù([\s,.;)]|$)|\bpenalt|imprison|\bfines?\b|\$\s?\d|\d[\d.,]*\s*(đô|năm tù|tháng tù|AUD)/i;

/*
 * Tóm tắt nội dung chính của một luật Úc, trình bày theo từng mục có tiêu đề: tóm tắt, mục đích, nội dung từng phần
 * (kèm căn cứ trong luật), ghi chú, cấu trúc. Phần "Mục đích" và "Cấu trúc" lấy thẳng từ văn bản chính thức; phần tiếng
 * Việt do AI diễn giải CHỈ từ hai phần đó và luôn gắn nhãn AI. Lỗi tải tóm tắt không chặn các phần còn lại của màn chi tiết.
 */
export function LawSummaryBlock({ id }: { id: string }) {
  const [showAllOutline, setShowAllOutline] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [openParts, setOpenParts] = useState<Record<string, boolean>>({});
  const summaryQuery = useQuery({
    queryKey: ['au-law-summary', id],
    queryFn: () => fetchAuLawSummary(id),
    retry: false,
    staleTime: SUMMARY_STALE_TIME_MS,
    refetchInterval: (query) => (query.state.data?.deepStatus === 'generating' ? GENERATING_POLL_MS : false),
  });

  if (summaryQuery.isLoading) {
    return <Text className="py-2 text-sm text-muted">Đang tạo tóm tắt (lần đầu có thể mất vài chục giây)…</Text>;
  }
  if (summaryQuery.isError || !summaryQuery.data) {
    return <Text className="py-2 text-sm text-muted">Chưa tải được tóm tắt. Bạn vẫn có thể đọc nguyên bản.</Text>;
  }

  const { purpose, outline, outlineTruncated, summaryVi, disclaimer, deepStatus, deepSummary } = summaryQuery.data;
  const visibleOutline = showAllOutline ? outline : outline.slice(0, OUTLINE_PREVIEW_COUNT);
  const parts = deepSummary?.parts ?? [];
  const hasPartialPart = parts.some((part) => part.partial);
  const hasSkippedParts = Boolean(deepSummary && (deepSummary.skippedParts > 0 || deepSummary.truncated));

  return (
    <View className="rounded-2xl border border-line bg-surface p-4" style={{ gap: 16 }}>
      {summaryVi && (
        <Section title="Tóm tắt">
          <Badge label="AI diễn giải bằng tiếng Việt" tone="info" />
          <Text className="text-[17px] leading-6 text-ink">{summaryVi.summary}</Text>
          {summaryVi.keyPoints.slice(0, KEY_POINTS_PREVIEW).map((point) => (
            <Point key={point} text={point} />
          ))}
        </Section>
      )}

      {deepStatus === 'generating' && (
        <Text className="text-sm text-muted">Đang chuẩn bị tóm tắt chi tiết từng phần, vài phút nữa sẽ hiện tại đây…</Text>
      )}
      {parts.length > 0 && (
        <Section title="Nội dung từng phần (chạm để mở)">
          {parts.map((part) => {
            const isOpen = Boolean(openParts[part.citationId]);
            return (
              <View key={part.citationId} className="rounded-xl bg-bg px-3 py-2" style={{ gap: 6 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  onPress={() => setOpenParts((prev) => ({ ...prev, [part.citationId]: !isOpen }))}
                  className="flex-row items-center justify-between"
                  style={{ gap: 8 }}
                >
                  <Text className="flex-1 text-[16px] font-body-bold leading-6 text-ink">{part.headingVi ?? part.heading}</Text>
                  {isOpen ? <ChevronUp size={18} color={colors.primary} /> : <ChevronDown size={18} color={colors.primary} />}
                </Pressable>
                {isOpen && (
                  <View style={{ gap: 6 }}>
                    <Text className="text-[16px] leading-6 text-ink">{part.summary}</Text>
                    {part.keyPoints.map((point) => (
                      <Point key={point.text} text={point.text} />
                    ))}
                    {part.partial && <Text className="text-[11px] text-muted">Phần này dài: tóm tắt dựa trên các điều đầu tiên.</Text>}
                  </View>
                )}
              </View>
            );
          })}
        </Section>
      )}

      {(purpose || outline.length > 0) && (
        <View className="border-b border-line pb-4" style={{ gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showSource }}
            onPress={() => setShowSource((value) => !value)}
            className="flex-row items-center justify-between"
          >
            <Text className="text-base font-body-bold text-primary-strong">Mục đích và cấu trúc của luật</Text>
            {showSource ? <ChevronUp size={18} color={colors.primary} /> : <ChevronDown size={18} color={colors.primary} />}
          </Pressable>
          {showSource && purpose && (
            <View style={{ gap: 4 }}>
              <Text className="text-sm font-body-bold text-ink">Mục đích</Text>
              <Text className="text-[15px] leading-6 text-ink">{purpose.textVi ?? purpose.text}</Text>
            </View>
          )}
          {showSource && outline.length > 0 && (
            <View style={{ gap: 6 }}>
              <Text className="text-sm font-body-bold text-ink">Cấu trúc chính</Text>
              {visibleOutline.map((item) => (
                <View key={item.citationId} className="flex-row items-center justify-between" style={{ gap: 8 }}>
                  <Text className="flex-1 text-[15px] text-ink">{item.textVi ?? item.text}</Text>
                  <ChevronRight size={18} color={colors.primary} />
                </View>
              ))}
              {outline.length > OUTLINE_PREVIEW_COUNT && (
                <Pressable accessibilityRole="button" onPress={() => setShowAllOutline((value) => !value)}>
                  <Text className="py-1 text-sm font-body-bold text-primary-strong">
                    {showAllOutline ? 'Thu gọn' : `Xem tất cả ${outline.length}${outlineTruncated ? '+' : ''} mục`}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      )}

      {!summaryVi && !purpose && outline.length === 0 && (
        <Text className="text-sm text-muted">Văn bản này chưa có đủ dữ liệu để tóm tắt. Xem Toàn văn.</Text>
      )}

      <Section title="Ghi chú">
        {(hasPartialPart || hasSkippedParts) && (
          <Text className="text-sm text-ink">
            Một số phần chưa có tóm tắt (chưa qua kiểm tra nguồn hoặc quá dài). Xem Toàn văn để biết đầy đủ.
          </Text>
        )}
        <Text className="text-sm text-muted">{disclaimer}</Text>
      </Section>
    </View>
  );
}

// Mục có tiêu đề đậm kèm mũi tên nhỏ, nội dung bên dưới, ngăn với mục kế tiếp bằng đường kẻ.
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="border-b border-line pb-4" style={{ gap: 8 }}>
      <Text className="text-lg font-body-bold text-ink">{'▸ '}{title}</Text>
      {children}
    </View>
  );
}

// Ý chính: nếu nói về mức phạt thì in đậm màu đỏ như dòng "Phạt tiền..." để nổi bật.
function Point({ text }: { text: string }) {
  const isPenalty = PENALTY_PATTERN.test(text);
  return (
    <Text className={isPenalty ? 'text-[17px] font-body-bold leading-6 text-danger-strong' : 'text-[17px] leading-6 text-ink'}>
      {'• '}
      {text}
    </Text>
  );
}
