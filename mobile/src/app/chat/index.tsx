import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, MessageCircle, Plus, Send, TriangleAlert, Pencil, Trash2, Check, X } from 'lucide-react-native';
import { PageHeader } from '@/components/common/PageHeader';
import { SimpleSheet } from '@/components/common/SimpleSheet';
import { QuickChip } from '@/components/ui/QuickChip';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { CountryFlag } from '@/components/brand/CountryFlag';
import { AnswerCard } from '@/features/chat/components/AnswerCard';
import { colors } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { useCountry } from '@/lib/countryContext';
import { ApiError } from '@/lib/api/http';
import {
  askLegalAssistant,
  listChatSessions,
  deleteChatSession,
  renameChatSession,
  loadChatSessionMessages,
  setChatMessageFeedback,
  reportWrongAnswer,
  startNewChatSession,
  setActiveChatSession,
  getActiveChatSessionId,
  getLastChatMessageId,
  type ChatAnswer,
  type ChatSession,
  type ChatUiMessage,
} from '@/lib/data';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  answer?: ChatAnswer;
  pending?: boolean;
  serverId?: string;
  forQuestion?: string;
};

let messageIdCounter = 0;
function nextMessageId(prefix: string): string {
  messageIdCounter += 1;
  return `${prefix}${messageIdCounter}`;
}

function toLocalMessages(history: ChatUiMessage[]): Message[] {
  const result: Message[] = [];
  let lastQuestion = '';
  for (const m of history) {
    if (m.role === 'user') {
      lastQuestion = m.text;
      result.push({ id: m._id, role: 'user', text: m.text });
    } else {
      result.push({ id: m._id, role: 'assistant', answer: m.answer, serverId: m._id, forQuestion: lastQuestion });
    }
  }
  return result;
}

