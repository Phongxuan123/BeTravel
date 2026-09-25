import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useUserStorage } from '@/lib/useUserStorage';
import { StorageKeys } from '@/lib/storage';
import { fetchFavorites, addFavorite, removeFavorite } from '@/lib/api/favorites';

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === 'true';

/*
 * "Đã lưu quy định" -- B8 nối server thật qua /api/users/favorites (targetType
 * 'article'). Khoá là article.id (khớp targetId thật), không còn ghép
 * countryCode:slug như bản cục bộ cũ (khớp đúng nghĩa vụ Favorite phía server
 * cần đúng ObjectId).
 */
function useMockSavedArticles() {
  const { value: savedIds, update } = useUserStorage<string[]>(StorageKeys.savedArticles, []);
  const isSaved = (articleId: string) => savedIds.includes(articleId);
  const toggleSaved = async (articleId: string) => {
    await update((current) => (current.includes(articleId) ? current.filter((id) => id !== articleId) : [...current, articleId]));
  };
  return { isSaved, toggleSaved };
}

function useRealSavedArticles() {
  const { isGuest } = useAuth();
  const queryClient = useQueryClient();
  const favoritesQuery = useQuery({ queryKey: ['favorites'], queryFn: fetchFavorites, enabled: !isGuest });
  const savedIds = new Set(
    (favoritesQuery.data?.data ?? []).filter((f) => f.targetType === 'article').map((f) => f.targetId),
  );

  const mutation = useMutation({
    mutationFn: async (articleId: string) => {
      if (savedIds.has(articleId)) await removeFavorite('article', articleId);
      else await addFavorite('article', articleId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const isSaved = (articleId: string) => savedIds.has(articleId);
  const toggleSaved = async (articleId: string) => {
    if (isGuest) return;
    await mutation.mutateAsync(articleId);
  };
  return { isSaved, toggleSaved };
}

export function useSavedArticles() {
  // Goi CA HAI hook khong dieu kien (cung mau voi auth.tsx#useMockAuthValue/
  // useRealAuthValue) -- tranh vi pham Rules of Hooks khi USE_MOCKS thay doi.
  const mockValue = useMockSavedArticles();
  const realValue = useRealSavedArticles();
  return USE_MOCKS ? mockValue : realValue;
}
