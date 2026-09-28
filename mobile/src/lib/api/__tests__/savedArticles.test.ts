import { fetchArticles } from '../content';
import { apiRequest, ApiError } from '../http';
import articleFixture from '../../../../../contracts/fixtures/public.legalArticle.json';

jest.mock('../http', () => ({ ...jest.requireActual('../http'), apiRequest: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

test('đã lưu lấy bản công khai hiện hành, gộp bookmark cũ và lọc quốc gia/chủ đề', async () => {
  const article = articleFixture.data;
  (apiRequest as jest.Mock).mockResolvedValueOnce([
    { _id: 'f1', targetType: 'article', targetId: 'old', article },
    { _id: 'f2', targetType: 'article', targetId: article._id, article },
    { _id: 'f3', targetType: 'article', targetId: 'other', article: { ...article, countryCode: 'XX' } },
  ]).mockResolvedValueOnce(article);
  const result = await fetchArticles(article.countryCode, { savedOnly: true, topicKey: article.topicSlug });
  expect(result.data).toHaveLength(1);
  expect(result.data[0].id).toBe(article._id);
  expect(apiRequest).toHaveBeenCalledTimes(2);
  expect(apiRequest).toHaveBeenLastCalledWith(`/legal/articles/${article.countryCode}/${article.slug}`);
});

test('bài đã gỡ được bỏ qua; lỗi mạng vẫn báo lỗi thay vì danh sách rỗng', async () => {
  const article = articleFixture.data;
  const favorite = { _id: 'f1', targetType: 'article', targetId: article._id, article };
  (apiRequest as jest.Mock).mockResolvedValueOnce([favorite]).mockRejectedValueOnce(new ApiError('NOT_FOUND', 'removed', 404));
  expect((await fetchArticles(article.countryCode, { savedOnly: true })).data).toEqual([]);
  const offline = new ApiError('UPSTREAM_ERROR', 'offline', 0);
  (apiRequest as jest.Mock).mockResolvedValueOnce([favorite]).mockRejectedValueOnce(offline);
  await expect(fetchArticles(article.countryCode, { savedOnly: true })).rejects.toBe(offline);
});
