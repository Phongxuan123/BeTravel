import { ScrollView, View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  Calendar,
  MessageCirclePlus,
  FileText,
  TriangleAlert,
  CircleAlert,
  Phone,
  Languages,
  Map as MapIcon,
  Search,
  ChevronRight,
} from 'lucide-react-native';
import { AppShell, APP_SHELL_CONTENT_BOTTOM_PADDING } from '@/components/common/AppShell';
import { ListRow } from '@/components/common/ListRow';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { IconTile } from '@/components/ui/IconTile';
import { Button } from '@/components/ui/Button';
import { CountryFlag } from '@/components/brand/CountryFlag';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors } from '@/lib/theme';
import { openPhone } from '@/lib/openExternal';
import { useCountry } from '@/lib/countryContext';
import { useAuth } from '@/lib/auth';
import { fetchTrips, fetchAlerts, fetchArticles, fetchCountries } from '@/lib/data';
import { formatTripRange } from '@/lib/format';
import { now, daysBetween, parseISODate } from '@/lib/date';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { country: selectedCountry, countryCode: selectedCountryCode } = useCountry();
  const { user, isGuest, isLoading: authLoading } = useAuth();

  // /users/trips là endpoint có auth; khách chưa đăng nhập không nên gọi rồi
  // hiện banner lỗi mạng vì 401 là hành vi đúng của backend.
  const tripsQuery = useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
    enabled: !isGuest && !authLoading,
  });
  const countriesQuery = useQuery({ queryKey: ['countries'], queryFn: fetchCountries });
  const alertsQuery = useQuery({ queryKey: ['alerts'], queryFn: fetchAlerts });

  const trips = tripsQuery.data?.data ?? [];
  const today = now();
  const ongoingTrips = trips.filter((trip) => {
    const start = parseISODate(trip.startDate);
    const end = parseISODate(trip.endDate);
    return today >= start && today <= end;
  });
  const upcomingTrips = trips
    .filter((trip) => today < parseISODate(trip.startDate))
    .sort((a, b) => parseISODate(a.startDate).getTime() - parseISODate(b.startDate).getTime());
  const pastTrips = trips
    .filter((trip) => today > parseISODate(trip.endDate))
    .sort((a, b) => parseISODate(b.endDate).getTime() - parseISODate(a.endDate).getTime());

  // Ưu tiên đúng theo trạng thái thời gian: chuyến đang diễn ra trước. Nếu
  // không có chuyến nào đang diễn ra thì hiển thị chuyến sắp tới gần nhất.
  // isCurrent chỉ dùng làm tie-breaker trong cùng một nhóm, không được khiến
  // một chuyến tương lai che mất chuyến đang diễn ra.
  const currentTrip =
    ongoingTrips.find((trip) => trip.isCurrent) ??
    ongoingTrips[0] ??
    upcomingTrips.find((trip) => trip.isCurrent) ??
    upcomingTrips[0] ??
    pastTrips.find((trip) => trip.isCurrent) ??
    pastTrips[0];

  const countryCode = currentTrip?.countryCode ?? selectedCountryCode;
  const country = countriesQuery.data?.data.find((c) => c.code === countryCode) ?? selectedCountry;
  const articlesQuery = useQuery({
    queryKey: ['articles', countryCode],
    queryFn: () => fetchArticles(countryCode),
    enabled: !!countryCode,
  });
  const unreadAlertItems = (alertsQuery.data?.data ?? []).filter((a) => !a.read).slice(0, 2);
  const unreadAlerts = alertsQuery.data?.data.filter((a) => !a.read).length ?? 0;

  const initials = user ? user.name.slice(0, 2).toUpperCase() : '';

  return (
    <AppShell active="home">
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: APP_SHELL_CONTENT_BOTTOM_PADDING, paddingHorizontal: 18 }}
      >
        {(tripsQuery.isError || articlesQuery.isError) && (
          <View className="mb-3 rounded-md bg-danger-tint p-3">
            <Text className="text-center text-sm text-danger">Không tải được một số dữ liệu. Kiểm tra kết nối mạng.</Text>
          </View>
        )}

        {/* Header */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center" style={{ gap: 12 }}>
            {!isGuest && (
              <View className="h-[46px] w-[46px] items-center justify-center rounded-md bg-[#DCE8FB]">
                <Text className="text-[18px] font-body-bold text-primary-strong">{initials}</Text>
              </View>
            )}
            <View>
              {isGuest ? (
                <Text className="text-sm text-muted">Xin chào</Text>
              ) : (
                <Text className="text-sm text-muted">Xin chào, {user?.name}</Text>
              )}
              <View className="mt-0.5 flex-row items-center" style={{ gap: 6 }}>
                <CountryFlag code={countryCode} width={22} height={16} />
                <Text className="text-[17px] font-body-bold text-ink">{country?.name}</Text>
                <Badge label={currentTrip ? (currentTrip.isCurrent ? "Chuyến đi chính" : "Theo lịch trình") : "Đang chọn"} tone="success" />
              </View>
            </View>
          </View>
          {isGuest ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/login')}
              className="h-11 items-center justify-center rounded-md bg-primary px-4"
            >
              <Text className="text-sm font-body-bold text-white">Đăng nhập</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityLabel="Thông báo"
              accessibilityRole="button"
              onPress={() => router.push('/alerts')}
              className="h-[46px] w-[46px] items-center justify-center rounded-md border border-line bg-surface"
            >
              <Bell size={20} color={colors.ink} />
              {unreadAlerts > 0 && (
                <View className="absolute right-2 top-2 h-[9px] w-[9px] rounded-full border-2 border-white bg-danger" />
              )}
            </Pressable>
          )}
        </View>

        {/* Hero: current trip */}
        <View className="mt-5">
          {tripsQuery.isLoading ? (
            <Skeleton className="h-[190px] rounded-xl" />
          ) : currentTrip ? (
            <CurrentTripCard
              countryCode={currentTrip.countryCode}
              countryName={country?.name}
              destinationCity={currentTrip.destinationCity}
              destinationDetail={currentTrip.destinationDetail}
              startDate={currentTrip.startDate}
              endDate={currentTrip.endDate}
              keyNote={articlesQuery.data?.data[0]?.title}
              onKeyNotePress={() => {
                const first = articlesQuery.data?.data[0];
                if (first) router.push(`/explore/${countryCode}/${first.slug}` as never);
              }}
            />
          ) : (
            <View className="items-center rounded-xl border border-dashed border-primary bg-surface px-5 py-8">
              <Text className="text-center text-[15px] font-body-semibold text-ink">Bạn chưa có chuyến đi nào</Text>
              <View className="mt-4 w-full">
                <Button label="Tạo chuyến đi" onPress={() => router.push('/trips/new?step=1')} />
              </View>
            </View>
          )}
        </View>

        {/* 4 thao tác nhanh theo spec 3.4 */}
        <View className="mt-5 flex-row" style={{ gap: 10 }}>
          <QuickTile label="AI pháp lý" tone="blue" icon={<MessageCirclePlus size={22} color={colors.primary} />} onPress={() => router.push('/chat')} />
          <QuickTile
            label="SOS"
            tone="red"
            icon={<Text className="font-display text-[13px] text-danger">SOS</Text>}
            onPress={() => router.push('/sos')}
            danger
          />
          <QuickTile label="Dịch nhanh" tone="blue" icon={<Languages size={22} color={colors.primary} />} onPress={() => router.push('/translate')} />
          <QuickTile label="Bản đồ" tone="green" icon={<MapIcon size={22} color={colors.successStrong} />} onPress={() => router.push('/sos/map')} />
        </View>

        {/* Lối tắt phụ */}
        <View className="mt-3" style={{ gap: 10 }}>
          <ListRow
            icon={<IconTile tone="orange"><TriangleAlert size={20} color={colors.warning} /></IconTile>}
            title="Gặp sự cố khẩn cấp"
            subtitle="Quy trình xử lý 5 bước"
            onPress={() => router.push('/incidents')}
          />
          <ListRow
            icon={<IconTile tone="blue"><Search size={20} color={colors.primary} /></IconTile>}
            title="Tra cứu luật nhanh"
            subtitle="Hỏi hoặc tìm trong cẩm nang đã xác minh"
            onPress={() => router.push('/search')}
          />
        </View>

        {/* Cảnh báo quan trọng */}
        {unreadAlertItems.length > 0 && (
          <View className="mt-7">
            <SectionHeader title="Cảnh báo quan trọng" actionLabel="Xem tất cả" onAction={() => router.push('/alerts')} />
            <View className="mt-3" style={{ gap: 10 }}>
              {unreadAlertItems.map((alert) => (
                <Pressable
                  key={alert.id}
                  accessibilityRole="button"
                  onPress={() => router.push('/alerts')}
                  className="flex-row items-start gap-3 rounded-lg border border-danger-line bg-danger-tint p-4"
                >
                  <CircleAlert size={20} color={colors.danger} />
                  <View className="flex-1">
                    <Text className="text-[14px] font-body-bold text-ink">{alert.title}</Text>
                    <Text className="mt-0.5 text-xs leading-relaxed text-muted" numberOfLines={2}>
                      {alert.body}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Thông tin dành cho bạn */}
        <View className="mt-7">
          <SectionHeader title="Pháp lý & mẹo du lịch" actionLabel="Xem tất cả" onAction={() => router.push('/explore')} />
          <View className="mt-3" style={{ gap: 10 }}>
            {articlesQuery.isLoading ? (
              <>
                <Skeleton className="h-[66px] rounded-lg" />
                <Skeleton className="h-[66px] rounded-lg" />
              </>
            ) : (
              articlesQuery.data?.data.slice(0, 3).map((a) => (
                <ListRow
                  key={a.id}
                  icon={
                    <IconTile tone={a.topicKey === 'security' ? 'red' : a.topicKey === 'fines' ? 'orange' : 'blue'}>
                      {a.topicKey === 'security' ? (
                        <CircleAlert size={20} color={colors.danger} />
                      ) : (
                        <FileText size={20} color={colors.primary} />
                      )}
                    </IconTile>
                  }
                  title={a.title}
                  subtitle={`${a.summary.slice(0, 40)}… · ${country?.name}`}
                  onPress={() => router.push(`/explore/${countryCode}/${a.slug}` as never)}
                />
              ))
            )}
          </View>
        </View>

        {/* Dải gọi nhanh khẩn cấp */}
        <View className="mt-7">
          <SectionHeader title="Gọi nhanh khẩn cấp" actionLabel="Trung tâm SOS" onAction={() => router.push('/sos')} />
          <View className="mt-3 flex-row" style={{ gap: 10 }}>
            <CallTile label="Cảnh sát" number={country?.emergencyNumbers.police} tone="red" />
            <CallTile label="Cấp cứu" number={country?.emergencyNumbers.ambulance} tone="red" />
            <CallTile label="Đại sứ quán" number={country?.embassy.phone} tone="blue" compact />
          </View>
        </View>
      </ScrollView>
    </AppShell>
  );
}

function CurrentTripCard({
  countryCode,
  countryName,
  destinationCity,
  destinationDetail,
  startDate,
  endDate,
  keyNote,
  onKeyNotePress,
}: {
  countryCode: string;
  countryName?: string;
  destinationCity: string;
  destinationDetail?: string;
  startDate: string;
  endDate: string;
  keyNote?: string;
  onKeyNotePress?: () => void;
}) {
  const today = now();
  const start = parseISODate(startDate);
  const end = parseISODate(endDate);
  const totalDays = Math.max(1, daysBetween(start, end));
  const elapsed = Math.min(Math.max(daysBetween(start, today), 0), totalDays);
  const upcoming = today < start;
  const past = today > end;
  const remaining = Math.max(daysBetween(today, end), 0);
  const daysUntilStart = Math.max(daysBetween(today, start), 0);
  const progress = upcoming ? 0 : past ? 1 : elapsed / totalDays;
  const statusLabel = upcoming ? 'Sắp tới' : past ? 'Đã kết thúc' : 'Đang diễn ra';
  const statusColor = upcoming ? colors.warning : past ? colors.muted : colors.success;
  const timingLabel = upcoming ? `Khởi hành sau ${daysUntilStart} ngày` : past ? 'Đã kết thúc' : `Còn ${remaining} ngày`;

  return (
    <View
      className="overflow-hidden rounded-xl bg-primary p-5"
      style={{ shadowColor: 'rgba(22,119,255,1)', shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 }}
    >
      {/* Vòng tròn mờ làm nền trang trí, giữ chữ trắng đủ tương phản */}
      <View className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
      <View className="absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-black/10" />

      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <View className="overflow-hidden rounded-sm border border-white/60">
            <CountryFlag code={countryCode} width={30} height={22} />
          </View>
          <Text className="text-xs font-body-bold tracking-wide text-white/85">BẠN ĐANG Ở</Text>
        </View>
        <View className="flex-row items-center gap-1.5 rounded-full bg-white px-2.5 py-1">
          <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
          <Text className="text-[13px] font-body-bold" style={{ color: statusColor }}>{statusLabel}</Text>
        </View>
      </View>

      <Text className="mt-3 font-display text-white" style={{ fontSize: 28, lineHeight: 34 }}>
        {destinationCity || countryName || countryCode}
      </Text>
      {!!destinationDetail && (
        <Text className="mt-0.5 text-sm font-body-semibold text-white/80" numberOfLines={1}>
          {destinationDetail}
        </Text>
      )}
      <View className="mt-2 flex-row items-center" style={{ gap: 8 }}>
        <Calendar size={16} color="#fff" />
        <Text className="font-mono text-[13px] text-white">{formatTripRange(startDate, endDate)}</Text>
        <Text className="text-white/60">·</Text>
        <Text className="text-[13px] text-white/90">{timingLabel}</Text>
      </View>
      <View className="mt-3 h-1.5 rounded-full bg-white/30">
        <View className="h-1.5 rounded-full bg-white" style={{ width: `${Math.round(progress * 100)}%` }} />
      </View>

      {!!keyNote && (
        <Pressable
          accessibilityRole="button"
          onPress={onKeyNotePress}
          className="mt-4 flex-row items-center rounded-lg bg-white/15 px-3.5 py-3"
          style={{ gap: 10 }}
        >
          <TriangleAlert size={18} color="#fff" />
          <View className="flex-1">
            <Text className="text-[11px] font-body-bold tracking-wide text-white/75">LƯU Ý PHÁP LÝ QUAN TRỌNG</Text>
            <Text className="mt-0.5 text-[13px] font-body-semibold text-white" numberOfLines={2}>{keyNote}</Text>
          </View>
          <ChevronRight size={18} color="#fff" />
        </Pressable>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/trips')}
        className="mt-3 h-12 items-center justify-center rounded-md bg-white"
      >
        <Text className="text-base font-body-bold text-primary-strong">Xem chuyến đi</Text>
      </Pressable>
    </View>
  );
}

function QuickTile({
  label,
  tone,
  icon,
  onPress,
  danger,
}: {
  label: string;
  tone: 'blue' | 'red' | 'orange' | 'green';
  icon: React.ReactNode;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`flex-1 items-center justify-center gap-2 rounded-lg border bg-surface py-4 ${
        danger ? 'border-danger-line' : 'border-line'
      }`}
    >
      <IconTile tone={tone}>{icon}</IconTile>
      <Text className="text-[13px] font-body-semibold text-ink" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function CallTile({
  label,
  number,
  tone,
  compact,
}: {
  label: string;
  number?: string;
  tone: 'red' | 'blue';
  compact?: boolean;
}) {
  const isRed = tone === 'red';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Gọi ${label}`}
      disabled={!number}
      onPress={() => void openPhone(number)}
      className={`min-h-[84px] flex-1 items-center justify-center rounded-lg border px-2 ${
        isRed ? 'border-danger-line bg-danger-tint' : 'border-line bg-surface'
      }`}
      style={{ gap: 4 }}
    >
      <Phone size={18} color={isRed ? colors.dangerStrong : colors.primary} />
      <Text className="text-[13px] font-body-bold text-ink" numberOfLines={1}>{label}</Text>
      <Text
        className="font-mono-bold text-[15px]"
        style={{ color: isRed ? colors.dangerStrong : colors.primaryStrong }}
        numberOfLines={1}
        adjustsFontSizeToFit={compact}
      >
        {number || '--'}
      </Text>
    </Pressable>
  );
}
