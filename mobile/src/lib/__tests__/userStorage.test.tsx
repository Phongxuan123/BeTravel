import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useUserStorage } from '../useUserStorage';
import { useAuth } from '../auth';

jest.mock('../auth', () => ({ useAuth: jest.fn() }));
jest.mock('../storage', () => ({ getJSON: jest.fn(async () => null), setJSON: jest.fn(async () => {}) }));
const auth = useAuth as jest.Mock;

test('đổi tài khoản không thấy dữ liệu người trước và hai màn hình dùng chung trạng thái', async () => {
  auth.mockReturnValue({ user: { email: 'a@example.test' } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const one = await renderHook(() => useUserStorage<string[]>('saved', []), { wrapper });
  const two = await renderHook(() => useUserStorage<string[]>('saved', []), { wrapper });
  await waitFor(() => expect(one.result.current.loaded).toBe(true));
  await act(async () => { await one.result.current.update(() => ['KR:article']); });
  await waitFor(() => expect(two.result.current.value).toEqual(['KR:article']));
  auth.mockReturnValue({ user: { email: 'b@example.test' } });
  await one.rerender({});
  await waitFor(() => expect(one.result.current.loaded).toBe(true));
  expect(one.result.current.value).toEqual([]);
  await one.unmount();
  await two.unmount();
  client.clear();
});
