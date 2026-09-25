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
import type { Article, FavoriteItem, Preferences, QuickPhrase, SearchResultItem, SupportLocation, Trip } from './schemas';
import { haversineKm } from '@/lib/geo';

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

type TripInput = {
  countryCode: string;
  destinationCity: string;
  destinationDetail?: string;
  locationAlerts?: boolean;
  regulationAlerts?: boolean;
  startDate: string;
  endDate: string;
};

export async function createTrip(input: TripInput) {
  const trip: Trip = {
    __mock: true,
    id: `t${Date.now()}`,
    isCurrent: false,
    ...input,
    locationAlerts: input.locationAlerts ?? true,
    regulationAlerts: input.regulationAlerts ?? true,
  };
  tripsState = [...tripsState, trip];
  return delay(trip);
}

export async function updateTrip(id: string, input: TripInput) {
  const index = tripsState.findIndex((trip) => trip.id === id);
  if (index < 0) throw new Error('Không tìm thấy chuyến đi');
  tripsState = tripsState.map((trip) =>
    trip.id === id
      ? {
          ...trip,
          ...input,
          locationAlerts: input.locationAlerts ?? trip.locationAlerts ?? true,
          regulationAlerts: input.regulationAlerts ?? trip.regulationAlerts ?? true,
        }
      : trip,
  );
  const updated = tripsState.find((trip) => trip.id === id);
  if (!updated) throw new Error('Không tìm thấy chuyến đi');
  return delay(updated);
}

export async function setCurrentTrip(id: string) {
  tripsState = tripsState.map((t) => ({ ...t, isCurrent: t.id === id }));
  return delay(tripsState.find((t) => t.id === id) ?? null);
}

export async function deleteTrip(id: string) {
  tripsState = tripsState.filter((t) => t.id !== id);
  return delay(null);
}

// countryCode nhan de KHOP CHU KY voi API that (GET /api/incidents?country=)
// nhung khong loc gi them o mock -- toan bo fixture da la 'countryCode: null'
// (ap dung moi noi), khong co du lieu rieng-quoc-gia can mo phong.
export async function fetchIncidents(_countryCode?: string) {
  return delay(incidents);
}

export async function fetchIncident(slug: string) {
  return delay(getIncidentBySlug(slug) ?? null);
}

// Tien do xu ly su co (B7) -- luu trong RAM cho phien mock, du de demo UI
// resume dung sau khi quay lai man hinh (khong ton tai qua lan mo app moi,
// chap nhan duoc vi day la mock).
const mockIncidentProgress = new Map<string, number[]>();

export async function getIncidentProgress(incidentId: string) {
  return delay({ completedSteps: mockIncidentProgress.get(incidentId) ?? [] });
}

