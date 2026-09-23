import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';

import { router } from 'expo-router';

import {
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { Plus } from 'lucide-react-native';

import {
  AppShell,
  APP_SHELL_CONTENT_BOTTOM_PADDING,
} from '@/components/common/AppShell';

import { PageHeaderBare } from '@/components/common/PageHeader';
import { IconButton } from '@/components/ui/IconButton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { EmptyState } from '@/components/common/EmptyState';
import { CountryFlag } from '@/components/brand/CountryFlag';

import {
  fetchTrips,
  setCurrentTrip,
  fetchCountries,
} from '@/lib/data';

import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api/http';

import {
  formatTripRange,
  tripDurationDays,
} from '@/lib/format';

import {
  now,
  daysBetween,
  parseISODate,
} from '@/lib/date';

import type { Trip } from '@/mocks/schemas';

type FilterTab =
  | 'ongoing'
  | 'upcoming'
  | 'past';

function tripStatus(
  trip: Trip,
): 'ongoing' | 'upcoming' | 'past' {
  const today = now();
  const start = parseISODate(trip.startDate);
  const end = parseISODate(trip.endDate);

  if (today >= start && today <= end) {
    return 'ongoing';
  }

  if (today < start) {
    return 'upcoming';
  }

  return 'past';
}

export default function TripsScreen() {
  const [tab, setTab] =
    useState<FilterTab>('ongoing');

  const {
    isGuest,
    isLoading: authLoading,
  } = useAuth();

  const tripsQuery = useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
    enabled: !isGuest && !authLoading,
  });

  const queryClient = useQueryClient();

  const trips =
    tripsQuery.data?.data ?? [];

  const visible = trips.filter((trip) => {
    const status = tripStatus(trip);

    if (tab === 'ongoing') {
      return status === 'ongoing';
    }

    if (tab === 'upcoming') {
      return status === 'upcoming';
    }

    return status === 'past';
  });

  const ongoing = visible.filter(
    (trip) =>
      tripStatus(trip) === 'ongoing',
  );

  const upcoming = visible.filter(
    (trip) =>
      tripStatus(trip) === 'upcoming',
  );

  const past = visible.filter(
    (trip) =>
      tripStatus(trip) === 'past',
  );

  const onSetCurrent = async (
    id: string,
  ) => {
    try {
      await setCurrentTrip(id);

      await queryClient.invalidateQueries({
        queryKey: ['trips'],
      });
    } catch (err) {
      Alert.alert(
        'Không thể đặt chuyến đi chính',
        err instanceof ApiError
          ? err.message
          : 'Kiểm tra kết nối mạng và thử lại.',
      );
    }
  };

  return (
    <AppShell active="home">
      <PageHeaderBare
        left={
          <Text className="text-[24px] font-display text-ink">
            Chuyến đi của tôi
          </Text>
        }
        right={
          <IconButton
            accessibilityLabel="Tạo chuyến đi mới"
            variant="primary"
            icon={
              <Plus
                size={20}
                color="#fff"
              />
            }
            onPress={() =>
              router.push(
                '/trips/new?step=1',
              )
            }
          />
        }
      />

      <View className="px-[18px] pb-3">
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          options={[
            {
              value: 'ongoing',
              label: 'Đang diễn ra',
            },
            {
              value: 'upcoming',
              label: 'Sắp tới',
            },
            {
              value: 'past',
              label: 'Đã qua',
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingBottom:
            APP_SHELL_CONTENT_BOTTOM_PADDING,
          gap: 12,
        }}
      >
        {tripsQuery.isError && (
          <View className="rounded-md bg-danger-tint p-3">
            <Text className="text-center text-sm text-danger">
              Không tải được danh sách
              chuyến đi. Kiểm tra kết nối
              mạng.
            </Text>
          </View>
        )}

        {isGuest &&
          !authLoading && (
            <EmptyState
              title="Đăng nhập để xem chuyến đi"
              description="Chuyến đi được lưu theo tài khoản của bạn."
            >
              <Button
                label="Đăng nhập"
                onPress={() =>
                  router.push('/login')
                }
              />
            </EmptyState>
          )}

        {!isGuest &&
          trips.length === 0 &&
          !tripsQuery.isLoading &&
          !tripsQuery.isError && (
            <EmptyState
              title="Chưa có chuyến đi"
              description="Tạo chuyến đi đầu tiên để mở khoá cẩm nang pháp luật."
            >
              <Button
                label="Tạo chuyến đi"
                onPress={() =>
                  router.push(
                    '/trips/new?step=1',
                  )
                }
              />
            </EmptyState>
          )}

        {ongoing.map((trip) => (
          <OngoingTripCard
            key={trip.id}
            trip={trip}
          />
        ))}

        {upcoming.length > 0 && (
          <View>
            <Text className="mb-2 text-[11px] font-body-bold uppercase tracking-wider text-muted">
              SẮP TỚI
            </Text>

            <View
              style={{
                gap: 10,
              }}
            >
              {upcoming.map((trip) => (
                <SimpleTripCard
                  key={trip.id}
                  trip={trip}
                  onSetCurrent={
                    onSetCurrent
                  }
                />
              ))}
            </View>
          </View>
        )}

        {past.length > 0 && (
          <View>
            <Text className="mb-2 text-[11px] font-body-bold uppercase tracking-wider text-muted">
              ĐÃ QUA
            </Text>

            <View
              style={{
                gap: 10,
              }}
            >
              {past.map((trip) => (
                <SimpleTripCard
                  key={trip.id}
                  trip={trip}
                  muted
                />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </AppShell>
  );
}

function OngoingTripCard({
  trip,
}: {
  trip: Trip;
}) {
  const countriesQuery = useQuery({
    queryKey: ['countries'],
    queryFn: fetchCountries,
  });

  const country =
    countriesQuery.data?.data.find(
      (item) =>
        item.code === trip.countryCode,
    );

  if (!country) {
    return null;
  }

  const today = now();

  const total = Math.max(
    1,
    daysBetween(
      parseISODate(trip.startDate),
      parseISODate(trip.endDate),
    ),
  );

  const elapsed = Math.min(
    Math.max(
      daysBetween(
        parseISODate(trip.startDate),
        today,
      ),
      0,
    ),
    total,
  );

  const progress = Math.round(
    (elapsed / total) * 100,
  );

  return (
    <View className="rounded-lg border-[1.5px] border-primary bg-surface p-[18px]">
      <View className="flex-row items-center">
        <CountryFlag
          code={country.code}
          width={52}
          height={40}
        />

        <View className="ml-3 flex-1">
          <Text className="text-[22px] font-body-bold text-ink">
            {country.name}
          </Text>

          <Text className="text-[15px] text-muted">
            {formatTripRange(
              trip.startDate,
              trip.endDate,
            )}{' '}
            ·{' '}
            {tripDurationDays(
              trip.startDate,
              trip.endDate,
            )}{' '}
            ngày
          </Text>
        </View>

        <Badge
          label="Đang đi"
          tone="success"
          dot
        />
      </View>

      <View className="mt-3 h-2 rounded-full bg-primary-soft">
        <View
          className="h-2 rounded-full bg-primary"
          style={{
            width: `${progress}%`,
          }}
        />
      </View>

      <View
        className="mt-4 flex-row"
        style={{
          gap: 10,
        }}
      >
        <Pressable
          className="h-[50px] flex-1 items-center justify-center rounded-md bg-primary-soft"
          onPress={() =>
            router.push(
              `/explore?country=${country.code}` as never,
            )
          }
        >
          <Text className="font-body-bold text-primary-strong">
            Cẩm nang
          </Text>
        </Pressable>

        <Pressable
          className="h-[50px] flex-1 items-center justify-center rounded-md bg-danger-soft"
          onPress={() =>
            router.push('/sos')
          }
        >
          <Text className="font-body-bold text-danger">
            Số khẩn cấp
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function SimpleTripCard({
  trip,
  muted = false,
  onSetCurrent,
}: {
  trip: Trip;
  muted?: boolean;
  onSetCurrent?: (
    id: string,
  ) => void;
}) {
  const countriesQuery = useQuery({
    queryKey: ['countries'],
    queryFn: fetchCountries,
  });

  const country =
    countriesQuery.data?.data.find(
      (item) =>
        item.code === trip.countryCode,
    );

  if (!country) {
    return null;
  }

  const today = now();

  const daysUntil = Math.max(
    0,
    daysBetween(
      today,
      parseISODate(trip.startDate),
    ),
  );

  const canSetCurrent =
    !muted && !!onSetCurrent;

  return (
    <Pressable
      onPress={
        canSetCurrent
          ? () =>
              onSetCurrent?.(trip.id)
          : undefined
      }
      disabled={!canSetCurrent}
      className={`h-[86px] flex-row items-center rounded-lg border border-line px-4 ${
        muted
          ? 'bg-[#FAFCFF]'
          : 'bg-surface'
      }`}
      style={
        muted
          ? {
              opacity: 0.6,
            }
          : undefined
      }
    >
      <CountryFlag
        code={country.code}
        width={44}
        height={32}
      />

      <View className="ml-3 flex-1">
        <Text className="text-base font-body-bold text-ink">
          {country.name}
        </Text>

        <Text className="text-sm text-muted">
          {formatTripRange(
            trip.startDate,
            trip.endDate,
          )}{' '}
          ·{' '}
          {tripDurationDays(
            trip.startDate,
            trip.endDate,
          )}{' '}
          ngày
        </Text>
      </View>

      {trip.isCurrent ? (
        <Badge
          label="Chuyến đi chính"
          tone="success"
          dot
        />
      ) : muted ? (
        <Badge
          label="Đã kết thúc"
          tone="neutral"
        />
      ) : (
        <Badge
          label={`Còn ${daysUntil} ngày`}
          tone="warning"
        />
      )}
    </Pressable>
  );
}