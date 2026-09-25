import { fetchFavorites, addFavorite, removeFavorite } from '../favorites';
import { apiRequest } from '../http';

jest.mock('../http', () => ({ apiRequest: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

test('fetchFavorites gom phang ca 3 loai, bo qua muc thieu du lieu long', async () => {
  (apiRequest as jest.Mock).mockResolvedValueOnce([
    {
      _id: 'f1',
      targetType: 'article',
      targetId: 'art1',
      createdAt: '2026-09-25T00:00:00.000Z',
      article: { countryCode: 'KR', slug: 'vuot-den-do', title: 'Vượt đèn đỏ', topicSlug: 'giao-thong' },
      isOutdated: true,
      currentArticleId: 'art2',
    },
    {
      _id: 'f2',
      targetType: 'location',
      targetId: 'loc1',
      createdAt: '2026-09-25T00:00:00.000Z',
      location: { countryCode: 'KR', type: 'embassy', name: 'Đại sứ quán Việt Nam' },
    },
    // Thieu du lieu long (doi tuong da bi xoa hoan toan) -- phai bi loc bo.
    { _id: 'f3', targetType: 'incident', targetId: 'inc1', createdAt: '2026-09-25T00:00:00.000Z' },
  ]);

  const result = await fetchFavorites();
  expect(result.data).toHaveLength(2);
  expect(result.data[0]).toMatchObject({ targetType: 'article', title: 'Vượt đèn đỏ', isOutdated: true, currentArticleId: 'art2' });
  expect(result.data[1]).toMatchObject({ targetType: 'location', title: 'Đại sứ quán Việt Nam', subtitle: 'Đại sứ quán' });
});

test('addFavorite/removeFavorite goi dung endpoint', async () => {
  await addFavorite('article', 'art1');
  expect(apiRequest).toHaveBeenCalledWith('/users/favorites', { method: 'POST', body: { targetType: 'article', targetId: 'art1' } });

  await removeFavorite('incident', 'inc1');
  expect(apiRequest).toHaveBeenCalledWith('/users/favorites/incident/inc1', { method: 'DELETE' });
});