export async function setIncidentProgress(incidentId: string, completedSteps: number[]) {
  mockIncidentProgress.set(incidentId, completedSteps);
  return delay({ completedSteps });
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

// fromCache khai bao san (luon undefined o mock) chi de khop kieu tra ve voi
// lib/api/translate.ts -- cong tac USE_MOCKS can ca 2 nhanh CUNG mot shape.
export async function fetchQuickPhrases(countryCode: string): Promise<{ ok: true; data: QuickPhrase[]; fromCache?: boolean }> {
  return delay(getQuickPhrasesByCountry(countryCode));
}

// fromCache khai bao san (luon undefined o mock) chi de khop kieu tra ve voi
// lib/api/sos.ts -- cong tac USE_MOCKS can ca 2 nhanh CUNG mot shape.
type LocationsEnvelope = Promise<{ ok: true; data: SupportLocation[]; fromCache?: boolean }>;

export async function fetchSupportLocations(opts?: { country?: string; type?: SupportLocation['type'] }): LocationsEnvelope {
  const data = opts?.type ? supportLocations.filter((l) => l.type === opts.type) : supportLocations;
  return delay(data);
}

export async function fetchNearbyLocations(
  lat: number,
  lng: number,
  opts?: { country?: string; type?: SupportLocation['type']; radiusKm?: number; limit?: number },
): LocationsEnvelope {
  // distanceKm khai bao optional o schema (API that co endpoint khong gan GPS)
  // -- ep kieu tra ve khop voi lib/api/sos.ts de cong tac USE_MOCKS type-check duoc.
  const withDistance: SupportLocation[] = supportLocations
    .filter((l) => !opts?.type || l.type === opts.type)
    .map((l) => ({ ...l, distanceKm: haversineKm(lat, lng, l.lat, l.lng) }))
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
    .slice(0, opts?.limit ?? 10);
  return delay(withDistance);
}

// AI Legal Assistant — trả lời giả lập theo 2 biến thể của spec mục 6.10.
// marker/articleSlug/countryCode là field MỞ RỘNG cho B5 (đánh dấu [S1] có thể
// bấm được, mở đúng bài luật) -- optional để không phá vỡ dữ liệu giả lập cũ.
export type ChatAnswer =
  | {
      status: 'answered';
      updatedAt: string;
      content: string;
      sources: { name: string; url: string; marker?: string; articleSlug?: string; countryCode?: string }[];
    }
  | {
      status: 'insufficient_evidence';
      reason: string;
      suggestions: string[];
    };

export async function askLegalAssistant(
  question: string,
  _opts?: { countryCode?: string; focusArticleId?: string },
): Promise<ChatAnswer> {
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

// Danh sách phiên chat -- mock trả rỗng (không lưu lịch sử qua lần mở app),
// chỉ tồn tại để lib/data.ts chuyển đổi qua công tắc mock/thật không vỡ type.
export type ChatSession = { _id: string; countryCode: string; title: string; updatedAt: string };
export type ChatUiMessage = {
  _id: string;
  role: 'user' | 'assistant';
  text: string;
  answer?: ChatAnswer;
  feedback?: 'up' | 'down' | null;
};

export async function listChatSessions() {
  return delay<ChatSession[]>([]);
}

export async function createChatSession(countryCode: string) {
  return delay<ChatSession>({ _id: `mock-${Date.now()}`, countryCode, title: '', updatedAt: new Date().toISOString() });
}

export async function deleteChatSession(_id: string) {
  return delay<{ deleted: true }>({ deleted: true });
}

export async function renameChatSession(id: string, title: string) {
  return delay<ChatSession>({ _id: id, countryCode: '', title, updatedAt: new Date().toISOString() });
}

export async function loadChatSessionMessages(_sessionId: string, _countryCode: string) {
  return delay<ChatUiMessage[]>([]);
}

export async function setChatMessageFeedback(_sessionId: string, _messageId: string, _feedback: 'up' | 'down') {
  return delay<{ ok: true }>({ ok: true });
}

export async function reportWrongAnswer(_input: { targetId: string; note: string; countryCode: string; question: string }) {
  return delay<{ ok: true }>({ ok: true });
}

let mockLastMessageId = 0;

export function getActiveSessionId(): string | null {
  return 'mock-session';
}

export function getLastMessageId(): string | null {
  mockLastMessageId += 1;
  return `mock-msg-${mockLastMessageId}`;
}

export async function translateText(
  text: string,
  opts: { countryCode: string; from: string; to: string; mode?: 'text' | 'phrase' },
): Promise<{ translated: string; phonetic: string }> {
  await new Promise((r) => setTimeout(r, 400));
  const known = (await fetchQuickPhrases(opts.countryCode)).data.find(
    (p) => p.vi.toLowerCase() === text.trim().toLowerCase(),
  );
  if (known) return { translated: known.translated, phonetic: known.phonetic };
  return { translated: `[${opts.to}] ${text}`, phonetic: '(chưa dịch được ở bản mẫu)' };
}

// Preferences (B8) -- luu trong RAM cho phien mock.
let mockPreferences: Preferences = {
  locale: 'vi',
  alerts: { legal: true, safety: true, tripReminder: false },
  locationConsent: true,
};

export async function fetchPreferences() {
  return delay(mockPreferences);
}

export async function updatePreferences(patch: {
  locale?: string;
  alerts?: Partial<Preferences['alerts']>;
  locationConsent?: boolean;
}) {
  mockPreferences = {
    ...mockPreferences,
    ...patch,
    alerts: { ...mockPreferences.alerts, ...(patch.alerts ?? {}) },
  };
  return delay(mockPreferences);
}

// "Da luu" gop 3 loai (B8) -- ban mock CHUA gom du lieu tu useSavedArticles
// (AsyncStorage rieng theo tung tai khoan, khong doc duoc tu ham thuan tuy o
// day) nen tra rong; man hinh Favorites o che do mock hien "chua co gi duoc
// luu". Khong anh huong che do that (lib/api/favorites.ts hoat dong day du).
export async function fetchFavorites(): Promise<{ ok: true; data: FavoriteItem[] }> {
  return delay([]);
}

export async function addFavorite(_targetType: FavoriteItem['targetType'], _targetId: string): Promise<void> {
  await delay(null);
}

export async function removeFavorite(_targetType: FavoriteItem['targetType'], _targetId: string): Promise<void> {
  await delay(null);
}
