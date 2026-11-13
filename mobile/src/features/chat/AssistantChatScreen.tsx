import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { History, LogIn, Send, SquarePen, X } from 'lucide-react-native';
import { AppShell, useAppShellNavClearance } from '@/components/common/AppShell';
import { useScreenTopInset } from '@/components/common/screenTopInset';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { colors } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { useCountry } from '@/lib/countryContext';
import { useKeyboardOverlap } from '@/lib/useKeyboardInset';
import { fetchTrips } from '@/lib/data';
import { formatTripRange } from '@/lib/format';
import type { AssistantTrip } from '@/lib/api/assistant';
import { activeStop, pickCurrentTrip } from '@/features/trips/itinerary';
import { AssistantAnswer } from './components/AssistantAnswer';
import { HistorySheet } from './components/HistorySheet';
import { useAssistantChat } from './useAssistantChat';

/*
 * Màn chat trợ lý AI bản 2, kiểu ChatGPT/Claude (docs/AI_V2_PLAN.md mục "Giao diện"):
 * câu hỏi trong bong bóng phải, câu trả lời trải rộng bên trái (E1); màn trống chỉ có ô nhập (E3);
 * chỉ gõ chữ (E4); lời miễn trừ hiện MỘT lần trên màn (C5); bắt buộc đăng nhập (G5).
 */
const DISCLAIMER =
  'Trả lời dựa trên nguồn đã kiểm chứng khi có, luôn kèm nhãn độ tin cậy. Đây là công cụ hỗ trợ thông tin, không thay thế tư vấn pháp lý chính thức.';
const MAX_MESSAGE_LENGTH = 1000;

export function AssistantChatScreen() {
  const { isGuest } = useAuth();
  return <AppShell active="chat">{isGuest ? <LoginRequired /> : <ChatBody />}</AppShell>;
}

function ChatHeader({ onHistory, onNew }: { onHistory: () => void; onNew: () => void }) {
  const topInset = useScreenTopInset();
  return (
    <View className="flex-row items-center border-b border-line bg-surface px-[18px] pb-3" style={{ paddingTop: topInset + 12, gap: 12 }}>
      <Text className="flex-1 font-display text-[18px] text-ink">Trợ lý AI</Text>
      <Pressable accessibilityLabel="Lịch sử trò chuyện" hitSlop={8} onPress={onHistory}>
        <History size={22} color={colors.ink} />
      </Pressable>
      <Pressable accessibilityLabel="Cuộc trò chuyện mới" hitSlop={8} onPress={onNew}>
        <SquarePen size={22} color={colors.ink} />
      </Pressable>
    </View>
  );
}

function LoginRequired() {
  return (
    <View className="flex-1 bg-bg">
      <ChatHeader onHistory={() => router.push('/login')} onNew={() => router.push('/login')} />
      <View className="flex-1 items-center justify-center px-8" style={{ gap: 14 }}>
        <Text className="text-center font-display text-xl text-ink">Đăng nhập để hỏi trợ lý</Text>
        <Text className="text-center text-sm leading-relaxed text-muted">
          Trợ lý lưu lịch sử theo tài khoản để bạn xem lại được. SOS và cẩm nang vẫn dùng được khi chưa đăng nhập.
        </Text>
        <Button label="Đăng nhập" iconLeft={<LogIn size={18} color="#fff" />} onPress={() => router.push('/login')} />
      </View>
    </View>
  );
}

// Chuyến đi hiện tại ở quốc gia đang chọn, gửi kèm để trợ lý trả lời sát hơn (D2).
function useTripContext(countryCode: string) {
  const tripsQuery = useQuery({ queryKey: ['trips'], queryFn: fetchTrips });
  return useMemo(() => {
    const trip = pickCurrentTrip(tripsQuery.data?.data ?? []);
    if (!trip || trip.countryCode !== countryCode) return null;
    const stop = activeStop(trip);
    const payload: AssistantTrip = { city: stop.destinationCity, startDate: trip.startDate, endDate: trip.endDate };
    return { payload, label: `${stop.destinationCity}, ${formatTripRange(trip.startDate, trip.endDate)}` };
  }, [tripsQuery.data, countryCode]);
}

