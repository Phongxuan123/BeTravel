import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useSavedArticles } from '../useSavedArticles';
import { fetchFavorites, removeFavorite, addFavorite } from '@/lib/api/favorites';

jest.mock('@/lib/auth', () => ({ useAuth: () => ({ isGuest: false }) }));
jest.mock('@/lib/useUserStorage', () => ({ useUserStorage: () => ({ value: [], update: jest.fn() }) }));
jest.mock('@/lib/api/favorites', () => ({ fetchFavorites: jest.fn(), removeFavorite: jest.fn(async () => {}), addFavorite: jest.fn(async () => {}) }));

test('bản mới được đánh dấu đã lưu; bỏ lưu xóa bookmark cũ thay vì thêm trùng', async () => {
  (fetchFavorites as jest.Mock).mockResolvedValue({ data: [{ targetType: 'article', targetId: 'old', currentArticleId: 'current' }] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const hook = await renderHook(useSavedArticles, { wrapper });
  await waitFor(() => expect(hook.result.current.isSaved('current')).toBe(true));
  await act(async () => { await hook.result.current.toggleSaved('current'); });
  expect(removeFavorite).toHaveBeenCalledWith('article', 'old');
  expect(addFavorite).not.toHaveBeenCalled();
  await hook.unmount();
  client.clear();
});
