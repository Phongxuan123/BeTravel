import { searchArticles } from '../content';
import { apiRequest } from '../http';

jest.mock('../http', () => ({ ...jest.requireActual('../http'), apiRequest: jest.fn(async () => []) }));

beforeEach(() => jest.clearAllMocks());

// Backend tu choi q > 200 ky tu (contracts/README.md muc tim kiem) -- nguoi dung
// dan mot doan van dai van phai nhan ket qua thay vi loi 400.
test('cắt từ khóa về tối đa 200 ký tự trước khi gọi API', async () => {
  await searchArticles(`  ${'a'.repeat(300)}  `, 'KR');
  const url = new URL(`http://x${(apiRequest as jest.Mock).mock.calls[0][0]}`);
  expect(url.searchParams.get('q')).toHaveLength(200);
});

test('từ khóa rỗng không gọi API', async () => {
  await expect(searchArticles('   ', 'KR')).resolves.toEqual({ ok: true, data: [] });
  expect(apiRequest).not.toHaveBeenCalled();
});
