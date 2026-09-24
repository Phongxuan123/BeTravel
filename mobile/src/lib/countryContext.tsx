import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCountries } from '@/lib/data';
import type { Country } from '@/mocks/schemas';

type CountryContextValue = {
  countryCode: string;
  country: Country | undefined;
  setCountryCode: (code: string) => void;
};

const CountryContext = createContext<CountryContextValue | null>(null);

/*
 * Quốc gia hiện tại của người dùng (theo chuyến đi đang diễn ra). Mặc định
 * chọn quốc gia đang hoạt động từ dữ liệu. Đi qua fetchCountries() của lib/data.ts (KHÔNG import
 * thẳng mocks/fixtures) để tôn trọng công tắc EXPO_PUBLIC_USE_MOCKS -- trước
 * B3, file này bỏ qua công tắc đó nên khi bật API thật, context vẫn hiện dữ
 * liệu quốc gia giả lập trong toàn bộ app (bug thực sự, không phải khác biệt
 * cosmetics -- đây là lý do sửa file này dù nó không phải "màn hình").
 */
export function CountryProvider({ children }: { children: ReactNode }) {
  const [countryCode, setCountryCode] = useState('');
  const countriesQuery = useQuery({ queryKey: ['countries'], queryFn: fetchCountries });

  const available = countriesQuery.data?.data ?? [];
  const selectedCode = available.find((item) => item.code === countryCode)?.code
    ?? available.find((item) => item.status !== 'coming_soon')?.code ?? available[0]?.code ?? '';

  const value = useMemo(
    () => ({
      countryCode: selectedCode,
      country: countriesQuery.data?.data.find((c) => c.code === selectedCode),
      setCountryCode,
    }),
    [selectedCode, countriesQuery.data],
  );

  return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>;
}

export function useCountry(): CountryContextValue {
  const ctx = useContext(CountryContext);
  if (!ctx) throw new Error('useCountry phải dùng trong CountryProvider');
  return ctx;
}
