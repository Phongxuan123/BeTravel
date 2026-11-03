import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Trash2 } from 'lucide-react-native';
import { SimpleSheet } from '@/components/common/SimpleSheet';
import { colors } from '@/lib/theme';
import {
  deleteAllAssistantConversations,
  deleteAssistantConversation,
  listAssistantConversations,
} from '@/lib/data';

// Lịch sử lưu trên máy chủ theo tài khoản, tự xoá sau 90 ngày; xem lại hoặc xoá được (D4, H2).
const HISTORY_KEY = ['assistant-conversations'];

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export function HistorySheet({
  visible,
  activeId,
  onClose,
  onOpen,
  onDeleted,
}: {
  visible: boolean;
  activeId: string | null;
  onClose: () => void;
  onOpen: (conversationId: string) => void;
  onDeleted: (conversationId: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const historyQuery = useQuery({ queryKey: HISTORY_KEY, queryFn: listAssistantConversations, enabled: visible });
  const refresh = () => queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
  const deleteOne = useMutation({
    mutationFn: deleteAssistantConversation,
    onSuccess: (_, id) => {
      onDeleted(id);
      void refresh();
    },
  });
  const deleteAll = useMutation({
    mutationFn: deleteAllAssistantConversations,
    onSuccess: () => {
      onDeleted(null);
      void refresh();
    },
  });

  const confirmDeleteAll = () =>
    Alert.alert('Xoá toàn bộ lịch sử?', 'Mọi cuộc trò chuyện với trợ lý sẽ bị xoá và không khôi phục được.', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá hết', style: 'destructive', onPress: () => deleteAll.mutate() },
    ]);

  const conversations = historyQuery.data ?? [];
  return (
    <SimpleSheet visible={visible} onClose={onClose} title="Lịch sử trò chuyện">
      <View style={{ gap: 8 }}>
        {historyQuery.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
        {historyQuery.isError ? (
          <Text className="text-sm text-danger-strong">Không tải được lịch sử. Đóng rồi mở lại để thử lại.</Text>
        ) : null}
        {!historyQuery.isLoading && !historyQuery.isError && conversations.length === 0 ? (
          <Text className="py-4 text-center text-sm text-muted">Chưa có cuộc trò chuyện nào.</Text>
        ) : null}
        {conversations.map((conversation) => (
          <View
            key={conversation.id}
            className={`flex-row items-center rounded-2xl border px-3 py-3 ${
              conversation.id === activeId ? 'border-primary bg-primary-soft' : 'border-line bg-surface'
            }`}
            style={{ gap: 10 }}
          >
            <MessageSquare size={18} color={colors.subtle} />
            <Pressable
              accessibilityRole="button"
              className="flex-1"
              onPress={() => {
                onOpen(conversation.id);
                onClose();
              }}
            >
              <Text className="text-sm font-body-semibold text-ink" numberOfLines={1}>
                {conversation.title || 'Cuộc trò chuyện'}
              </Text>
              <Text className="text-[11px] text-subtle">{formatDate(conversation.updatedAt)}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Xoá cuộc trò chuyện"
              hitSlop={8}
              disabled={deleteOne.isPending}
              onPress={() => deleteOne.mutate(conversation.id)}
            >
              <Trash2 size={18} color={colors.danger} />
            </Pressable>
          </View>
        ))}
        {conversations.length > 0 ? (
          <Pressable accessibilityRole="button" onPress={confirmDeleteAll} className="items-center py-3">
            <Text className="text-sm font-body-semibold text-danger-strong">Xoá toàn bộ lịch sử</Text>
          </Pressable>
        ) : null}
        <Text className="text-center text-[11px] text-subtle">Lịch sử tự xoá sau 90 ngày.</Text>
      </View>
    </SimpleSheet>
  );
}
