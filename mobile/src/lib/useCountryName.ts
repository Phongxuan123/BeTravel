import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCountries } from '@/lib/data';

/**
 * Đổi mã quốc gia (KR) sang tên hiển thị (Hàn Quốc) từ danh sách quốc gia đã cache.
 * Chưa tải được danh sách thì trả lại mã, để màn hình vẫn có chữ thay vì trống.
 */
export function useCountryName(): (code: string) => string {
  const countriesQuery = useQuery({ queryKey: ['countries'], queryFn: fetchCountries });
  const countries = countriesQuery.data?.data;
  return useCallback((code: string) => countries?.find((c) => c.code === code)?.name ?? code, [countries]);
}
