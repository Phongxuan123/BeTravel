import { View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Search } from 'lucide-react-native';
import { PageHeader } from '@/components/common/PageHeader';
import { IconButton } from '@/components/ui/IconButton';
import { colors } from '@/lib/theme';
import { useCountry } from '@/lib/countryContext';
import { fetchIncidents } from '@/lib/data';
import type { Incident } from '@/lib/data';

export default function IncidentsScreen() {
  const { countryCode } = useCountry();
  const incidentsQuery = useQuery({ queryKey: ['incidents', countryCode], queryFn: () => fetchIncidents(countryCode) });

  return (
    <View className="flex-1 bg-bg">
      <PageHeader
        title="Bạn đang gặp vấn đề gì?"
        subtitle="Hướng dẫn xử lý sự cố từng bước"
        right={
          <IconButton
            accessibilityLabel="Tìm sự cố"
            variant="soft"
            icon={<Search size={18} color={colors.primary} />}
            onPress={() => router.push({ pathname: '/coming-soon', params: { title: 'Tìm sự cố' } })}
          />
        }
      />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 48, gap: 12 }}>
        <Text className="text-sm font-body-bold text-ink">Chọn loại sự cố bạn đang gặp phải:</Text>

        {incidentsQuery.isLoading && <Text className="py-6 text-center text-sm text-muted">Đang tải…</Text>}
        {incidentsQuery.isError && (
          <Text className="py-6 text-center text-sm text-danger">Không tải được danh sách hướng dẫn. Kiểm tra kết nối mạng.</Text>
        )}
        {!incidentsQuery.isLoading && !incidentsQuery.isError && (incidentsQuery.data?.data.length ?? 0) === 0 && (
          <Text className="py-6 text-center text-sm text-muted">Chưa có hướng dẫn xử lý sự cố cho quốc gia này.</Text>
        )}

        <View className="flex-row flex-wrap justify-between" style={{ rowGap: 10 }}>
          {incidentsQuery.data?.data.map((incident) => (
            <IncidentRow key={incident.slug} incident={incident} />
          ))}
        </View>

        <Pressable className="mt-2 flex-row items-center rounded-lg bg-danger p-4" onPress={() => router.push('/sos')}>
          <View className="h-14 w-14 items-center justify-center rounded-md bg-white/[0.18]">
            <Text className="text-sm font-body-bold text-white">SOS</Text>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-lg font-body-bold text-white">Bạn đang gặp nguy hiểm?</Text>
            <Text className="text-sm text-white/85">Mở SOS Hub để gọi cứu hộ ngay</Text>
          </View>
          <ChevronRight size={20} color="#fff" />
        </Pressable>
      </ScrollView>
    </View>
  );
}

// Lưới 2 cột theo mẫu #14: tiêu đề tình huống + số bước, nhãn "Khẩn" chỉ hiện khi dữ liệu đánh dấu urgent.
function IncidentRow({ incident }: { incident: Incident }) {
  return (
    <Pressable
      accessibilityRole="button"
      className="min-h-[76px] justify-center rounded-2xl border border-line bg-surface px-3.5 py-3"
      style={{ width: '48.5%' }}
      onPress={() => router.push(`/incidents/${incident.slug}` as never)}
    >
      <Text className="text-sm font-body-bold text-ink" numberOfLines={2}>
        {incident.title}
      </Text>
      <Text className="mt-1 text-xs text-muted">
        {incident.steps.length} bước
        {incident.urgent ? ' · Khẩn' : ''}
      </Text>
    </Pressable>
  );
}
