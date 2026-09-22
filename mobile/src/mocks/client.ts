// Lớp mạng giả lập — thay MSW (không phù hợp RN). Cùng envelope {ok,data} và độ trễ giả
// như API thật, để khi nối API thật (B3→B8) không cần sửa component gọi các hàm này.
import { countries, getCountryByCode } from './fixtures/countries';
import { topics, getTopicsByCountry } from './fixtures/topics';
import { getArticleBySlug, getArticlesByCountry } from './fixtures/articles';
import { trips as tripsFixture } from './fixtures/trips';
import { incidents, getIncidentBySlug } from './fixtures/incidents';
import { alerts as alertsFixture } from './fixtures/alerts';
import { getQuickPhrasesByCountry } from './fixtures/quick-phrases';
import { supportLocations } from './fixtures/support-locations';
import type { Article, SearchResultItem, Trip } from './schemas';

export const IS_MOCK = true;

function delay<T>(data: T, ms = 350): Promise<{ ok: true; data: T }> {
  return new Promise((resolve) => setTimeout(() => resolve({ ok: true, data }), ms));
}

export async function fetchCountries() {
  return delay(countries);
}

export async function fetchCountry(code: string) {
  return delay(getCountryByCode(code) ?? null);
}

export async function fetchTopics(countryCode: string) {
  return delay(getTopicsByCountry(countryCode));
}

export async function fetchArticles(countryCode: string, opts?: { topicKey?: string; savedOnly?: boolean }) {
  let list = getArticlesByCountry(countryCode);
  if (opts?.topicKey) list = list.filter((a) => a.topicKey === opts.topicKey);
  if (opts?.savedOnly) list = list.filter((a) => a.saved);
  return delay(list);
}

export async function fetchArticle(countryCode: string, slug: string) {
  return delay(getArticleBySlug(countryCode, slug) ?? null);
}

function stripDiacritics(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export async function searchArticles(query: string, countryCode: string): Promise<{ ok: true; data: SearchResultItem[] }> {
  const q = stripDiacritics(query.trim());
  if (!q) return delay([]);
  const matches = getArticlesByCountry(countryCode).filter(
    (a) => stripDiacritics(a.title).includes(q) || stripDiacritics(a.summary).includes(q),
  );
  const topicLabel = (a: Article) => topics.find((t) => t.key === a.topicKey)?.label ?? '';
  return delay(
    matches.map((a) => ({
      __mock: true as const,
      id: a.id,
      title: a.title,
      summary: a.summary,
      topicLabel: topicLabel(a),
      source: a.source.agency,
      countryCode: a.countryCode,
      slug: a.slug,
    })),
  );
}

let tripsState: Trip[] = [...tripsFixture];

export async function fetchTrips() {
  return delay([...tripsState]);
}

export async function createTrip(input: { countryCode: string; startDate: string; endDate: string }) {
  const trip: Trip = { __mock: true, id: `t${Date.now()}`, isCurrent: false, ...input };
  tripsState = [...tripsState, trip];
  return delay(trip);
}

export async function setCurrentTrip(id: string) {
  tripsState = tripsState.map((t) => ({ ...t, isCurrent: t.id === id }));
  return delay(tripsState.find((t) => t.id === id) ?? null);
}

export async function deleteTrip(id: string) {
  tripsState = tripsState.filter((t) => t.id !== id);
  return delay(null);
}

export async function fetchIncidents() {
  return delay(incidents);
}

export async function fetchIncident(slug: string) {
  return delay(getIncidentBySlug(slug) ?? null);
}

let alertsState = [...alertsFixture];

export async function fetchAlerts() {
  return delay([...alertsState]);
}

export async function markAlertRead(id: string) {
  alertsState = alertsState.map((a) => (a.id === id ? { ...a, read: true } : a));
  return delay(null);
}

export async function markAllAlertsRead() {
  alertsState = alertsState.map((a) => ({ ...a, read: true }));
  return delay(null);
}

export async function fetchQuickPhrases(countryCode: string) {
  return delay(getQuickPhrasesByCountry(countryCode));
}

export async function fetchSupportLocations() {
  return delay(supportLocations);
}

// AI Legal Assistant — trả lời giả lập theo 2 biến thể của spec mục 6.10.
export type ChatAnswer =
  | {
      status: 'answered';
      updatedAt: string;
      content: string;
      sources: { name: string; url: string }[];
    }
  | {
      status: 'insufficient_evidence';
      reason: string;
      suggestions: string[];
    };

export async function askLegalAssistant(question: string): Promise<ChatAnswer> {
  await new Promise((r) => setTimeout(r, 600));
  const q = stripDiacritics(question);
  if (q.includes('thuoc') || q.includes('mang thuoc')) {
    return {
      status: 'insufficient_evidence',
      reason:
        'Cẩm nang Nhật Bản hiện chưa có văn bản nào về việc mang thuốc theo người. Mình sẽ không đoán, vì trả lời sai có thể khiến bạn gặp rắc rối ở hải quan.',
      suggestions: [
        'Kiểm tra danh mục hoạt chất bị hạn chế trên trang hải quan Nhật Bản.',
        'Hỏi Đại sứ quán Việt Nam nếu mang thuốc kê đơn số lượng lớn.',
      ],
    };
  }
  return {
    status: 'answered',
    updatedAt: '11/2025',
    content:
      '**Có**, bạn được quay phim ở nơi công cộng. Nhưng có 2 giới hạn quan trọng:\n- Cấm quay ở nơi có biển báo: đền chùa, bảo tàng, ga tàu tư nhân.\n- Đăng ảnh rõ mặt người khác lên mạng có thể bị kiện quyền hình ảnh. [S1]',
    sources: [{ name: 'Quy định về quyền hình ảnh cá nhân — Bộ Tư pháp Nhật Bản', url: 'https://www.moj.go.jp' }],
  };
}

export async function translateText(text: string): Promise<{ translated: string; phonetic: string }> {
  await new Promise((r) => setTimeout(r, 400));
  const known = (await fetchQuickPhrases('JP')).data.find((p) => p.vi.toLowerCase() === text.trim().toLowerCase());
  if (known) return { translated: known.translated, phonetic: known.phonetic };
  return { translated: '（翻訳できませんでした）', phonetic: '(chưa dịch được ở bản mẫu)' };
}
