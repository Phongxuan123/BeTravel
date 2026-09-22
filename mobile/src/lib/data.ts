/**
 * Công tắc mock <-> API thật. Mọi màn hình import dữ liệu từ ĐÂY, không import
 * trực tiếp từ '@/mocks/client'.
 *
 * B1: auth đã nối API thật (qua lib/auth.tsx, không đi qua file này -- auth
 * có vòng đời riêng: token, refresh, khôi phục phiên).
 * B3: countries/topics/legal articles/search/trips đã nối API thật -- đổi
 * theo EXPO_PUBLIC_USE_MOCKS. Phần còn lại (incidents/alerts/sos/chat/
 * translate) vẫn 100% mock cho tới khi backend có endpoint tương ứng.
 */
import * as mock from '@/mocks/client';
import * as content from '@/lib/api/content';

// Cung quy uoc voi lib/auth.tsx: chi mock khi dat DUNG 'true', mac dinh la
// API that (khac voi doc chu thich cu o day, da sua lai cho dung).
const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === 'true';

export const fetchCountries = USE_MOCKS ? mock.fetchCountries : content.fetchCountries;
export const fetchCountry = USE_MOCKS ? mock.fetchCountry : content.fetchCountry;
export const fetchTopics = USE_MOCKS ? mock.fetchTopics : content.fetchTopics;
export const fetchArticles = USE_MOCKS ? mock.fetchArticles : content.fetchArticles;
export const fetchArticle = USE_MOCKS ? mock.fetchArticle : content.fetchArticle;
export const searchArticles = USE_MOCKS ? mock.searchArticles : content.searchArticles;
export const fetchTrips = USE_MOCKS ? mock.fetchTrips : content.fetchTrips;
export const createTrip = USE_MOCKS ? mock.createTrip : content.createTrip;
export const setCurrentTrip = USE_MOCKS ? mock.setCurrentTrip : content.setCurrentTrip;
export const deleteTrip = USE_MOCKS ? mock.deleteTrip : content.deleteTrip;

export const {
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
