import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react-native';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Button } from '@/components/ui/Button';
import { colors } from '@/lib/theme';
import { AU_SCOPE_NOTICE, AU_TOPICS_NOTICE, fetchAuLawTopics } from '@/lib/api/auLaws';

/*
 * Khối "Luật liên bang Úc" đặt dưới danh sách bài của Cẩm nang khi đang chọn Úc.
 * Hiện 5 mục do Be.Travel tuyển chọn; bấm vào mục mở màn /laws đã lọc theo mục đó.
 * Dữ liệu lấy trực tiếp từ nguồn chính thức nên tách hẳn khỏi các bài đã xác minh phía trên.
 */
export function AuLawsSection() {
  const topicsQuery = useQuery({ queryKey: ['au-law-topics'], queryFn: fetchAuLawTopics, retry: false });

  return (
    <View style={{ gap: 12 }}>
      <SectionHeader title="Luật liên bang Úc" />
      <View className="rounded-md bg-amber-soft p-3">
        <Text className="text-xs text-warning-strong">{AU_SCOPE_NOTICE}</Text>
      </View>
      {topicsQuery.isLoading && <Text className="text-sm text-muted">Đang tải…</Text>}
      {topicsQuery.isError && <Text className="text-sm text-danger-strong">Không tải được luật Úc. Kiểm tra kết nối mạng.</Text>}
      {topicsQuery.data?.map((topic) => (
        <Pressable
          key={topic.slug}
          accessibilityRole="button"
          className="rounded-2xl border border-line bg-surface p-3.5"
          onPress={() => router.push({ pathname: '/laws', params: { topic: topic.slug } } as never)}
        >
          <View className="flex-row items-center" style={{ gap: 10 }}>
            <View className="flex-1" style={{ gap: 4 }}>
              <Text className="text-sm font-body-bold text-ink">{topic.label}</Text>
              <Text className="text-xs text-muted" numberOfLines={2}>
                {topic.note}
              </Text>
              <Text className="text-xs font-body-semibold text-primary-strong">{topic.lawCount} văn bản</Text>
            </View>
            <ChevronRight size={20} color={colors.muted} />
          </View>
        </Pressable>
      ))}
      <Text className="text-[11px] text-muted">{AU_TOPICS_NOTICE}</Text>
      <Button label="Xem tất cả và tìm kiếm" variant="secondary" onPress={() => router.push('/laws' as never)} />
    </View>
  );
}
