import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCountries, fetchTrips } from '@/lib/data';
import { useAuth } from '@/lib/auth';
import { useUserStorage } from '@/lib/useUserStorage';
import { activeStop, pickCurrentTrip } from '@/features/trips/itinerary';
import type { Country } from '@/mocks/schemas';

type CountryContextValue = {
  /** Quốc gia đang áp dụng cho cả app (Home, SOS, chat, cảnh báo...); rỗng khi đang xác định. */
  countryCode: string;
  country: Country | undefined;
  /** Quốc gia mặc định người dùng chọn ở Cài đặt; chỉ dùng khi không có chuyến đi. */
  preferredCountryCode: string;
  setPreferredCountryCode: (code: string) => void;
  /** Đang tải chuyến đi/quốc gia: màn hình hiện trạng thái chờ thay vì nước tạm (tránh nháy). */
  isResolving: boolean;
  /** Quốc gia có được suy ra từ chuyến đi hay không (Cài đặt dùng để giải thích). */
  followsTrip: boolean;
};

const CountryContext = createContext<CountryContextValue | null>(null);

/*
 * Quốc gia hiện tại của người dùng, một nguồn duy nhất cho toàn app (BUG-17, quyết định Q3):
 * chặng hiện tại của chuyến đi chính > quốc gia mặc định trong Cài đặt > nước đầu tiên đang hoạt
 * động. Bộ lọc của Khám phá/Tìm kiếm là state cục bộ của màn, KHÔNG ghi vào đây. Đi qua
 * fetchCountries() của lib/data.ts (không import thẳng mocks) để tôn trọng EXPO_PUBLIC_USE_MOCKS.
 */
export function CountryProvider({ children }: { children: ReactNode }) {
  const { isGuest, isLoading: authLoading } = useAuth();
  const preferred = useUserStorage<string>('preferred-country', '');
  const tripsQuery = useQuery({ queryKey: ['trips'], queryFn: fetchTrips, enabled: !isGuest });
  const countriesQuery = useQuery({ queryKey: ['countries'], queryFn: fetchCountries });

  const available = countriesQuery.data?.data ?? [];
  const currentTrip = pickCurrentTrip(tripsQuery.data?.data ?? []);
  const itineraryCode = currentTrip ? activeStop(currentTrip).countryCode : '';
  const hasCode = (code: string) => available.find((item) => item.code === code)?.code;
  const tripCode = hasCode(itineraryCode);
  const isResolving = authLoading || countriesQuery.isPending || !preferred.loaded || (!isGuest && tripsQuery.isPending);
  const resolvedCode = tripCode
    ?? hasCode(preferred.value)
    ?? available.find((item) => item.status !== 'coming_soon')?.code ?? available[0]?.code ?? '';
  const selectedCode = isResolving ? '' : resolvedCode;
  const { update: updatePreferred } = preferred;

  const value = useMemo(
    () => ({
      countryCode: selectedCode,
      country: countriesQuery.data?.data.find((c) => c.code === selectedCode),
      preferredCountryCode: hasCode(preferred.value) ?? '',
      setPreferredCountryCode: (code: string) => void updatePreferred(() => code),
      isResolving,
      followsTrip: !!tripCode,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedCode, countriesQuery.data, preferred.value, isResolving, tripCode],
  );

  return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>;
}

export function useCountry(): CountryContextValue {
  const ctx = useContext(CountryContext);
  if (!ctx) throw new Error('useCountry phải dùng trong CountryProvider');
  return ctx;
}
