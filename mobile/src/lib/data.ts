/**
 * Công tắc mock <-> API thật. Mọi màn hình import dữ liệu từ ĐÂY, không import
 * trực tiếp từ '@/mocks/client'.
 *
 * B1: chỉ auth đã nối API thật (qua lib/auth.tsx, không đi qua file này --
 * auth có vòng đời riêng: token, refresh, khôi phục phiên). Nội dung
 * (topics/articles/trips/incidents/alerts/sos/chat/translate) vẫn 100% mock
 * cho tới khi backend có endpoint tương ứng (B3 trở đi). Khi đó từng hàm sẽ
 * đổi sang mẫu `EXPO_PUBLIC_USE_MOCKS === 'true' ? mock.fn : real.fn`.
 */
import * as mock from '@/mocks/client';

export const {
  fetchCountries,
  fetchCountry,
  fetchTopics,
  fetchArticles,
  fetchArticle,
  searchArticles,
  fetchTrips,
  createTrip,
  setCurrentTrip,
  deleteTrip,
  fetchIncidents,
  fetchIncident,
  fetchAlerts,
  markAlertRead,
  markAllAlertsRead,
  fetchQuickPhrases,
  fetchSupportLocations,
  askLegalAssistant,
  translateText,
} = mock;

export type { ChatAnswer } from '@/mocks/client';
