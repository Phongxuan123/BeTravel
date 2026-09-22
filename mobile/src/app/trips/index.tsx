import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react-native';
import { AppShell, APP_SHELL_CONTENT_BOTTOM_PADDING } from '@/components/common/AppShell';
import { PageHeaderBare } from '@/components/common/PageHeader';
import { IconButton } from '@/components/ui/IconButton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { EmptyState } from '@/components/common/EmptyState';
import { CountryFlag } from '@/components/brand/CountryFlag';
import { fetchTrips, setCurrentTrip } from '@/lib/data';
import { getCountryByCode } from '@/mocks/fixtures/countries';
import { formatTripRange, tripDurationDays } from '@/lib/format';
import { now, daysBetween, parseISODate } from '@/lib/date';
import type { Trip } from '@/mocks/schemas';

type FilterTab = 'all' | 'upcoming' | 'past';

function tripStatus(trip: Trip): 'ongoing' | 'upcoming' | 'past' {
  const today = now();
  const start = parseISODate(trip.startDate);
  const end = parseISODate(trip.endDate);
  if (today >= start && today <= end) return 'ongoing';
  if (today < start) return 'upcoming';
  return 'past';
}

export default function TripsScreen() {
  const [tab, setTab] = useState<FilterTab>('all');
  const tripsQuery = useQuery({ queryKey: ['trips'], queryFn: fetchTrips });
  const queryClient = useQueryClient();
  const trips = tripsQuery.data?.data ?? [];

  const visible = trips.filter((t) => {
    const status = tripStatus(t);
    if (tab === 'upcoming') return status === 'upcoming';
    if (tab === 'past') return status === 'past';
    return true;
  });

  const ongoing = visible.filter((t) => tripStatus(t) === 'ongoing');
  const upcoming = visible.filter((t) => tripStatus(t) === 'upcoming');
  const past = visible.filter((t) => tripStatus(t) === 'past');

  const onSetCurrent = async (id: string) => {
    await setCurrentTrip(id);
    queryClient.invalidateQueries({ queryKey: ['trips'] });
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
          value={tab}
          onChange={setTab}
          options={[
            { value: 'all', label: 'Đang diễn ra' },
            { value: 'upcoming', label: 'Sắp tới' },
            { value: 'past', label: 'Đã qua' },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: APP_SHELL_CONTENT_BOTTOM_PADDING, gap: 12 }}>
        {trips.length === 0 && !tripsQuery.isLoading && (
          <EmptyState title="Chưa có chuyến đi" description="Tạo chuyến đi đầu tiên để mở khoá cẩm nang pháp luật.">
            <Button label="Tạo chuyến đi" onPress={() => router.push('/trips/new?step=1')} />
          </EmptyState>
        )}

        {ongoing.map((trip) => (
          <OngoingTripCard key={trip.id} trip={trip} />
        ))}

        {upcoming.length > 0 && (
          <View>
            <Text className="mb-2 text-[11px] font-body-bold uppercase tracking-wider text-muted">SẮP TỚI</Text>
            <View style={{ gap: 10 }}>
              {upcoming.map((trip) => (
                <SimpleTripCard key={trip.id} trip={trip} onSetCurrent={onSetCurrent} />
              ))}
            </View>
          </View>
        )}

        {past.length > 0 && (
          <View>
            <Text className="mb-2 text-[11px] font-body-bold uppercase tracking-wider text-muted">ĐÃ QUA</Text>
            <View style={{ gap: 10 }}>
              {past.map((trip) => (
                <SimpleTripCard key={trip.id} trip={trip} muted onSetCurrent={onSetCurrent} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </AppShell>
  );
}

function OngoingTripCard({ trip }: { trip: Trip }) {
  const country = getCountryByCode(trip.countryCode);
  if (!country) return null;
  const today = now();
  const total = Math.max(1, daysBetween(parseISODate(trip.startDate), parseISODate(trip.endDate)));
  const elapsed = Math.min(Math.max(daysBetween(parseISODate(trip.startDate), today), 0), total);

  return (
    <View className="rounded-lg border-[1.5px] border-primary bg-surface p-[18px]">
      <View className="flex-row items-center">
        <CountryFlag code={country.code} width={52} height={40} />
        <View className="ml-3 flex-1">
          <Text className="text-[22px] font-body-bold text-ink">{country.name}</Text>
          <Text className="text-[15px] text-muted">
            {formatTripRange(trip.startDate, trip.endDate)} · {tripDurationDays(trip.startDate, trip.endDate)} ngày
          </Text>
        </View>
        <Badge label="Đang đi" tone="success" dot />
      </View>
      <View className="mt-3 h-2 rounded-full bg-primary-soft">
        <View className="h-2 rounded-full bg-primary" style={{ width: `${Math.round((elapsed / total) * 100)}%` }} />
      </View>
      <View className="mt-4 flex-row" style={{ gap: 10 }}>
        <Pressable
          className="h-[50px] flex-1 items-center justify-center rounded-md bg-primary-soft"
          onPress={() => router.push(`/explore?country=${country.code}` as never)}
        >
          <Text className="font-body-bold text-primary-strong">Cẩm nang</Text>
        </Pressable>
        <Pressable className="h-[50px] flex-1 items-center justify-center rounded-md bg-danger-soft" onPress={() => router.push('/sos')}>
          <Text className="font-body-bold text-danger">Số khẩn cấp</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SimpleTripCard({ trip, muted, onSetCurrent }: { trip: Trip; muted?: boolean; onSetCurrent: (id: string) => void }) {
  const country = getCountryByCode(trip.countryCode);
  if (!country) return null;
  const today = now();
  const daysUntil = daysBetween(today, parseISODate(trip.startDate));

  return (
    <Pressable
      onPress={() => onSetCurrent(trip.id)}
      className={`h-[86px] flex-row items-center rounded-lg border border-line px-4 ${muted ? 'bg-[#FAFCFF] opacity-60' : 'bg-surface'}`}
    >
      <CountryFlag code={country.code} width={44} height={32} />
      <View className="ml-3 flex-1">
        <Text className="text-base font-body-bold text-ink">{country.name}</Text>
        <Text className="text-sm text-muted">
          {formatTripRange(trip.startDate, trip.endDate)} · {tripDurationDays(trip.startDate, trip.endDate)} ngày
        </Text>
      </View>
      {muted ? <Badge label="Đã kết thúc" tone="neutral" /> : <Badge label={`Còn ${daysUntil} ngày`} tone="warning" />}
    </Pressable>
  );
}
