import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { getCountryByCode } from '@/mocks/fixtures/countries';
import type { Country } from '@/mocks/schemas';

type CountryContextValue = {
  countryCode: string;
  country: Country | undefined;
  setCountryCode: (code: string) => void;
};

const CountryContext = createContext<CountryContextValue | null>(null);

// Quốc gia hiện tại của người dùng (theo chuyến đi đang diễn ra). Mặc định Nhật Bản
// để khớp mock — không hard-code ở nơi khác, luôn đọc qua context này.
export function CountryProvider({ children }: { children: ReactNode }) {
  const [countryCode, setCountryCode] = useState('JP');
  const value = useMemo(
    () => ({ countryCode, country: getCountryByCode(countryCode), setCountryCode }),
    [countryCode],
  );
  return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>;
}

export function useCountry(): CountryContextValue {
  const ctx = useContext(CountryContext);
  if (!ctx) throw new Error('useCountry phải dùng trong CountryProvider');
  return ctx;
}
