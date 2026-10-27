import { ScrollView, View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Logo } from '@/components/brand/Logo';
import { TopInsetView } from '@/components/common/screenTopInset';
import {
  Bell,
  Calendar,
  Sparkles,
  FileText,
  TriangleAlert,
  CircleAlert,
  Phone,
  Languages,
  MapPin,
  ShieldAlert,
  Siren,
  BookOpen,
  ChevronRight,
  ArrowRight,
} from 'lucide-react-native';
import { AppShell, useAppShellBottomPadding } from '@/components/common/AppShell';
import { ListRow } from '@/components/common/ListRow';
import { SectionHeader } from '@/components/common/SectionHeader';
import { IconTile } from '@/components/ui/IconTile';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors } from '@/lib/theme';
import { openPhone } from '@/lib/openExternal';
import { useCountry } from '@/lib/countryContext';
import { useAuth } from '@/lib/auth';
import { fetchTrips, fetchAlerts, fetchArticles, fetchCountries } from '@/lib/data';
import { isFeatureDisabledError } from '@/lib/api/http';
import { formatTripRange } from '@/lib/format';
import type { Alert } from '@/lib/data';
import { now, daysBetween, parseISODate } from '@/lib/date';
import { activeStop } from '@/features/trips/itinerary';

export default function HomeScreen() {
  const bottomPadding = useAppShellBottomPadding();
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

  const currentStop = currentTrip ? activeStop(currentTrip) : null;
  const countryCode = currentStop?.countryCode ?? selectedCountryCode;
  const country = countriesQuery.data?.data.find((c) => c.code === countryCode) ?? selectedCountry;
  const articlesQuery = useQuery({
    queryKey: ['articles', countryCode],
    queryFn: () => fetchArticles(countryCode),
    enabled: !!countryCode,
  });
  const unreadAlertItems = (alertsQuery.data?.data ?? []).filter((a) => !a.read).slice(0, 2);
  // Tra cuu phap luat dang bi phong toa o backend: khong bao nham la loi mang.
  const articlesDisabled = isFeatureDisabledError(articlesQuery.error);
  const unreadAlerts = alertsQuery.data?.data.filter((a) => !a.read).length ?? 0;

  const initials = user ? user.name.slice(0, 2).toUpperCase() : '';
  // Tên gọi của người Việt là từ cuối của họ tên ("Nguyễn Quang Minh" --> "Minh").
  const givenName = user?.name.trim().split(/\s+/).pop() ?? '';
  const changeCountryHref = currentTrip ? '/trips' : '/trips/new?step=1';

  return (
    <AppShell active="home">
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPadding, paddingHorizontal: 18 }}
      >
        <TopInsetView extra={16} />
        <View className="mb-4"><Logo size={36} textSize={20} /></View>
        {(tripsQuery.isError || (articlesQuery.isError && !articlesDisabled)) && (
          <View className="mb-3 rounded-md bg-danger-tint p-3">
            <Text className="text-center text-sm text-danger">Không tải được một số dữ liệu. Kiểm tra kết nối mạng.</Text>
          </View>
        )}

        {/* Header: avatar, lời chào, điểm đến, chuông có số đếm (mẫu #05) */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center" style={{ gap: 12 }}>
            {!isGuest && (
              <View className="h-[46px] w-[46px] items-center justify-center rounded-2xl border border-line bg-[#DCE8FB]">
                <Text className="text-[16px] font-body-bold text-primary-strong">{initials}</Text>
              </View>
            )}
            <View className="flex-1">
              <Text className="text-[17px] font-display text-ink" numberOfLines={1}>
                {isGuest ? 'Xin chào' : `Xin chào, ${givenName}`}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đổi điểm đến"
                onPress={() => router.push(changeCountryHref as never)}
                className="mt-0.5 flex-row items-center"
                style={{ gap: 4 }}
              >
                <Text className="font-mono-bold text-[10px] text-primary">{countryCode}</Text>
                <Text className="text-[13px] font-body-bold text-primary" numberOfLines={1}>
                  Điểm đến: {country?.name}
                </Text>
                <ChevronRight size={14} color={colors.primary} />
              </Pressable>
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
              accessibilityLabel={unreadAlerts > 0 ? `Thông báo, ${unreadAlerts} chưa đọc` : 'Thông báo'}
              accessibilityRole="button"
              onPress={() => router.push('/alerts')}
              className="h-[46px] w-[46px] items-center justify-center rounded-2xl border border-line bg-surface"
            >
              <Bell size={20} color={colors.ink} />
              {unreadAlerts > 0 && (
                <View className="absolute -right-1 -top-1 h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1">
                  <Text className="text-[10px] font-body-bold text-white">{unreadAlerts > 9 ? '9+' : unreadAlerts}</Text>
                </View>
              )}
            </Pressable>
          )}
        </View>

        {/* Hero: quốc gia / chuyến đi hiện tại */}
        <View className="mt-5">
          {tripsQuery.isLoading ? (
            <Skeleton className="h-[220px] rounded-3xl" />
          ) : currentTrip ? (
            <CurrentTripCard
              countryCode={countryCode}
              countryName={country?.name}
              destinationCity={currentStop?.destinationCity ?? currentTrip.destinationCity}
              startDate={currentTrip.startDate}
              endDate={currentTrip.endDate}
              police={country?.emergencyNumbers.police}
              ambulance={country?.emergencyNumbers.ambulance}
              changeCountryHref={changeCountryHref}
              keyNote={articlesQuery.data?.data[0]?.title}
              onKeyNotePress={() => {
                const first = articlesQuery.data?.data[0];
                if (first) router.push(`/explore/${countryCode}/${first.slug}` as never);
              }}
            />
          ) : (
            <View className="items-center rounded-3xl border border-dashed border-primary bg-surface px-5 py-8">
              <Text className="text-center text-[15px] font-body-semibold text-ink">Bạn chưa có chuyến đi nào</Text>
              <View className="mt-4 w-full">
                <Button label="Tạo chuyến đi" onPress={() => router.push('/trips/new?step=1')} />
              </View>
            </View>
          )}
        </View>

        {/* 4 thao tác nhanh theo spec 3.4 */}
        <View className="mt-6 flex-row items-center justify-between">
          <Text className="text-base font-display text-ink">Thao tác nhanh</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/incidents')} className="flex-row items-center" style={{ gap: 4 }}>
            <Text className="text-[13px] font-body-bold text-primary">Báo cáo sự cố</Text>
            <ArrowRight size={14} color={colors.primary} />
          </Pressable>
        </View>
        <View className="mt-3 flex-row" style={{ gap: 10 }}>
          <QuickTile label="AI pháp lý" icon={<Sparkles size={22} color={colors.primary} />} onPress={() => router.push('/chat')} />
          <QuickTile
            label="SOS"
            icon={<ShieldAlert size={22} color="#fff" />}
            onPress={() => router.push('/sos')}
            danger
          />
          <QuickTile label="Dịch nhanh" icon={<Languages size={22} color={colors.primary} />} onPress={() => router.push('/translate')} />
          <QuickTile label="Bản đồ hỗ trợ" icon={<MapPin size={22} color={colors.primary} />} onPress={() => router.push('/sos/map')} />
        </View>

        {/* Lối tắt phụ: hai thẻ cạnh nhau */}
        <View className="mt-3 flex-row" style={{ gap: 10 }}>
          <ShortcutCard
            title="Gặp sự cố khẩn cấp?"
            subtitle="Quy trình 5 bước xử lý"
            icon={<Siren size={18} color={colors.danger} />}
            onPress={() => router.push('/incidents')}
          />
          <ShortcutCard
            title="Tra cứu luật nhanh"
            subtitle="Hộ chiếu, hải quan..."
            icon={<BookOpen size={18} color={colors.primary} />}
            onPress={() => router.push('/search')}
          />
        </View>

        {/* Cảnh báo quan trọng */}
        {unreadAlertItems.length > 0 && (
          <View className="mt-7">
            <SectionHeader
              title="Cảnh báo quan trọng"
              actionLabel={`Xem tất cả (${unreadAlerts})`}
              onAction={() => router.push('/alerts')}
            />
            <View className="mt-3" style={{ gap: 10 }}>
              {unreadAlertItems.map((alert) => (
                <HomeAlertCard key={alert.id} alert={alert} onPress={() => router.push('/alerts')} />
              ))}
            </View>
          </View>
        )}

        {/* Thông tin dành cho bạn */}
        <View className="mt-7">
          <SectionHeader title="Pháp lý & mẹo du lịch" actionLabel="Xem tất cả" onAction={() => router.push('/explore')} />
          <View className="mt-3" style={{ gap: 10 }}>
            {articlesDisabled ? (
              <Text className="text-sm text-muted">Mục tra cứu pháp luật đang tạm ngưng để cập nhật nội dung.</Text>
            ) : articlesQuery.isLoading ? (
              <>
                <Skeleton className="h-[66px] rounded-lg" />
                <Skeleton className="h-[66px] rounded-lg" />
              </>
            ) : !articlesQuery.isError && (articlesQuery.data?.data.length ?? 0) === 0 ? (
              <Text className="text-sm text-muted">Chưa có quy định đã được duyệt cho quốc gia này. Trong lúc chờ, bạn vẫn dùng được SOS, dịch nhanh và hướng dẫn xử lý sự cố.</Text>
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
          {(country?.emergencyNumbers.extra ?? []).map((item) => (
            <Pressable
              key={item.number}
              accessibilityRole="button"
              accessibilityLabel={`Gọi ${item.label}`}
              onPress={() => void openPhone(item.number)}
              className="mt-2.5 min-h-[48px] flex-row items-center justify-between rounded-lg border border-line bg-surface px-4"
            >
              <View className="flex-1 flex-row items-center" style={{ gap: 10 }}>
                <Phone size={16} color={colors.primary} />
                <Text className="flex-1 text-[13px] font-body-bold text-ink" numberOfLines={1}>{item.label}</Text>
              </View>
              <Text className="font-mono-bold text-[15px]" style={{ color: colors.primaryStrong }}>{item.number}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </AppShell>
  );
}

const ALERT_CATEGORY_LABEL: Record<Alert['category'], string> = {
  safety: 'An toàn',
  legal: 'Thay đổi pháp lý',
  trip: 'Chuyến đi',
};

function HomeAlertCard({ alert, onPress }: { alert: Alert; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="rounded-2xl border border-danger-line bg-danger-tint p-4"
    >
      <Text className="text-[11px] font-body-bold text-danger" numberOfLines={2}>
        ● {ALERT_CATEGORY_LABEL[alert.category]} · {alert.meta}
      </Text>
      <Text className="mt-1.5 text-[15px] font-body-bold text-ink">{alert.title}</Text>
      <Text className="mt-1 text-xs leading-relaxed text-muted" numberOfLines={2}>
        {alert.body}
      </Text>
    </Pressable>
  );
}

function CurrentTripCard({
  countryCode,
  countryName,
  destinationCity,
  startDate,
  endDate,
  police,
  ambulance,
  changeCountryHref,
  keyNote,
  onKeyNotePress,
}: {
  countryCode: string;
  countryName?: string;
  destinationCity: string;
  startDate: string;
  endDate: string;
  police?: string;
  ambulance?: string;
  changeCountryHref: string;
  keyNote?: string;
  onKeyNotePress?: () => void;
}) {
  const today = now();
  const start = parseISODate(startDate);
  const end = parseISODate(endDate);
  const upcoming = today < start;
  const past = today > end;
  const remaining = Math.max(daysBetween(today, end), 0);
  const daysUntilStart = Math.max(daysBetween(today, start), 0);
  // Tiêu đề phải khớp trạng thái thật: "Bạn đang ở" chỉ đúng khi chuyến đang diễn ra.
  const heading = upcoming ? 'Điểm đến sắp tới' : past ? 'Chuyến đi gần nhất' : 'Bạn đang ở';
  const statusLabel = upcoming ? 'Sắp tới' : past ? 'Đã kết thúc' : 'Đang diễn ra';
  const statusColor = upcoming ? '#FBBF24' : past ? '#CBD5E1' : '#4ADE80';
  const timingLabel = upcoming ? `Khởi hành sau ${daysUntilStart} ngày` : past ? '' : `Còn ${remaining} ngày`;

  return (
    <View className="overflow-hidden rounded-3xl bg-ink p-5">
      {/* Vòng tròn mờ thay cho ảnh điểm đến (chưa có ảnh), vẫn giữ chữ trắng đủ tương phản */}
      <View className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/25" />
      <View className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-white/5" />

      <View className="flex-row items-start" style={{ gap: 12 }}>
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
          <Text className="font-mono-bold text-lg text-white">{countryCode}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Text className="text-[11px] font-body-bold text-primary-soft">Quốc gia hiện tại</Text>
            <Text className="text-[11px] font-body-bold" style={{ color: statusColor }}>● {statusLabel}</Text>
          </View>
          <Text className="mt-1 text-[13px] text-white/80">{heading}</Text>
          <Text className="font-display text-white" style={{ fontSize: 24, lineHeight: 30 }} numberOfLines={2}>
            {countryName || destinationCity || countryCode}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(changeCountryHref as never)}
          className="min-h-[36px] justify-center rounded-full bg-white/20 px-3"
        >
          <Text className="text-xs font-body-bold text-white">Đổi nước</Text>
        </Pressable>
      </View>

      <View className="mt-3 flex-row flex-wrap items-center" style={{ gap: 6 }}>
        <Calendar size={14} color="#fff" />
        <Text className="font-mono text-[12px] text-white">{formatTripRange(startDate, endDate)}</Text>
        {!!destinationCity && <Text className="text-[12px] text-white/70">· {destinationCity}</Text>}
        {!!timingLabel && <Text className="text-[12px] text-white/70">· {timingLabel}</Text>}
      </View>
      <Text className="mt-2 text-[13px] text-white/90">
        Cảnh sát: <Text className="font-mono-bold">{police || '--'}</Text> · Cấp cứu: <Text className="font-mono-bold">{ambulance || '--'}</Text>
      </Text>

      {!!keyNote && (
        <Pressable
          accessibilityRole="button"
          onPress={onKeyNotePress}
          className="mt-4 flex-row items-center rounded-2xl bg-white/15 px-3.5 py-3"
          style={{ gap: 10 }}
        >
          <TriangleAlert size={18} color="#FBBF24" />
          <View className="flex-1">
            <Text className="text-[13px] font-body-bold text-white" numberOfLines={1}>{keyNote}</Text>
            <Text className="mt-0.5 text-[11px] text-white/70" numberOfLines={1}>Lưu ý pháp lý quan trọng · nhấn để xem chi tiết</Text>
          </View>
          <ChevronRight size={18} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

function QuickTile({
  label,
  icon,
  onPress,
  danger,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`min-h-[104px] flex-1 items-center justify-center rounded-2xl border px-1 py-3 ${
        danger ? 'border-danger-line bg-danger-tint' : 'border-line bg-surface'
      }`}
      style={{ gap: 8 }}
    >
      <View className={`h-12 w-12 items-center justify-center rounded-2xl ${danger ? 'bg-danger' : 'bg-primary-soft'}`}>
        {icon}
      </View>
      <Text
        className={`text-center text-[12px] font-body-bold ${danger ? 'text-danger' : 'text-ink'}`}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ShortcutCard({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-[76px] flex-1 flex-row items-center rounded-2xl border border-line bg-surface p-3.5"
      style={{ gap: 8 }}
    >
      <View className="flex-1">
        <Text className="text-[13px] font-body-bold text-ink" numberOfLines={2}>{title}</Text>
        <Text className="mt-0.5 text-[11px] text-muted" numberOfLines={1}>{subtitle}</Text>
      </View>
      {icon}
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
