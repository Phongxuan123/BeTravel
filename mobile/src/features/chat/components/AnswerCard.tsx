import { View, Text, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { ThumbsUp, ThumbsDown, Flag, BookOpen, Phone, Copy, RefreshCw, ExternalLink, Compass } from 'lucide-react-native';
import { Badge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { colors } from '@/lib/theme';
import type { ChatAnswer } from '@/lib/data';
import { ContactCard, type ContactInfo } from './ContactCard';

// Tách một dòng thành: **đậm**, marker nguồn [S1]..[Sn] bấm được (mở đúng bài luật), đường dẫn
// trang chính thức (mở trình duyệt) và chữ thường.
const INLINE_RE = /(\*\*[^*]+\*\*|\[S\d+\]|https:\/\/[^\s)]+)/g;
const BOLD_RE = /^\*\*([^*]+)\*\*$/;
const MARKER_RE = /^\[S(\d+)\]$/;
const URL_RE = /^https:\/\/[^\s)]+$/;
const NUMBERED_RE = /^(\d+)[.)]\s+(.*)$/;
const LINE_BREAK = String.fromCharCode(10);
// Tiêu đề 3 phần do backend ghép (rag/guard.js#composeAnswerText); "Nguồn" là danh sách bên dưới thẻ.
const SECTION_HEADING_RE = /^\*\*(Trả lời ngắn|Việc nên làm|Điều cần tránh)\*\*$/;

type SourceRef = { marker?: string; articleSlug?: string; countryCode?: string };

