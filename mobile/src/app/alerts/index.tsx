import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, TriangleAlert, Calendar } from 'lucide-react-native';
import { SimpleSheet } from '@/components/common/SimpleSheet';
import { Button } from '@/components/ui/Button';
import { AppShell, useAppShellBottomPadding } from '@/components/common/AppShell';
import { PageHeaderBare } from '@/components/common/PageHeader';
import { IconTile, type Tone } from '@/components/ui/IconTile';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { colors } from '@/lib/theme';
import { fetchAlerts, markAlertRead, markAllAlertsRead } from '@/lib/data';
import type { Alert } from '@/lib/data';
import { now } from '@/lib/date';
import { useCountry } from '@/lib/countryContext';
import { useAuth } from '@/lib/auth';

const CATEGORY_META: Record<Alert['category'], { icon: typeof CircleAlert; tone: Tone; badge: BadgeTone; label: string }> = {
  safety: { icon: CircleAlert, tone: 'red', badge: 'danger', label: 'An toàn' },
  legal: { icon: TriangleAlert, tone: 'orange', badge: 'warning', label: 'Pháp lý' },
  trip: { icon: Calendar, tone: 'green', badge: 'success', label: 'Chuyến đi' },
};

// Nhãn trùng với Admin Portal (GeoAlertsPage) để người soạn và người đọc cảnh báo thấy cùng một mức.
const SEVERITY_META: Record<NonNullable<Alert['severity']>, { label: string; badge: BadgeTone }> = {
  danger: { label: 'Nguy hiểm', badge: 'danger' },
  warn: { label: 'Cảnh báo', badge: 'warning' },
  info: { label: 'Thông tin', badge: 'info' },
};

const FILTERS: { key: 'all' | Alert['category']; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'legal', label: 'Pháp lý' },
  { key: 'safety', label: 'An toàn' },
  { key: 'trip', label: 'Chuyến đi' },
];

export default function AlertsScreen() {
  const bottomPadding = useAppShellBottomPadding();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');
  const [detail, setDetail] = useState<Alert | null>(null);
  const { countryCode } = useCountry();
  const { user, isGuest } = useAuth();
  const alertsQuery = useQuery({ queryKey: ['alerts', countryCode, user?.email ?? null], queryFn: fetchAlerts, enabled: !isGuest });
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
    setDetail(alert);
    try {
      await markAlertRead(alert.id);
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    } catch {
      // Danh dau da doc that bai khong nen chan nguoi dung xem noi dung --
      // chi la thong bao co the con hien "chua doc".
    }
  };

  const openRelated = (alert: Alert) => {
    setDetail(null);
    router.push(alert.category === 'trip' ? '/trips' : '/explore');
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
      {/* flexGrow 0: ScrollView ngang mặc định giãn hết chiều dọc còn lại, đẩy danh sách xuống (B12). */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} className="border-b border-line bg-surface px-[18px] py-3">
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

      <ScrollView
        contentContainerStyle={{ padding: 18, paddingBottom: bottomPadding, gap: 20 }}
        refreshControl={
          <RefreshControl refreshing={alertsQuery.isRefetching} onRefresh={() => void alertsQuery.refetch()}
            enabled={!isGuest} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        {alertsQuery.isLoading && <Text className="mt-8 text-center text-sm text-muted">Đang tải…</Text>}
        {alertsQuery.isError && <Text className="mt-8 text-center text-sm text-danger">Không tải được cảnh báo. Kiểm tra kết nối mạng.</Text>}
        {!alertsQuery.isLoading && !alertsQuery.isError && alerts.length === 0 && (
          <Text className="mt-8 text-center text-sm text-muted">Không có cảnh báo nào.</Text>
        )}
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

      <SimpleSheet visible={detail !== null} onClose={() => setDetail(null)} title={detail?.title ?? ''}>
        {detail && (
          <View style={{ gap: 12 }}>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Badge label={CATEGORY_META[detail.category].label} tone={CATEGORY_META[detail.category].badge} />
              {detail.severity && <Badge label={SEVERITY_META[detail.severity].label} tone={SEVERITY_META[detail.severity].badge} />}
              <Text className="flex-1 text-xs text-subtle" numberOfLines={1}>{detail.meta}</Text>
            </View>
            <Text className="text-base leading-6 text-ink">{detail.body}</Text>
            {!!detail.behaviorsToAvoid?.length && (
              <View className="rounded-lg border border-creamLine bg-warning-tint p-4" style={{ borderColor: colors.creamLine, gap: 6 }}>
                <Text className="text-[15px] font-body-bold text-warning-strong">Khuyến nghị: điều cần tránh</Text>
                {detail.behaviorsToAvoid.map((item, i) => (
                  <Text key={i} className="text-sm leading-relaxed text-ink">- {item}</Text>
                ))}
              </View>
            )}
            <Button label="Xem thông tin liên quan" onPress={() => openRelated(detail)} />
          </View>
        )}
      </SimpleSheet>
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
            {alert.severity && <Badge label={SEVERITY_META[alert.severity].label} tone={SEVERITY_META[alert.severity].badge} />}
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
  return { blue: colors.primary, red: colors.danger, orange: colors.warning, green: colors.successStrong }[tone];
}
