/**
 * Công tắc mock <-> API thật. Mọi màn hình import dữ liệu từ ĐÂY, không import
 * trực tiếp từ '@/mocks/client'.
 *
 * B1: auth đã nối API thật (qua lib/auth.tsx, không đi qua file này -- auth
 * có vòng đời riêng: token, refresh, khôi phục phiên).
 * B3: countries/topics/legal articles/search/trips đã nối API thật -- đổi
 * theo EXPO_PUBLIC_USE_MOCKS.
 * B5: chat + feedback đã nối API thật -- đổi theo EXPO_PUBLIC_USE_MOCKS.
 * B6: SOS support-locations đã nối API thật -- đổi theo EXPO_PUBLIC_USE_MOCKS.
 * Phần còn lại (incidents/alerts/translate) vẫn 100% mock cho tới khi backend
 * có endpoint tương ứng.
 */
import * as mock from '@/mocks/client';
import * as content from '@/lib/api/content';
import * as chatApi from '@/lib/api/chat';
import * as feedbackApi from '@/lib/api/feedback';
import * as sosApi from '@/lib/api/sos';

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
export const updateTrip = USE_MOCKS ? mock.updateTrip : content.updateTrip;
export const setCurrentTrip = USE_MOCKS ? mock.setCurrentTrip : content.setCurrentTrip;
export const deleteTrip = USE_MOCKS ? mock.deleteTrip : content.deleteTrip;

export const askLegalAssistant = USE_MOCKS ? mock.askLegalAssistant : chatApi.askLegalAssistant;
export const listChatSessions = USE_MOCKS ? mock.listChatSessions : chatApi.listChatSessions;
export const createChatSession = USE_MOCKS ? mock.createChatSession : chatApi.createChatSession;
export const deleteChatSession = USE_MOCKS ? mock.deleteChatSession : chatApi.deleteChatSession;
export const loadChatSessionMessages = USE_MOCKS ? mock.loadChatSessionMessages : chatApi.loadChatSessionMessages;
export const setChatMessageFeedback = USE_MOCKS ? mock.setChatMessageFeedback : chatApi.setChatMessageFeedback;
export const reportWrongAnswer = USE_MOCKS ? mock.reportWrongAnswer : feedbackApi.reportWrongAnswer;
export const startNewChatSession = USE_MOCKS ? (): void => {} : chatApi.startNewSession;
export const setActiveChatSession = USE_MOCKS ? (_sessionId: string, _countryCode: string): void => {} : chatApi.setActiveSession;
export const getActiveChatSessionId = USE_MOCKS ? mock.getActiveSessionId : chatApi.getActiveSessionId;
export const getLastChatMessageId = USE_MOCKS ? mock.getLastMessageId : chatApi.getLastMessageId;

export const fetchSupportLocations = USE_MOCKS ? mock.fetchSupportLocations : sosApi.fetchSupportLocations;
export const fetchNearbyLocations = USE_MOCKS ? mock.fetchNearbyLocations : sosApi.fetchNearbyLocations;

export const {
  fetchIncidents,
  fetchIncident,
  fetchAlerts,
  markAlertRead,
  markAllAlertsRead,
  fetchQuickPhrases,
  translateText,
} = mock;

export type { ChatAnswer, ChatSession, ChatUiMessage } from '@/mocks/client';