function RichLine({ line, sources }: { line: string; sources: SourceRef[] }) {
  return (
    <Text className="text-[15px] leading-6 text-ink">
      {line.split(INLINE_RE).map((part, i) => {
        const boldMatch = part.match(BOLD_RE);
        if (boldMatch) {
          return (
            <Text key={i} className="font-body-bold">
              {boldMatch[1]}
            </Text>
          );
        }
        if (URL_RE.test(part)) {
          return (
            <Text key={i} className="text-primary underline" onPress={() => Linking.openURL(part)}>
              {part}
            </Text>
          );
        }
        const markerMatch = part.match(MARKER_RE);
        if (!markerMatch) return <Text key={i}>{part}</Text>;

        const marker = `S${markerMatch[1]}`;
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

// Dòng đánh số "1. ..." thành hàng có chấm tròn số (theo mẫu); "- ..." thành gạch đầu dòng.
function AnswerBody({ content, sources }: { content: string; sources: SourceRef[] }) {
  const lines = content.split(LINE_BREAK).filter((line) => line.trim() !== '');
  return (
    <View style={{ gap: 8 }}>
      {lines.map((line, i) => {
        const heading = line.match(SECTION_HEADING_RE);
        if (heading) {
          return (
            <Text key={i} className="mt-1 text-[11px] font-body-bold uppercase tracking-wider text-muted">
              {heading[1]}
            </Text>
          );
        }
        const numbered = line.match(NUMBERED_RE);
        if (numbered) {
          return (
            <View key={i} className="flex-row items-start" style={{ gap: 10 }}>
              <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-primary-soft">
                <Text className="text-xs font-body-bold text-primary">{numbered[1]}</Text>
              </View>
              <View className="flex-1">
                <RichLine line={numbered[2]} sources={sources} />
              </View>
            </View>
          );
        }
        if (line.startsWith('- ')) {
          return (
            <View key={i} className="ml-1 flex-row items-start" style={{ gap: 8 }}>
              <View className="mt-2.5 h-1.5 w-1.5 rounded-full bg-[#9DBBEE]" />
              <View className="flex-1">
                <RichLine line={line.slice(2)} sources={sources} />
              </View>
            </View>
          );
        }
        return <RichLine key={i} line={line} sources={sources} />;
      })}
    </View>
  );
}

// 2 biến thể theo spec mục 6.10: "Có nguồn pháp lý" và "Chưa đủ dữ liệu".
// Biến thể "Chưa đủ dữ liệu" KHÔNG BAO GIỜ hiển thị nội dung trả lời — chỉ lý do + gợi ý.
export function AnswerCard({
  answer,
  feedback,
  onFeedback,
  onReport,
  onRegenerate,
  contact,
}: {
  answer: ChatAnswer;
  feedback?: 'up' | 'down';
  onFeedback: (v: 'up' | 'down') => void;
  onReport?: () => void;
  onRegenerate?: () => void;
  // Thông tin liên hệ chính thức (Đại sứ quán) hiển thị khi câu trả lời cần hỗ trợ trực tiếp.
  contact?: ContactInfo | null;
}) {
  if (answer.status === 'out_of_scope') {
    return (
      <View testID="answer-card-out-of-scope" className="rounded-[20px] border border-line bg-surface p-4" style={{ borderTopLeftRadius: 6 }}>
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Compass size={18} color={colors.primary} />
          <Text className="text-[13px] font-body-bold text-primary-strong">
            {answer.greeting ? 'Be.Travel AI' : 'Ngoài phạm vi hỗ trợ'}
          </Text>
        </View>
        <View className="mt-3">
          <AnswerBody content={answer.message} sources={[]} />
        </View>
        <View className="mt-4" style={{ gap: 8 }}>
          <Button label="Xem cẩm nang pháp lý" iconLeft={<BookOpen size={18} color="#fff" />} onPress={() => router.push('/explore')} />
          <Button label="Mở SOS" variant="secondary" iconLeft={<Phone size={18} color={colors.primary} />} onPress={() => router.push('/sos')} />
        </View>
      </View>
    );
  }

  if (answer.status === 'insufficient_evidence') {
    return (
      <View testID="answer-card-insufficient" className="rounded-[20px] border border-cream-line bg-cream p-4">
        <View className="self-start rounded-full bg-amber-soft px-2.5 py-1">
          <Text className="text-[13px] font-body-bold" style={{ color: colors.warningStrong }}>
            {answer.badge ?? 'Chưa đủ dữ liệu'}
          </Text>
        </View>
        <Text className="mt-3 text-[18px] font-body-bold text-ink">{answer.title ?? 'Chưa tìm thấy nguồn pháp lý phù hợp.'}</Text>
        <View className="mt-2">
          <AnswerBody content={answer.reason} sources={[]} />
        </View>
        <View className="mt-3 rounded-lg border border-cream-line bg-surface p-3.5">
          <Text className="text-[15px] font-body-bold" style={{ color: colors.warningStrong }}>
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
        <FeedbackRow feedback={feedback} onFeedback={onFeedback} showReport={false} onRegenerate={onRegenerate} />
      </View>
    );
  }

  return (
    <View
      testID="answer-card-answered"
      className="rounded-[20px] border border-line bg-surface p-4"
      style={{ borderTopLeftRadius: 6 }}
    >
      {answer.approved && (
        <View testID="answer-card-approved" className="mb-3">
          <Badge label="Đã được Be.Travel duyệt" tone="info" dot />
        </View>
      )}
      {answer.webSearched && (
        <View testID="answer-card-web" className="mb-3">
          <Badge label="Từ trang chính phủ, chưa kiểm chứng" tone="warning" dot />
        </View>
      )}
      <AnswerBody content={answer.content} sources={answer.sources} />
      {answer.needsOfficialHelp && (
        <View testID="answer-card-official-help" className="mt-3">
          <Button
            label="Liên hệ hỗ trợ khẩn cấp"
            iconLeft={<Phone size={18} color="#fff" />}
            onPress={() => router.push('/sos')}
          />
        </View>
      )}
      {answer.needsOfficialHelp && <ContactCard contact={contact} />}
      {answer.sources.length > 0 && (
        <View className="mt-3" style={{ gap: 8 }}>
          <Text className="text-[11px] font-body-bold uppercase tracking-wider text-muted">Nguồn pháp lý tham chiếu</Text>
          {answer.sources.map((s, i) => {
            const openInApp = s.articleSlug && s.countryCode;
            const onOpen = () =>
              openInApp
                ? router.push(`/explore/${s.countryCode}/${s.articleSlug}` as never)
                : s.url
                  ? Linking.openURL(s.url)
                  : undefined;
            return (
              <Pressable
                key={s.marker ?? `${s.name}-${i}`}
                accessibilityRole="link"
                accessibilityLabel={`${openInApp ? 'Xem bài luật' : 'Xem nguồn'}: ${s.name}`}
                onPress={onOpen}
                className="flex-row items-center rounded-xl border border-line bg-bg px-3 py-2.5"
                style={{ gap: 10 }}
              >
                <View className="flex-1" style={{ gap: 2 }}>
                  {s.marker ? <Text className="text-[11px] font-body-bold text-primary-strong">[{s.marker}]</Text> : null}
                  <Text className="text-sm font-body-semibold text-ink">{s.name}</Text>
                  {s.verified === false ? (
                    <Text className="text-[11px]" style={{ color: colors.warningStrong }}>
                      {s.kind === 'web'
                        ? 'Trang web chính phủ, chưa được Be.Travel kiểm chứng'
                        : 'Văn bản luật gốc, chưa được Be.Travel kiểm chứng'}
                    </Text>
                  ) : null}
                </View>
                {openInApp ? <BookOpen size={16} color={colors.primary} /> : <ExternalLink size={16} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      )}
      {answer.sources.length > 0 && (
        <View className="mt-3 flex-row items-center" style={{ gap: 8 }}>
          {answer.webSearched ? (
            <Badge label="Nguồn: trang chính phủ" tone="warning" dot />
          ) : answer.sources.some((s) => s.verified === false) ? (
            <Badge label="Gồm luật gốc chưa kiểm chứng" tone="warning" dot />
          ) : (
            <Badge label="Có nguồn pháp lý" tone="success" dot />
          )}
          <Text className="text-xs text-subtle">Cập nhật {answer.updatedAt}</Text>
        </View>
      )}
      <FeedbackRow
        feedback={feedback}
        onFeedback={onFeedback}
        showReport
        onReport={onReport}
        onRegenerate={onRegenerate}
        copyText={answer.content}
      />
    </View>
  );
}

function FeedbackRow({
  feedback,
  onFeedback,
  showReport,
  onReport,
  onRegenerate,
  copyText,
}: {
  feedback?: 'up' | 'down';
  onFeedback: (v: 'up' | 'down') => void;
  showReport: boolean;
  onReport?: () => void;
  onRegenerate?: () => void;
  copyText?: string;
}) {
  return (
    <View className="mt-4 flex-row items-center justify-between">
      <View className="flex-row" style={{ gap: 8 }}>
        {copyText !== undefined && (
          <IconButton
            accessibilityLabel="Sao chép câu trả lời"
            variant="outline"
            icon={<Copy size={18} color={colors.ink} />}
            onPress={() => void Clipboard.setStringAsync(copyText)}
          />
        )}
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
        {onRegenerate && (
          <IconButton
            accessibilityLabel="Tạo lại câu trả lời"
            variant="outline"
            icon={<RefreshCw size={18} color={colors.ink} />}
            onPress={onRegenerate}
          />
        )}
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
