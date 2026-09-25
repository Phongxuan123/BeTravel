/**
 * Nối translate/index.tsx vào API thật (B7). translateText() và
 * fetchQuickPhrases() cùng chữ ký mock, thêm object tham số optional.
 */
import { apiRequest } from './http';
import { StorageKeys, getJSON, setJSON } from '@/lib/storage';
import type { QuickPhrase } from '@/mocks/schemas';

export async function translateText(
  text: string,
  // countryCode chi mock dung (tra cuu quick phrases gia lap) -- API that bo
  // qua, chi can from/to (nhan hien thi ngon ngu) de dua vao prompt dich.
  opts: { countryCode: string; from: string; to: string; mode?: 'text' | 'phrase' },
): Promise<{ translated: string; phonetic: string }> {
  return apiRequest<{ translated: string; phonetic: string }>('/translate', {
    method: 'POST',
    body: { text, from: opts.from, to: opts.to, mode: opts.mode ?? 'text' },
  });
}

type ApiQuickPhrase = { _id: string; countryCode: string; vi: string; translated: string; phonetic: string };

function adaptQuickPhrase(api: ApiQuickPhrase): QuickPhrase {
  return { id: api._id, countryCode: api.countryCode, vi: api.vi, translated: api.translated, phonetic: api.phonetic };
}

function cacheKey(countryCode: string): string {
  return `${StorageKeys.quickPhrasesCachePrefix}${countryCode}`;
}

// Cau dich san PHAI dung duoc khi mat mang (CLAUDE.md B7 muc 16, tinh huong
// rat thuong gap khi o nuoc ngoai) -- cache-aside giong lib/api/sos.ts: fetch
// thanh cong thi luu lai, fetch loi thi dung ban cache lan cuoi.
export async function fetchQuickPhrases(countryCode: string): Promise<{ ok: true; data: QuickPhrase[]; fromCache?: boolean }> {
  try {
    const raw = await apiRequest<ApiQuickPhrase[]>(`/quick-phrases?country=${countryCode}`);
    const data = raw.map(adaptQuickPhrase);
    await setJSON(cacheKey(countryCode), data);
    return { ok: true, data };
  } catch (error) {
    const cached = await getJSON<QuickPhrase[]>(cacheKey(countryCode));
    if (cached) return { ok: true, data: cached, fromCache: true };
    throw error;
  }
}
