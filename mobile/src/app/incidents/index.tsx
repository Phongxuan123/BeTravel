import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, IdCard, ShieldAlert, Car, ShoppingBag, Plus, Siren, Search } from 'lucide-react-native';
import { PageHeader } from '@/components/common/PageHeader';
import { IconButton } from '@/components/ui/IconButton';
import { IconTile, type Tone } from '@/components/ui/IconTile';
import { Badge } from '@/components/ui/Badge';
import { colors } from '@/lib/theme';
import { fetchIncidents } from '@/lib/data';
import type { Incident } from '@/mocks/schemas';

const ICONS: Record<string, typeof IdCard> = { IdCard, ShieldAlert, Car, ShoppingBag, Plus, Siren };

export default function IncidentsScreen() {
  const incidentsQuery = useQuery({ queryKey: ['incidents'], queryFn: fetchIncidents });

  return (
    <View className="flex-1 bg-bg">
      <PageHeader
        title="Xử lý sự cố"
        right={
          <IconButton
            accessibilityLabel="Tìm sự cố"
            variant="soft"
            icon={<Search size={18} color={colors.primary} />}
            onPress={() => Alert.alert('Tìm sự cố', 'Tính năng tìm kiếm trong danh sách sự cố sẽ có ở bản cập nhật sau.')}
          />
        }
      />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 48, gap: 12 }}>
        <Text className="text-[15px] text-muted">Chọn tình huống bạn đang gặp — mỗi hướng dẫn có các bước làm ngay.</Text>

        {incidentsQuery.data?.data.map((incident) => (
          <IncidentRow key={incident.slug} incident={incident} />
        ))}

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

function IncidentRow({ incident }: { incident: Incident }) {
  const Icon = ICONS[incident.iconKey] ?? IdCard;
  return (
    <Pressable
      className="h-[80px] flex-row items-center rounded-lg border border-line bg-surface px-4"
      onPress={() => router.push(`/incidents/${incident.slug}` as never)}
    >
      <IconTile tone={incident.tone as Tone} size={52}>
        <Icon size={22} color={toneIconColor(incident.tone)} />
      </IconTile>
      <View className="ml-3 flex-1">
        <Text className="text-[19px] font-body-bold text-ink">{incident.title}</Text>
        <View className="mt-1 flex-row" style={{ gap: 6 }}>
          <Badge label={`${incident.steps.length} bước`} tone="neutral" />
          {incident.urgent && <Badge label="Khẩn" tone="danger" />}
        </View>
      </View>
      <ChevronRight size={20} color={colors.muted} />
    </Pressable>
  );
}

function toneIconColor(tone: Incident['tone']): string {
  return { blue: colors.primary, red: colors.danger, orange: colors.warning, green: colors.success }[tone];
}
