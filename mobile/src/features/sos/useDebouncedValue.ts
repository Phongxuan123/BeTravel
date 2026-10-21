import { useEffect, useState } from 'react';

// Trả về giá trị sau khi ngừng thay đổi `delayMs`: ô tìm địa điểm chỉ gọi API khi người dùng dừng gõ.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
