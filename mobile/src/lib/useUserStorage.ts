import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth';
import { getJSON, setJSON } from './storage';

// Tách dữ liệu trên thiết bị theo tài khoản; dùng chung query để các màn
// Explore/chi tiết/Profile thấy thay đổi ngay, không giữ state riêng bị cũ.
export function useUserStorage<T>(baseKey: string, initialValue: T) {
  const { user } = useAuth();
  const owner = user?.email.trim().toLowerCase() ?? 'guest';
  const mode = process.env.EXPO_PUBLIC_USE_MOCKS === 'true' ? 'mock' : 'real';
  const key = `${baseKey}:${mode}:${encodeURIComponent(owner)}`;
  const queryKey = ['local-user', key];
  const client = useQueryClient();
  const query = useQuery({
    queryKey,
    queryFn: async () => (await getJSON<T>(key)) ?? initialValue,
    staleTime: Infinity,
  });
  const update = async (updater: (current: T) => T) => {
    await client.cancelQueries({ queryKey });
    const next = updater(client.getQueryData<T>(queryKey) ?? initialValue);
    client.setQueryData(queryKey, next);
    await setJSON(key, next);
  };
  return { value: query.data ?? initialValue, loaded: !query.isPending, update };
}