function buildFeedbackMap(history: ChatUiMessage[]): Record<string, 'up' | 'down'> {
  const map: Record<string, 'up' | 'down'> = {};
  for (const m of history) {
    if (m.feedback === 'up' || m.feedback === 'down') map[m._id] = m.feedback;
  }
  return map;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { isGuest } = useAuth();
  const { countryCode, country } = useCountry();
  const params = useLocalSearchParams<{ q?: string; focusArticleId?: string }>();
  const [input, setInput] = useState(params.q ?? '');
  const [messages, setMessages] = useState<Message[]>([]);
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const scrollRef = useRef<ScrollView>(null);
  const focusArticleIdUsedRef = useRef(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const [reportTarget, setReportTarget] = useState<{ messageId: string; question: string } | null>(null);
  const [reportNote, setReportNote] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Mo man hinh chat: CTA "Hoi AI ve bai nay" (co focusArticleId) luon bat dau
  // cuoc tro chuyen MOI, tap trung vao bai do; ngoai ra tu dong tiep tuc phien
  // gan nhat cua quoc gia dang chon (neu co) de nguoi dung khong mat lich su.
  useEffect(() => {
    if (isGuest) return;

    let cancelled = false;
    (async () => {
      if (params.focusArticleId) {
        startNewChatSession();
        setMessages([]);
        setFeedback({});
        return;
      }
      try {
        const res = await listChatSessions();
        const latest = res.data.find((s) => s.countryCode === countryCode);
        if (!latest || cancelled) return;

        setActiveChatSession(latest._id, countryCode);
        const history = await loadChatSessionMessages(latest._id, countryCode);
        if (cancelled) return;

        setMessages(toLocalMessages(history.data));
        setFeedback(buildFeedbackMap(history.data));
      } catch {
        // Khong tai duoc lich su -- khong chan man hinh, nguoi dung van hoi duoc cau moi.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isGuest, countryCode, params.focusArticleId]);

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
    const pendingMsg: Message = { id: nextMessageId('a'), role: 'assistant', pending: true, forQuestion: question };
    setMessages((prev) => [...prev, userMsg, pendingMsg]);
    setInput('');

    const focusArticleId = !focusArticleIdUsedRef.current ? params.focusArticleId : undefined;
    focusArticleIdUsedRef.current = true;

    try {
      const answer = await askLegalAssistant(question, { countryCode, focusArticleId });
      const serverId = getLastChatMessageId() ?? undefined;
      setMessages((prev) => prev.map((m) => (m.id === pendingMsg.id ? { ...m, pending: false, answer, serverId } : m)));
    } catch (error) {
      // Khong de bong "pending" (3 cham nhap nhay) treo mai -- chuyen sang
      // dang insufficient_evidence de tai su dung AnswerCard co san thay vi
      // them mot loai bubble loi rieng. QUOTA_EXCEEDED can thong bao rieng,
      // ro rang (DoD B5), khong the dung chung wording "mat ket noi mang".
      const isQuota = error instanceof ApiError && error.code === 'QUOTA_EXCEEDED';
      const errorAnswer: ChatAnswer = {
        status: 'insufficient_evidence',
        reason: isQuota
          ? (error as ApiError).message
          : 'Không thể kết nối tới trợ lý AI lúc này. Kiểm tra kết nối mạng và thử lại.',
        suggestions: [],
      };
      setMessages((prev) => prev.map((m) => (m.id === pendingMsg.id ? { ...m, pending: false, answer: errorAnswer } : m)));
    }
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const onFeedback = async (message: Message, value: 'up' | 'down') => {
    setFeedback((prev) => ({ ...prev, [message.id]: value }));
    if (!message.serverId) return;
    const sessionId = getActiveChatSessionId();
    if (!sessionId) return;
    try {
      await setChatMessageFeedback(sessionId, message.serverId, value);
    } catch {
      // Khong chan UI vi 1 luot feedback that bai -- nguoi dung van thay trang thai da chon.
    }
  };

  const openReport = (message: Message) => {
    if (!message.serverId) return;
    setReportTarget({ messageId: message.serverId, question: message.forQuestion ?? '' });
    setReportNote('');
  };

  const submitReport = async () => {
    if (!reportTarget) return;
    setReportSubmitting(true);
    try {
      await reportWrongAnswer({
        targetId: reportTarget.messageId,
        note: reportNote.trim(),
        countryCode,
        question: reportTarget.question,
      });
      setReportTarget(null);
    } catch {
      // Giu modal mo -- nguoi dung co the thu lai.
    } finally {
      setReportSubmitting(false);
    }
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    setLoadingSessions(true);
    try {
      const res = await listChatSessions();
      setSessions(res.data.filter((s) => s.countryCode === countryCode));
    } catch {
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const selectSession = async (session: ChatSession) => {
    setHistoryOpen(false);
    setActiveChatSession(session._id, countryCode);
    const history = await loadChatSessionMessages(session._id, countryCode);
    setMessages(toLocalMessages(history.data));
    setFeedback(buildFeedbackMap(history.data));
  };

  const startNewConversation = () => {
    setHistoryOpen(false);
    startNewChatSession();
    setMessages([]);
    setFeedback({});
  };

  const startRename = (session: ChatSession) => {
    setRenamingSessionId(session._id);
    setRenameDraft(session.title || 'Cuộc trò chuyện');
  };

  const saveRename = async (session: ChatSession) => {
    const title = renameDraft.trim();
    setRenamingSessionId(null);
    if (!title || title === session.title) return;
    try {
      await renameChatSession(session._id, title);
      setSessions((prev) => prev.map((s) => (s._id === session._id ? { ...s, title } : s)));
    } catch {
      // Doi ten that bai khong nen chan man hinh -- ten cu van con nguyen ven.
    }
  };

  const removeSession = (session: ChatSession) => {
    Alert.alert('Xoá cuộc trò chuyện', `Xoá "${session.title || 'Cuộc trò chuyện'}"? Không thể hoàn tác.`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteChatSession(session._id);
            setSessions((prev) => prev.filter((s) => s._id !== session._id));
            if (getActiveChatSessionId() === session._id) {
              setMessages([]);
              setFeedback({});
            }
          } catch {
            // Nuot loi co chu dich -- phien van con trong danh sach de thu lai.
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-bg">
      <PageHeader
        title="AI Legal Assistant"
        subtitle="Trợ lý pháp lý du lịch"
        right={
          <IconButton accessibilityLabel="Lịch sử phiên chat" variant="outline" icon={<Clock size={18} color={colors.ink} />} onPress={openHistory} />
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
                  <AnswerCard
                    answer={m.answer}
                    feedback={feedback[m.id]}
                    onFeedback={(v) => onFeedback(m, v)}
                    onReport={() => openReport(m)}
                  />
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

      <SimpleSheet visible={historyOpen} onClose={() => setHistoryOpen(false)} title="Lịch sử phiên chat">
        <View style={{ gap: 8 }}>
          <Pressable
            className="flex-row items-center rounded-md border border-line bg-primary-soft px-3.5 py-3"
            style={{ gap: 8 }}
            onPress={startNewConversation}
          >
            <Plus size={18} color={colors.primary} />
            <Text className="font-body-bold text-primary">Cuộc trò chuyện mới</Text>
          </Pressable>

          {loadingSessions && <Text className="py-3 text-center text-sm text-muted">Đang tải...</Text>}
          {!loadingSessions && sessions.length === 0 && (
            <Text className="py-3 text-center text-sm text-muted">Chưa có cuộc trò chuyện nào cho {country?.name}.</Text>
          )}
          {sessions.map((s) =>
            renamingSessionId === s._id ? (
              <View key={s._id} className="flex-row items-center gap-2 rounded-md border border-primary px-3.5 py-2">
                <TextInput
                  className="flex-1 text-[15px] text-ink"
                  value={renameDraft}
                  onChangeText={setRenameDraft}
                  autoFocus
                  onSubmitEditing={() => saveRename(s)}
                />
                <Pressable accessibilityLabel="Lưu tên" onPress={() => saveRename(s)} hitSlop={8}>
                  <Check size={18} color={colors.primary} />
                </Pressable>
                <Pressable accessibilityLabel="Huỷ đổi tên" onPress={() => setRenamingSessionId(null)} hitSlop={8}>
                  <X size={18} color={colors.muted} />
                </Pressable>
              </View>
            ) : (
              <View key={s._id} className="flex-row items-center rounded-md border border-line">
                <Pressable className="flex-1 px-3.5 py-3" onPress={() => selectSession(s)}>
                  <Text className="font-body-semibold text-ink" numberOfLines={1}>
                    {s.title || 'Cuộc trò chuyện'}
                  </Text>
                  <Text className="mt-0.5 text-xs text-subtle">{new Date(s.updatedAt).toLocaleString('vi-VN')}</Text>
                </Pressable>
                <Pressable accessibilityLabel="Đổi tên" className="px-2.5 py-3" onPress={() => startRename(s)} hitSlop={8}>
                  <Pencil size={16} color={colors.muted} />
                </Pressable>
                <Pressable accessibilityLabel="Xoá" className="px-2.5 py-3" onPress={() => removeSession(s)} hitSlop={8}>
                  <Trash2 size={16} color={colors.danger} />
                </Pressable>
              </View>
            ),
          )}
        </View>
      </SimpleSheet>

      <SimpleSheet visible={!!reportTarget} onClose={() => setReportTarget(null)} title="Báo sai câu trả lời">
        <View style={{ gap: 12 }}>
          <Text className="text-sm text-muted">Cho mình biết câu trả lời sai ở chỗ nào để đội nội dung kiểm tra lại.</Text>
          <TextField
            multiline
            numberOfLines={4}
            style={{ height: 96, paddingTop: 12, textAlignVertical: 'top' }}
            placeholder="Ví dụ: mức phạt ghi sai, bài luật đã lỗi thời..."
            value={reportNote}
            onChangeText={setReportNote}
          />
          <Button label="Gửi báo cáo" loading={reportSubmitting} onPress={submitReport} />
        </View>
      </SimpleSheet>
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