function ChatBody() {
  const navClearance = useAppShellNavClearance();
  const { viewRef, overlap: keyboardInset } = useKeyboardOverlap();
  const { countryCode } = useCountry();
  const chat = useAssistantChat(countryCode);
  const tripContext = useTripContext(countryCode);
  const [useTrip, setUseTrip] = useState(true);
  const [input, setInput] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(timer);
  }, [chat.messages.length, chat.sending, keyboardInset]);

  const submit = async (text: string) => {
    const trip = useTrip && tripContext ? tripContext.payload : undefined;
    setInput('');
    const sent = await chat.send(text, trip);
    if (!sent) setInput(text);
  };

  const canSend = input.trim().length > 0 && !chat.sending;

  return (
    <View ref={viewRef} collapsable={false} className="flex-1 bg-bg">
      <ChatHeader onHistory={() => setHistoryOpen(true)} onNew={chat.startNew} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 18, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {chat.messages.map((message) =>
          message.role === 'user' ? (
            <View
              key={message.id}
              className="mb-4 max-w-[85%] self-end rounded-[20px] bg-primary-soft px-4 py-2.5"
              style={{ borderBottomRightRadius: 6 }}
            >
              <Text className="text-[15px] leading-6 text-ink">{message.content}</Text>
            </View>
          ) : (
            <AssistantAnswer
              key={message.id}
              message={message}
              countryCode={countryCode}
              busy={chat.busyMessageId === message.id || chat.sending}
              onRegenerate={(detailed) => chat.regenerate(message.id, detailed)}
              onPickOption={submit}
            />
          ),
        )}
        {chat.sending ? (
          <View className="mb-4 flex-row items-center" style={{ gap: 8 }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text className="text-sm text-muted">Đang soạn câu trả lời...</Text>
          </View>
        ) : null}
      </ScrollView>

      {chat.error ? (
        <View className="mx-[18px] mb-2 flex-row items-center rounded-2xl bg-danger-tint px-3 py-2.5" style={{ gap: 8 }}>
          <Text className="flex-1 text-[13px] text-danger-strong">{chat.error}</Text>
          <Pressable accessibilityLabel="Đóng thông báo lỗi" hitSlop={8} onPress={chat.clearError}>
            <X size={16} color={colors.dangerStrong} />
          </Pressable>
        </View>
      ) : null}

      <View
        className="border-t border-line bg-surface px-[18px] pt-2.5"
        style={{ // Thanh tab luôn hiện: ô nhập phải nằm trên cả thanh tab lẫn bàn phím.
        paddingBottom: Math.max(navClearance, keyboardInset + 8) }}
      >
        {tripContext ? (
          <View className="mb-2 flex-row items-center" style={{ gap: 8 }}>
            <Text className="flex-1 text-[12px] text-subtle" numberOfLines={1}>
              Dùng thông tin chuyến đi: {tripContext.label}
            </Text>
            <Switch value={useTrip} onValueChange={setUseTrip} accessibilityLabel="Dùng thông tin chuyến đi" />
          </View>
        ) : null}
        <View className="flex-row items-end rounded-[26px] border border-line bg-bg pl-4 pr-1.5" style={{ minHeight: 52 }}>
          <TextInput
            className="max-h-28 flex-1 py-3 text-[15px] text-ink"
            placeholder="Hỏi về luật, thủ tục, an toàn..."
            placeholderTextColor={colors.subtle}
            value={input}
            onChangeText={setInput}
            maxLength={MAX_MESSAGE_LENGTH}
            multiline
          />
          <Pressable
            accessibilityLabel="Gửi câu hỏi"
            disabled={!canSend}
            onPress={() => submit(input)}
            className={`mb-1.5 h-10 w-10 items-center justify-center rounded-full bg-primary ${canSend ? '' : 'opacity-40'}`}
          >
            <Send size={17} color="#fff" />
          </Pressable>
        </View>
        <Text className="mt-2 text-center text-[10px] leading-4 text-muted">{DISCLAIMER}</Text>
      </View>

      <HistorySheet
        visible={historyOpen}
        activeId={chat.conversationId}
        onClose={() => setHistoryOpen(false)}
        onOpen={chat.openConversation}
        onDeleted={(id) => {
          if (id === null || id === chat.conversationId) chat.startNew();
        }}
      />
    </View>
  );
}
