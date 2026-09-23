import { useState, type ReactNode } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react-native';
import { AppShell, APP_SHELL_CONTENT_BOTTOM_PADDING } from '@/components/common/AppShell';
import { PageHeaderBare } from '@/components/common/PageHeader';
import { IconButton } from '@/components/ui/IconButton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { EmptyState } from '@/components/common/EmptyState';
import { CountryFlag } from '@/components/brand/CountryFlag';
import { deleteTrip, fetchCountries, fetchTrips, setCurrentTrip } from '@/lib/data';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api/http';
import { formatTripRange, tripDurationDays } from '@/lib/format';
import { now, daysBetween, parseISODate } from '@/lib/date';
import { colors } from '@/lib/theme';
import type { Trip } from '@/mocks/schemas';

type FilterTab = 'ongoing' | 'upcoming' | 'past';

function tripStatus(trip: Trip): FilterTab {
  const today = now();
  const start = parseISODate(trip.startDate);
  const end = parseISODate(trip.endDate);
  if (today >= start && today <= end) return 'ongoing';
  if (today < start) return 'upcoming';
  return 'past';
}

function sortUpcoming(a: Trip, b: Trip) {
  return parseISODate(a.startDate).getTime() - parseISODate(b.startDate).getTime();
}

function sortPast(a: Trip, b: Trip) {
  return parseISODate(b.endDate).getTime() - parseISODate(a.endDate).getTime();
}

