import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, TriangleAlert, Calendar } from 'lucide-react-native';
import { AppShell, APP_SHELL_CONTENT_BOTTOM_PADDING } from '@/components/common/AppShell';
import { PageHeaderBare } from '@/components/common/PageHeader';
import { IconTile, type Tone } from '@/components/ui/IconTile';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { colors } from '@/lib/theme';
import { fetchAlerts, markAlertRead, markAllAlertsRead } from '@/lib/data';
import type { Alert } from '@/mocks/schemas';
import { now } from '@/lib/date';

const CATEGORY_META: Record<Alert['category'], { icon: typeof CircleAlert; tone: Tone; badge: BadgeTone; label: string }> = {
  safety: { icon: CircleAlert, tone: 'red', badge: 'danger', label: 'An toàn' },
  legal: { icon: TriangleAlert, tone: 'orange', badge: 'warning', label: 'Pháp lý' },
  trip: { icon: Calendar, tone: 'green', badge: 'success', label: 'Chuyến đi' },
};

const FILTERS: { key: 'all' | Alert['category']; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'legal', label: 'Pháp lý' },
  { key: 'safety', label: 'An toàn' },
  { key: 'trip', label: 'Chuyến đi' },
];

export default function AlertsScreen() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');
  const alertsQuery = useQuery({ queryKey: ['alerts'], queryFn: fetchAlerts });
  const queryClient = useQueryClient();
  const alerts = (alertsQuery.data?.data ?? []).filter((a) => filter === 'all' || a.category === filter);

  const groups = useMemo(() => {
    const today: Alert[] = [];
    const thisWeek: Alert[] = [];
    const earlier: Alert[] = [];
    const nowMs = now().getTime();
    alerts.forEach((a) => {
      const hoursAgo = (nowMs - new Date(a.createdAt).getTime()) / 3_600_000;
      if (hoursAgo < 24) today.push(a);
      else if (hoursAgo < 24 * 7) thisWeek.push(a);
      else earlier.push(a);
    });
    return { today, thisWeek, earlier };
  }, [alerts]);

  const onOpen = async (alert: Alert) => {
    try {
      await markAlertRead(alert.id);
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    } catch {
      // Danh dau da doc that bai khong nen chan nguoi dung xem noi dung --
      // van dieu huong tiep, chi la thong bao co the con hien "chua doc".
    }
    if (alert.category === 'trip') router.push('/trips');
    else router.push('/explore');
  };

  const onReadAll = async () => {
    try {
      await markAllAlertsRead();
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    } catch {
      // Nuot loi co chu dich: day la thao tac phu, khong can bao loi to
      // cho nguoi dung, chi khong crash ung dung.
    }
  };

  return (
    <AppShell active="home">
      <PageHeaderBare
        left={<Text className="text-[24px] font-display text-ink">Cảnh báo</Text>}
        right={
          <Pressable onPress={onReadAll}>
            <Text className="text-[15px] font-body-bold text-primary" numberOfLines={1}>
              Đọc tất cả
            </Text>
          </Pressable>
        }
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="border-b border-line bg-surface px-[18px] py-3">
        <View className="flex-row" style={{ gap: 8 }}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable key={f.key} onPress={() => setFilter(f.key)} className={`h-[38px] items-center justify-center rounded-full border px-4 ${active ? 'border-primary bg-primary' : 'border-line bg-surface'}`}>
                <Text className={`text-sm font-body-semibold ${active ? 'text-white' : 'text-ink'}`} numberOfLines={1}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: APP_SHELL_CONTENT_BOTTOM_PADDING, gap: 20 }}>
        {(['today', 'thisWeek', 'earlier'] as const).map((key) => {
          const list = groups[key];
          if (list.length === 0) return null;
          const label = key === 'today' ? 'HÔM NAY' : key === 'thisWeek' ? 'TUẦN NÀY' : 'TRƯỚC ĐÓ';
          return (
            <View key={key}>
              <Text className="mb-2 text-[11px] font-body-bold uppercase tracking-wider text-muted">{label}</Text>
              <View style={{ gap: 10 }}>
                {list.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} onPress={() => onOpen(alert)} />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </AppShell>
  );
}

function AlertCard({ alert, onPress }: { alert: Alert; onPress: () => void }) {
  const meta = CATEGORY_META[alert.category];
  const Icon = meta.icon;
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-lg border bg-surface p-4 ${!alert.read && alert.category === 'safety' ? 'border-danger-line' : 'border-line'}`}
    >
      <View className="flex-row" style={{ gap: 12 }}>
        <View>
          <IconTile tone={meta.tone} size={52}>
            <Icon size={22} color={toneColor(meta.tone)} />
          </IconTile>
          {!alert.read && <View className="absolute right-0 top-0 h-[9px] w-[9px] rounded-full border-2 border-white bg-danger" />}
        </View>
        <View className="flex-1">
          <Text className="text-[18px] font-body-bold text-ink">{alert.title}</Text>
          <Text className="mt-1 text-[15px] text-muted" numberOfLines={2}>
            {alert.body}
          </Text>
          <View className="mt-2 flex-row items-center" style={{ gap: 8 }}>
            <Badge label={meta.label} tone={meta.badge} />
            <Text className="text-[13px] text-subtle" numberOfLines={1}>
              {alert.meta}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function toneColor(tone: Tone): string {
  return { blue: colors.primary, red: colors.danger, orange: colors.warning, green: colors.success }[tone];
}
