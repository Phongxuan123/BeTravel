import { View, Text, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import { ThumbsUp, ThumbsDown, Flag, BookOpen, Phone } from 'lucide-react-native';
import { Badge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { colors } from '@/lib/theme';
import type { ChatAnswer } from '@/lib/data';

const MARKER_RE = /(\[S\d+\])/g;

// Tách một dòng văn bản thành đoạn thường + marker [S1]..[Sn] để render marker
// dạng bấm được, mở đúng bài luật tương ứng (spec B5 mục 3).
function TextWithMarkers({
  line,
  sources,
}: {
  line: string;
  sources: { marker?: string; articleSlug?: string; countryCode?: string }[];
}) {
  const parts = line.split(MARKER_RE);
  return (
    <Text className="text-base leading-6 text-ink">
      {parts.map((part, i) => {
        const match = part.match(/^\[S(\d+)\]$/);
        if (!match) return <Text key={i}>{part}</Text>;

        const marker = `S${match[1]}`;
        const source = sources.find((s) => s.marker === marker);
        if (!source?.articleSlug || !source.countryCode) return <Text key={i}>{part}</Text>;

        return (
          <Text
            key={i}
            className="font-body-bold text-primary"
            onPress={() => router.push(`/explore/${source.countryCode}/${source.articleSlug}` as never)}
          >
            {part}
          </Text>
        );
      })}
    </Text>
  );
}

// 2 biến thể theo spec mục 6.10: "Có nguồn pháp lý" và "Chưa đủ dữ liệu".
// Biến thể "Chưa đủ dữ liệu" KHÔNG BAO GIỜ hiển thị nội dung trả lời — chỉ lý do + gợi ý.
export function AnswerCard({
  answer,
  feedback,
  onFeedback,
  onReport,
}: {
  answer: ChatAnswer;
  feedback?: 'up' | 'down';
  onFeedback: (v: 'up' | 'down') => void;
  onReport?: () => void;
}) {
  if (answer.status === 'insufficient_evidence') {
    return (
      <View testID="answer-card-insufficient" className="rounded-[20px] border border-cream-line bg-cream p-4">
        <View className="self-start rounded-full bg-amber-soft px-2.5 py-1">
          <Text className="text-[13px] font-body-bold" style={{ color: '#8A4B08' }}>
            Chưa đủ dữ liệu
          </Text>
        </View>
        <Text className="mt-3 text-[18px] font-body-bold text-ink">Chưa tìm thấy nguồn pháp lý phù hợp.</Text>
        <Text className="mt-2 text-base leading-6" style={{ color: '#3B4A63' }}>
          {answer.reason}
        </Text>
        <View className="mt-3 rounded-lg border border-cream-line bg-surface p-3.5">
          <Text className="text-[15px] font-body-bold" style={{ color: '#8A4B08' }}>
            Bạn nên làm
          </Text>
          <View className="mt-2" style={{ gap: 6 }}>
            {answer.suggestions.map((s, i) => (
              <View key={i} className="flex-row items-start gap-2">
                <View className="mt-2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#E0A15E' }} />
                <Text className="flex-1 text-sm text-ink">{s}</Text>
              </View>
            ))}
          </View>
        </View>
        <View className="mt-4" style={{ gap: 8 }}>
          <Button label="Xem Legal Handbook" iconLeft={<BookOpen size={18} color="#fff" />} onPress={() => router.push('/explore')} />
          <Button label="Liên hệ hỗ trợ" variant="secondary" iconLeft={<Phone size={18} color={colors.primary} />} onPress={() => router.push('/sos')} />
        </View>
        <FeedbackRow feedback={feedback} onFeedback={onFeedback} showReport={false} />
      </View>
    );
  }

  const bodyLines = answer.content.split('\n');
  return (
    <View testID="answer-card-answered" className="rounded-[20px] border border-line bg-surface p-4">
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <Badge label="Có nguồn pháp lý" tone="success" dot />
        <Text className="text-[13px] text-subtle">Cập nhật {answer.updatedAt}</Text>
      </View>
      <View className="mt-3" style={{ gap: 4 }}>
        {bodyLines.map((line, i) =>
          line.startsWith('- ') ? (
            <View key={i} className="ml-1 flex-row items-start gap-2">
              <View className="mt-2 h-1.5 w-1.5 rounded-full bg-[#9DBBEE]" />
              <TextWithMarkers line={line.replace('- ', '')} sources={answer.sources} />
            </View>
          ) : (
            <TextWithMarkers key={i} line={line.replace(/\*\*(.*?)\*\*/g, '$1')} sources={answer.sources} />
          ),
        )}
      </View>
      {answer.sources.map((s, i) => {
        const openInApp = s.articleSlug && s.countryCode;
        const onOpen = () =>
          openInApp
            ? router.push(`/explore/${s.countryCode}/${s.articleSlug}` as never)
            : s.url
              ? Linking.openURL(s.url)
              : undefined;
        return (
          <View key={s.marker ?? `${s.name}-${i}`} className="mt-3 rounded-lg border border-line bg-[#F4F8FF] p-3.5">
            <View className="mb-2 flex-row items-center self-start rounded-full bg-primary-soft px-2.5 py-1" style={{ gap: 6 }}>
              <Text className="text-[13px] font-body-bold text-primary-strong">
                {s.marker ? `Nguồn pháp luật [${s.marker}]` : 'Nguồn pháp luật'}
              </Text>
            </View>
            <Text className="text-base font-body-bold text-ink">{s.name}</Text>
            <Pressable className="mt-3 h-11 items-center justify-center rounded-md bg-primary" onPress={onOpen}>
              <Text className="font-body-bold text-white">{openInApp ? 'Xem bài luật' : 'Xem nguồn'}</Text>
            </Pressable>
          </View>
        );
      })}
      <FeedbackRow feedback={feedback} onFeedback={onFeedback} showReport onReport={onReport} />
    </View>
  );
}

function FeedbackRow({
  feedback,
  onFeedback,
  showReport,
  onReport,
}: {
  feedback?: 'up' | 'down';
  onFeedback: (v: 'up' | 'down') => void;
  showReport: boolean;
  onReport?: () => void;
}) {
  return (
    <View className="mt-4 flex-row items-center justify-between">
      <View className="flex-row" style={{ gap: 8 }}>
        <IconButton
          accessibilityLabel="Hữu ích"
          variant={feedback === 'up' ? 'soft' : 'outline'}
          icon={<ThumbsUp size={18} color={feedback === 'up' ? colors.primary : colors.ink} />}
          onPress={() => onFeedback('up')}
        />
        <IconButton
          accessibilityLabel="Không hữu ích"
          variant={feedback === 'down' ? 'soft' : 'outline'}
          icon={<ThumbsDown size={18} color={feedback === 'down' ? colors.primary : colors.ink} />}
          onPress={() => onFeedback('down')}
        />
      </View>
      {showReport && (
        <Pressable
          className="flex-row items-center rounded-md border border-danger-line bg-surface px-3 py-2.5"
          style={{ gap: 6 }}
          onPress={onReport}
        >
          <Flag size={16} color={colors.danger} />
          <Text className="text-[15px] font-body-bold text-danger">Báo sai</Text>
        </Pressable>
      )}
    </View>
  );
}