export default function TripsScreen() {
  // null = chưa có lựa chọn thủ công. Khi dữ liệu tải xong, màn hình tự chọn:
  // Đang diễn ra -> Sắp tới -> Đã qua. Sau khi người dùng bấm tab thì tôn trọng
  // lựa chọn đó, không tự nhảy tab nữa.
  const [tab, setTab] = useState<FilterTab | null>(null);
  const { isGuest, isLoading: authLoading } = useAuth();
  const tripsQuery = useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
    enabled: !isGuest && !authLoading,
  });
  const queryClient = useQueryClient();
  const trips = tripsQuery.data?.data ?? [];

  const allOngoing = trips.filter((trip) => tripStatus(trip) === 'ongoing');
  const allUpcoming = trips.filter((trip) => tripStatus(trip) === 'upcoming').sort(sortUpcoming);
  const allPast = trips.filter((trip) => tripStatus(trip) === 'past').sort(sortPast);

  const defaultTab: FilterTab = allOngoing.length > 0 ? 'ongoing' : allUpcoming.length > 0 ? 'upcoming' : 'past';
  const activeTab = tab ?? defaultTab;
  const visible = activeTab === 'ongoing' ? allOngoing : activeTab === 'upcoming' ? allUpcoming : allPast;

  const onSetCurrent = async (id: string) => {
    try {
      await setCurrentTrip(id);
      await queryClient.invalidateQueries({ queryKey: ['trips'] });
    } catch (err) {
      Alert.alert(
        'Không thể đặt chuyến đi chính',
        err instanceof ApiError ? err.message : 'Kiểm tra kết nối mạng và thử lại.',
      );
    }
  };

  const onEdit = (id: string) => {
    router.push(`/trips/new?tripId=${encodeURIComponent(id)}&step=1` as never);
  };

  const onDelete = (trip: Trip) => {
    Alert.alert(
      'Xóa chuyến đi?',
      `Chuyến đi đến ${trip.destinationCity} sẽ bị xóa khỏi tài khoản của bạn.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTrip(trip.id);
              setTab(null);
              await queryClient.invalidateQueries({ queryKey: ['trips'] });
            } catch (err) {
              Alert.alert(
                'Không thể xóa chuyến đi',
                err instanceof ApiError ? err.message : 'Kiểm tra kết nối mạng và thử lại.',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <AppShell active="home">
      <PageHeaderBare
        left={<Text className="text-[24px] font-display text-ink">Chuyến đi của tôi</Text>}
        right={
          <IconButton
            accessibilityLabel="Tạo chuyến đi mới"
            variant="primary"
            icon={<Plus size={20} color="#fff" />}
            onPress={() => router.push('/trips/new?step=1')}
          />
        }
      />

      <View className="px-[18px] pb-3">
        <SegmentedTabs
          value={activeTab}
          onChange={setTab}
          options={[
            { value: 'ongoing', label: 'Đang diễn ra' },
            { value: 'upcoming', label: 'Sắp tới' },
            { value: 'past', label: 'Đã qua' },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingBottom: APP_SHELL_CONTENT_BOTTOM_PADDING,
          gap: 12,
        }}
      >
        {tripsQuery.isError && (
          <View className="rounded-md bg-danger-tint p-3">
            <Text className="text-center text-sm text-danger">
              Không tải được danh sách chuyến đi. Kiểm tra kết nối mạng.
            </Text>
          </View>
        )}

        {isGuest && !authLoading && (
          <EmptyState title="Đăng nhập để xem chuyến đi" description="Chuyến đi được lưu theo tài khoản của bạn.">
            <Button label="Đăng nhập" onPress={() => router.push('/login')} />
          </EmptyState>
        )}

        {!isGuest && trips.length === 0 && !tripsQuery.isLoading && !tripsQuery.isError && (
          <EmptyState title="Chưa có chuyến đi" description="Tạo chuyến đi đầu tiên để mở khoá cẩm nang pháp luật.">
            <Button label="Tạo chuyến đi" onPress={() => router.push('/trips/new?step=1')} />
          </EmptyState>
        )}

        {!isGuest && trips.length > 0 && visible.length === 0 && !tripsQuery.isLoading && (
          <EmptyState
            title={activeTab === 'ongoing' ? 'Không có chuyến đi đang diễn ra' : activeTab === 'upcoming' ? 'Không có chuyến đi sắp tới' : 'Chưa có chuyến đi đã qua'}
            description="Bạn có thể chuyển sang tab khác hoặc tạo chuyến đi mới."
          />
        )}

        {activeTab === 'ongoing' &&
          visible.map((trip) => (
            <OngoingTripCard
              key={trip.id}
              trip={trip}
              onEdit={onEdit}
              onDelete={onDelete}
              onSetCurrent={onSetCurrent}
            />
          ))}

        {activeTab !== 'ongoing' && (
          <View style={{ gap: 10 }}>
            {visible.map((trip) => (
              <SimpleTripCard
                key={trip.id}
                trip={trip}
                muted={activeTab === 'past'}
                onEdit={onEdit}
                onDelete={onDelete}
                onSetCurrent={activeTab === 'upcoming' ? onSetCurrent : undefined}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </AppShell>
  );
}

function OngoingTripCard({
  trip,
  onEdit,
  onDelete,
  onSetCurrent,
}: {
  trip: Trip;
  onEdit: (id: string) => void;
  onDelete: (trip: Trip) => void;
  onSetCurrent: (id: string) => void;
}) {
  const countriesQuery = useQuery({ queryKey: ['countries'], queryFn: fetchCountries });
  const country = countriesQuery.data?.data.find((item) => item.code === trip.countryCode);
  if (!country) return null;

  const today = now();
  const total = Math.max(1, daysBetween(parseISODate(trip.startDate), parseISODate(trip.endDate)));
  const elapsed = Math.min(Math.max(daysBetween(parseISODate(trip.startDate), today), 0), total);

  return (
    <View className="rounded-lg border-[1.5px] border-primary bg-surface p-[18px]">
      <View className="flex-row items-start">
        <CountryFlag code={country.code} width={52} height={40} />
        <View className="ml-3 flex-1">
          <Text className="text-[20px] font-body-bold text-ink">{trip.destinationCity}</Text>
          <Text className="text-sm font-body-semibold text-muted">{country.name}</Text>
          {!!trip.destinationDetail && (
            <Text className="mt-0.5 text-sm text-muted" numberOfLines={1}>
              {trip.destinationDetail}
            </Text>
          )}
        </View>
        <Badge label={trip.isCurrent ? 'Chuyến đi chính' : 'Đang đi'} tone="success" dot />
      </View>

      <Text className="mt-3 text-[15px] text-muted">
        {formatTripRange(trip.startDate, trip.endDate)} · {tripDurationDays(trip.startDate, trip.endDate)} ngày
      </Text>

      <View className="mt-3 h-2 rounded-full bg-primary-soft">
        <View
          className="h-2 rounded-full bg-primary"
          style={{ width: `${Math.round((elapsed / total) * 100)}%` }}
        />
      </View>

      <View className="mt-4 flex-row" style={{ gap: 10 }}>
        <Pressable
          className="h-[46px] flex-1 items-center justify-center rounded-md bg-primary-soft"
          onPress={() => router.push(`/explore?country=${country.code}` as never)}
        >
          <Text className="font-body-bold text-primary-strong">Cẩm nang</Text>
        </Pressable>
        <Pressable
          className="h-[46px] flex-1 items-center justify-center rounded-md bg-danger-soft"
          onPress={() => router.push('/sos')}
        >
          <Text className="font-body-bold text-danger">Số khẩn cấp</Text>
        </Pressable>
      </View>

      <View className="mt-3 flex-row items-center justify-end" style={{ gap: 10 }}>
        {!trip.isCurrent && (
          <Pressable onPress={() => onSetCurrent(trip.id)} className="rounded-md bg-success-soft px-3 py-2">
            <Text className="text-sm font-body-bold text-success">Đặt làm chính</Text>
          </Pressable>
        )}
        <ActionButton label="Sửa" icon={<Pencil size={15} color={colors.primary} />} onPress={() => onEdit(trip.id)} />
        <ActionButton label="Xóa" danger icon={<Trash2 size={15} color={colors.danger} />} onPress={() => onDelete(trip)} />
      </View>
    </View>
  );
}

function SimpleTripCard({
  trip,
  muted = false,
  onEdit,
  onDelete,
  onSetCurrent,
}: {
  trip: Trip;
  muted?: boolean;
  onEdit: (id: string) => void;
  onDelete: (trip: Trip) => void;
  onSetCurrent?: (id: string) => void;
}) {
  const countriesQuery = useQuery({ queryKey: ['countries'], queryFn: fetchCountries });
  const country = countriesQuery.data?.data.find((item) => item.code === trip.countryCode);
  if (!country) return null;

  const daysUntil = Math.max(0, daysBetween(now(), parseISODate(trip.startDate)));

  return (
    <View
      className={`rounded-lg border border-line px-4 py-3 ${muted ? 'bg-[#FAFCFF]' : 'bg-surface'}`}
      style={muted ? { opacity: 0.65 } : undefined}
    >
      <View className="flex-row items-start">
        <CountryFlag code={country.code} width={44} height={32} />
        <View className="ml-3 flex-1">
          <Text className="text-base font-body-bold text-ink">{trip.destinationCity}</Text>
          <Text className="text-sm text-muted">{country.name}</Text>
          {!!trip.destinationDetail && (
            <Text className="text-sm text-muted" numberOfLines={1}>
              {trip.destinationDetail}
            </Text>
          )}
          <Text className="mt-1 text-sm text-muted">
            {formatTripRange(trip.startDate, trip.endDate)} · {tripDurationDays(trip.startDate, trip.endDate)} ngày
          </Text>
        </View>
        {trip.isCurrent ? (
          <Badge label="Chuyến đi chính" tone="success" dot />
        ) : muted ? (
          <Badge label="Đã kết thúc" tone="neutral" />
        ) : (
          <Badge label={`Còn ${daysUntil} ngày`} tone="warning" />
        )}
      </View>

      <View className="mt-3 flex-row items-center justify-end" style={{ gap: 10 }}>
        {!!onSetCurrent && !trip.isCurrent && (
          <Pressable onPress={() => onSetCurrent(trip.id)} className="rounded-md bg-success-soft px-3 py-2">
            <Text className="text-sm font-body-bold text-success">Đặt làm chính</Text>
          </Pressable>
        )}
        <ActionButton label="Sửa" icon={<Pencil size={15} color={colors.primary} />} onPress={() => onEdit(trip.id)} />
        <ActionButton label="Xóa" danger icon={<Trash2 size={15} color={colors.danger} />} onPress={() => onDelete(trip)} />
      </View>
    </View>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  danger = false,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={`flex-row items-center rounded-md border px-3 py-2 ${
        danger ? 'border-danger-line bg-danger-soft' : 'border-line bg-surface'
      }`}
      style={{ gap: 6 }}
    >
      {icon}
      <Text className={`text-sm font-body-bold ${danger ? 'text-danger' : 'text-primary'}`}>{label}</Text>
    </Pressable>
  );
}
