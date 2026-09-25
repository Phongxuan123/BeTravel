import { View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, FileText, MapPin, Siren, Trash2, ChevronRight } from 'lucide-react-native';
import { PageHeaderBare } from '@/components/common/PageHeader';
import { IconButton } from '@/components/ui/IconButton';
import { IconTile } from '@/components/ui/IconTile';
import { Badge } from '@/components/ui/Badge';
import { colors } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { fetchFavorites, removeFavorite } from '@/lib/data';
import type { FavoriteItem } from '@/mocks/schemas';

const GROUP_META: Record<FavoriteItem['targetType'], { label: string; icon: typeof FileText; tone: 'blue' | 'green' | 'orange' }> = {
  article: { label: 'Quy định pháp luật', icon: FileText, tone: 'blue' },
  location: { label: 'Điểm hỗ trợ', icon: MapPin, tone: 'green' },
  incident: { label: 'Hướng dẫn xử lý sự cố', icon: Siren, tone: 'orange' },
};

export default function FavoritesScreen() {
  const { isGuest } = useAuth();
  const queryClient = useQueryClient();
  const favoritesQuery = useQuery({ queryKey: ['favorites'], queryFn: fetchFavorites, enabled: !isGuest });

  const removeMutation = useMutation({
    mutationFn: (item: FavoriteItem) => removeFavorite(item.targetType, item.targetId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const openItem = (item: FavoriteItem) => {
    if (item.targetType === 'article' && item.countryCode && item.slug) {
      router.push(`/explore/${item.countryCode}/${item.slug}` as never);
    } else if (item.targetType === 'incident' && item.slug) {
      router.push(`/incidents/${item.slug}` as never);
    } else if (item.targetType === 'location') {
      router.push('/sos/map' as never);
    }
  };

  if (isGuest) {
    return (
      <View className="flex-1 bg-bg">
        <PageHeaderBare left={<Text className="text-[24px] font-display text-ink">Đã lưu</Text>} />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-lg font-body-bold text-ink">Đăng nhập để xem mục đã lưu</Text>
          <Pressable className="mt-5 h-14 items-center justify-center rounded-lg bg-primary px-8" onPress={() => router.push('/login')}>
            <Text className="font-body-bold text-white">Đăng nhập</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const favorites = favoritesQuery.data?.data ?? [];
  const groups = (['article', 'location', 'incident'] as const)
    .map((type) => ({ type, items: favorites.filter((f) => f.targetType === type) }))
    .filter((g) => g.items.length > 0);

  return (
    <View className="flex-1 bg-bg">
      <PageHeaderBare
        left={
          <View className="flex-row items-center gap-2">
            <IconButton accessibilityLabel="Quay lại" variant="soft" icon={<ChevronLeft size={20} color={colors.ink} />} onPress={() => router.back()} />
            <Text className="text-[22px] font-display text-ink">Đã lưu</Text>
          </View>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 48, gap: 24 }}>
        {favoritesQuery.isLoading && <Text className="mt-8 text-center text-sm text-muted">Đang tải…</Text>}
        {favoritesQuery.isError && <Text className="mt-8 text-center text-sm text-danger">Không tải được danh sách đã lưu.</Text>}
        {!favoritesQuery.isLoading && favorites.length === 0 && (
          <Text className="mt-8 text-center text-sm text-muted">
            Chưa có gì được lưu. Bấm biểu tượng ngôi sao/bookmark trên bài luật hoặc hướng dẫn xử lý sự cố để lưu lại.
          </Text>
        )}

        {groups.map((group) => {
          const meta = GROUP_META[group.type];
          const Icon = meta.icon;
          return (
            <View key={group.type}>
              <Text className="mb-2 text-[11px] font-body-bold uppercase tracking-wider text-muted">
                {meta.label} ({group.items.length})
              </Text>
              <View style={{ gap: 10 }}>
                {group.items.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => openItem(item)}
                    className="flex-row items-center rounded-lg border border-line bg-surface px-4 py-3.5"
                    style={{ gap: 12 }}
                  >
                    <IconTile tone={meta.tone} size={44}>
                      <Icon size={20} color={colors.ink} />
                    </IconTile>
                    <View className="flex-1">
                      <Text className="text-[16px] font-body-bold text-ink" numberOfLines={2}>
                        {item.title}
                      </Text>
                      <View className="mt-1 flex-row items-center" style={{ gap: 6 }}>
                        <Text className="text-[13px] text-muted" numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                        {item.isOutdated && <Badge label="Đã có bản mới" tone="warning" />}
                      </View>
                    </View>
                    <Pressable
                      accessibilityLabel="Bỏ lưu"
                      hitSlop={8}
                      onPress={(e) => {
                        e.stopPropagation();
                        removeMutation.mutate(item);
                      }}
                    >
                      <Trash2 size={18} color={colors.muted} />
                    </Pressable>
                    <ChevronRight size={18} color={colors.muted} />
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
