import { fetchAuLaws, fetchAuLaw } from '../auLaws';
import { apiRequest, apiRequestWithMeta } from '../http';

jest.mock('../http', () => ({
  ...jest.requireActual('../http'),
  apiRequest: jest.fn(async () => []),
  apiRequestWithMeta: jest.fn(async () => ({ data: [], meta: { page: 1, limit: 20, total: 0 } })),
}));

beforeEach(() => jest.clearAllMocks());

// Có từ khóa thì phải gọi /search; không có thì gọi danh sách, và luôn mã hóa giá trị.
test('chọn đúng endpoint và mã hóa từ khóa', async () => {
  await fetchAuLaws({ q: ' Migration & Act ', collection: 'Act', inForce: true, page: 2 });
  const [path] = (apiRequestWithMeta as jest.Mock).mock.calls[0];
  expect(path).toBe('/laws/australia/search?q=Migration%20%26%20Act&collection=Act&inForce=true&page=2&limit=20');

  await fetchAuLaws({ q: '  ', inForce: false, page: 1 });
  expect((apiRequestWithMeta as jest.Mock).mock.calls[1][0]).toBe('/laws/australia?inForce=false&page=1&limit=20');
});

// Trang bị loại hết (còn trang sau) phải tự đọc tiếp, không trả trang trống giữa chừng.
test('bỏ qua trang rỗng khi vẫn còn trang sau', async () => {
  const empty = { data: [], meta: { page: 1, limit: 20, total: 60 } };
  const filled = { data: [{ id: 'C1' }], meta: { page: 2, limit: 20, total: 60 } };
  (apiRequestWithMeta as jest.Mock).mockResolvedValueOnce(empty).mockResolvedValueOnce(filled);

  const result = await fetchAuLaws({ inForce: true, page: 1 });
  expect(result.page).toBe(2);
  expect(result.items).toHaveLength(1);
  expect(result.hasMore).toBe(true);
});

test('mã văn bản được mã hóa và gọi không kèm token', async () => {
  await fetchAuLaw('C1958A00062');
  expect(apiRequest).toHaveBeenCalledWith('/laws/australia/C1958A00062', { skipAuth: true });
});
