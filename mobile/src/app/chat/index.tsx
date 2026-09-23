import { useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, MessageCircle, Send, TriangleAlert } from 'lucide-react-native';
import { PageHeader } from '@/components/common/PageHeader';
import { QuickChip } from '@/components/ui/QuickChip';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { CountryFlag } from '@/components/brand/CountryFlag';
import { AnswerCard } from '@/features/chat/components/AnswerCard';
import { colors } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { useCountry } from '@/lib/countryContext';
import { askLegalAssistant, type ChatAnswer } from '@/lib/data';

type Message = { id: string; role: 'user' | 'assistant'; text?: string; answer?: ChatAnswer; pending?: boolean };

let messageIdCounter = 0;
function nextMessageId(prefix: string): string {
  messageIdCounter += 1;
  return `${prefix}${messageIdCounter}`;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { isGuest } = useAuth();
  const { countryCode, country } = useCountry();
  const params = useLocalSearchParams<{ q?: string }>();
  const [input, setInput] = useState(params.q ?? '');
  const [messages, setMessages] = useState<Message[]>([]);
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const scrollRef = useRef<ScrollView>(null);

  if (isGuest) {
    return (
      <View className="flex-1 bg-bg">
        <PageHeader title="AI Legal Assistant" subtitle="Trợ lý pháp lý du lịch" />
        <View className="flex-1 items-center justify-center px-8">
          <MessageCircle size={56} color={colors.primary} />
          <Text className="mt-4 text-center text-lg font-body-bold text-ink">Đăng nhập để hỏi AI</Text>
          <View className="mt-5 w-full">
            <Button label="Đăng nhập" onPress={() => router.push('/login?next=/chat' as never)} />
          </View>
        </View>
      </View>
    );
  }

  const send = async (question: string) => {
    if (!question.trim()) return;
    const userMsg: Message = { id: nextMessageId('u'), role: 'user', text: question };
    const pendingMsg: Message = { id: nextMessageId('a'), role: 'assistant', pending: true };
    setMessages((prev) => [...prev, userMsg, pendingMsg]);
    setInput('');
    try {
      const answer = await askLegalAssistant(question);
      setMessages((prev) => prev.map((m) => (m.id === pendingMsg.id ? { ...m, pending: false, answer } : m)));
    } catch {
      // Khong de bong "pending" (3 cham nhap nhay) treo mai -- chuyen sang
      // dang insufficient_evidence de tai su dung AnswerCard co san thay vi
      // them mot loai bubble loi rieng.
      const errorAnswer: ChatAnswer = {
        status: 'insufficient_evidence',
        reason: 'Không thể kết nối tới trợ lý AI lúc này. Kiểm tra kết nối mạng và thử lại.',
        suggestions: [],
      };
      setMessages((prev) => prev.map((m) => (m.id === pendingMsg.id ? { ...m, pending: false, answer: errorAnswer } : m)));
    }
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <View className="flex-1 bg-bg">
      <PageHeader
        title="AI Legal Assistant"
        subtitle="Trợ lý pháp lý du lịch"
        right={
          <IconButton
            accessibilityLabel="Lịch sử phiên chat"
            variant="outline"
            icon={<Clock size={18} color={colors.ink} />}
            onPress={() => router.push({ pathname: '/coming-soon', params: { title: 'Lịch sử phiên chat' } })}
          />
        }
      />
      <View className="border-b border-line bg-surface px-[18px] py-2.5">
        <View className="flex-row items-center self-start rounded-full bg-primary-soft px-3 py-1.5" style={{ gap: 6 }}>
          <CountryFlag code={countryCode} width={16} height={12} />
          <Text className="text-[13px] font-body-semibold text-muted">Áp dụng cho {country?.name}</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 18, gap: 14 }}>
        {messages.length === 0 && (
          <Text className="mt-6 text-center text-sm text-muted">Hỏi mình về quy định pháp luật khi du lịch nhé.</Text>
        )}
        {messages.map((m) =>
          m.role === 'user' ? (
            <View key={m.id} className="max-w-[80%] self-end rounded-[18px] bg-primary px-4 py-3" style={{ borderBottomRightRadius: 6 }}>
              <Text className="text-base text-white">{m.text}</Text>
            </View>
          ) : (
            <View key={m.id} className="flex-row items-start" style={{ gap: 10 }}>
              <View className={`h-9 w-9 items-center justify-center rounded-sm ${m.answer?.status === 'insufficient_evidence' ? 'bg-warning-soft' : 'bg-primary-soft'}`}>
                {m.answer?.status === 'insufficient_evidence' ? (
                  <TriangleAlert size={18} color={colors.warning} />
                ) : (
                  <MessageCircle size={18} color={colors.primary} />
                )}
              </View>
              <View className="flex-1">
                {m.pending ? (
                  <TypingDots />
                ) : m.answer ? (
                  <AnswerCard answer={m.answer} feedback={feedback[m.id]} onFeedback={(v) => setFeedback((prev) => ({ ...prev, [m.id]: v }))} />
                ) : null}
              </View>
            </View>
          ),
        )}
        <Text className="mt-4 text-center text-xs text-subtle">
          Câu trả lời của AI chỉ mang tính tham khảo, không thay thế tư vấn pháp lý chính thức.
        </Text>
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="border-t border-line bg-surface px-[18px] py-2.5">
        <View className="flex-row" style={{ gap: 8 }}>
          {['Mất hộ chiếu thì sao?', 'Cảnh sát kiểm tra giấy tờ?', 'Hàng cấm nhập cảnh', 'Khai báo hải quan'].map((s) => (
            <QuickChip key={s} label={s} onPress={() => send(s)} />
          ))}
        </View>
      </ScrollView>

      <View className="flex-row items-end gap-2.5 bg-surface px-[18px] pt-2.5" style={{ paddingBottom: insets.bottom + 12 }}>
        <TextInput
          className="max-h-28 flex-1 rounded-lg border border-line bg-surface px-4 py-3 text-base text-ink"
          placeholder="Hỏi về quy định..."
          placeholderTextColor={colors.subtle}
          value={input}
          onChangeText={setInput}
          multiline
        />
        <Pressable
          accessibilityLabel="Gửi câu hỏi"
          disabled={!input.trim()}
          onPress={() => send(input)}
          className={`h-14 w-14 items-center justify-center rounded-lg bg-primary ${!input.trim() ? 'opacity-50' : ''}`}
        >
          <Send size={22} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

function TypingDots() {
  return (
    <View className="flex-row items-center gap-1.5 self-start rounded-[20px] border border-line bg-surface px-4 py-3.5">
      {[0, 1, 2].map((i) => (
        <View key={i} className="h-2 w-2 rounded-full bg-muted" style={{ opacity: 0.4 + i * 0.2 }} />
      ))}
    </View>
  );
}
