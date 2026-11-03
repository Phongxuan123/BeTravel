import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {
  BadgeCheck,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Copy,
  Globe,
  Lightbulb,
  ListPlus,
  Phone,
  RotateCcw,
} from 'lucide-react-native';
import { colors } from '@/lib/theme';
import { openPhone, openUrl } from '@/lib/openExternal';
import type { AssistantCitation, AssistantMessage } from '@/lib/api/assistant';
import { formatAnswer, toPlainText, type AnswerSegment } from '../formatAnswer';

/*
 * Một câu trả lời của trợ lý, kiểu ChatGPT: không bong bóng, trải rộng bên trái (E1).
 * Nhãn độ tin cậy do backend gán bằng code (B4); nút gọi khẩn cấp ở ĐẦU câu trả lời (D5);
 * nguồn thu gọn cuối câu (C4); thao tác sao chép / trả lời lại / chi tiết hơn (C2, E5).
 */
const TIER_LABEL = {
  official: { label: 'Nguồn chính thức', color: colors.successStrong, bg: colors.successSoft, Icon: BadgeCheck },
  web: { label: 'Tra cứu web', color: colors.primaryStrong, bg: colors.primarySoft, Icon: Globe },
  general: { label: 'Kiến thức chung', color: colors.warningStrong, bg: colors.warningSoft, Icon: Lightbulb },
} as const;

const SHOWS_TIER = new Set(['answer', 'emergency']);

type Props = {
  message: AssistantMessage;
  countryCode: string;
  busy: boolean;
  onRegenerate: (detailed: boolean) => void;
  onPickOption: (option: string) => void;
};

export function AssistantAnswer({ message, countryCode, busy, onRegenerate, onPickOption }: Props) {
  const [copied, setCopied] = useState(false);
  const tier = message.sourceTier && SHOWS_TIER.has(message.kind ?? '') ? TIER_LABEL[message.sourceTier] : null;
  const canExpand = message.kind === 'answer' && !message.detailed;

  const copy = async () => {
    await Clipboard.setStringAsync(toPlainText(message.content, message.citations));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View className="mb-5" style={{ gap: 10 }}>
      {message.emergencyNumber ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Gọi ${message.emergencyNumber}`}
          onPress={() => openPhone(message.emergencyNumber)}
          className="flex-row items-center justify-center rounded-2xl py-3"
          style={{ backgroundColor: colors.danger, gap: 8 }}
        >
          <Phone size={20} color="#fff" />
          <Text className="font-display text-base text-white">Gọi {message.emergencyNumber} ngay</Text>
        </Pressable>
      ) : null}

      {tier ? (
        <View className="flex-row self-start items-center rounded-full px-2.5 py-1" style={{ backgroundColor: tier.bg, gap: 4 }}>
          <tier.Icon size={13} color={tier.color} />
          <Text className="text-[11px] font-body-bold" style={{ color: tier.color }}>
            {tier.label}
          </Text>
        </View>
      ) : null}

      <AnswerBody content={message.content} />

      {message.clarifyOptions.length > 0 ? (
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {message.clarifyOptions.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              disabled={busy}
              onPress={() => onPickOption(option)}
              className="rounded-full border border-primary bg-primary-soft px-3.5 py-2"
            >
              <Text className="text-sm font-body-semibold text-primary-strong">{option}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {message.citations.length > 0 ? (
        <SourceList citations={message.citations} countryCode={countryCode} />
      ) : null}

      {message.tripContext ? (
        <Text className="text-[11px] text-subtle">Đã dùng thông tin chuyến đi: {message.tripContext}</Text>
      ) : null}

      <View className="flex-row flex-wrap items-center" style={{ gap: 6 }}>
        <ActionButton label={copied ? 'Đã chép' : 'Sao chép'} Icon={Copy} onPress={copy} />
        <ActionButton label="Trả lời lại" Icon={RotateCcw} disabled={busy} onPress={() => onRegenerate(message.detailed)} />
        {canExpand ? (
          <ActionButton label="Giải thích chi tiết hơn" Icon={ListPlus} disabled={busy} onPress={() => onRegenerate(true)} />
        ) : null}
        {busy ? <ActivityIndicator size="small" color={colors.primary} /> : null}
      </View>
    </View>
  );
}

function AnswerBody({ content }: { content: string }) {
  return (
    <View style={{ gap: 6 }}>
      {formatAnswer(content).map((block, index) =>
        block.kind === 'bullet' ? (
          <View key={index} className="flex-row pr-2" style={{ gap: 8 }}>
            <Text className="text-[15px] leading-6 text-ink">•</Text>
            <Text className="flex-1 text-[15px] leading-6 text-ink">
              <Segments segments={block.segments} />
            </Text>
          </View>
        ) : (
          <Text key={index} className="text-[15px] leading-6 text-ink">
            <Segments segments={block.segments} />
          </Text>
        ),
      )}
    </View>
  );
}

function Segments({ segments }: { segments: AnswerSegment[] }) {
  return segments.map((segment, index) => {
    if (segment.citation) {
      return (
        <Text key={index} className="text-[11px] font-body-bold text-primary">
          {` [${segment.citation}]`}
        </Text>
      );
    }
    return (
      <Text key={index} className={segment.bold ? 'font-body-bold' : undefined}>
        {segment.text}
      </Text>
    );
  });
}

function SourceList({ citations, countryCode }: { citations: AssistantCitation[]; countryCode: string }) {
  const [open, setOpen] = useState(false);
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <View className="rounded-2xl border border-line bg-surface">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? 'Ẩn nguồn' : 'Xem nguồn'}
        onPress={() => setOpen((value) => !value)}
        className="flex-row items-center px-3 py-2.5"
        style={{ gap: 6 }}
      >
        <BookOpen size={15} color={colors.subtle} />
        <Text className="flex-1 text-xs font-body-semibold text-subtle">Nguồn ({citations.length})</Text>
        <Chevron size={16} color={colors.subtle} />
      </Pressable>
      {open
        ? citations.map((citation) => (
            <Pressable
              key={citation.n}
              accessibilityRole="link"
              onPress={() => openCitation(citation, countryCode)}
              className="border-t border-line px-3 py-2.5"
            >
              <Text className="text-[13px] font-body-semibold text-ink">
                [{citation.n}] {citation.title}
              </Text>
              {citation.authority ? <Text className="mt-0.5 text-[11px] text-subtle">{citation.authority}</Text> : null}
            </Pressable>
          ))
        : null}
    </View>
  );
}

// Bài cẩm nang trong app thì mở màn bài; nguồn ngoài (luật gốc, trang web) thì mở trình duyệt.
function openCitation(citation: AssistantCitation, countryCode: string) {
  if (citation.articleSlug) {
    router.push(`/explore/${countryCode}/${citation.articleSlug}` as never);
    return;
  }
  if (citation.url) void openUrl(citation.url);
}

function ActionButton({
  label,
  Icon,
  onPress,
  disabled,
}: {
  label: string;
  Icon: typeof Copy;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      className={`flex-row items-center rounded-full border border-line px-3 py-1.5 ${disabled ? 'opacity-40' : ''}`}
      style={{ gap: 5 }}
    >
      <Icon size={14} color={colors.subtle} />
      <Text className="text-xs font-body-semibold text-subtle">{label}</Text>
    </Pressable>
  );
}
