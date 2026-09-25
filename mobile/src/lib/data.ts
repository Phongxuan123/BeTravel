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
 * B7: incidents + translator đã nối API thật -- đổi theo EXPO_PUBLIC_USE_MOCKS.
 * B8: alerts + favorites + preferences đã nối API thật -- đổi theo
 * EXPO_PUBLIC_USE_MOCKS. Sau batch này mobile không còn phụ thuộc
 * '@/mocks/client' hay '@/mocks/fixtures' ở bất kỳ màn hình nào (chỉ còn
 * dùng src/mocks/ khi EXPO_PUBLIC_USE_MOCKS=true và trong test).
 */
import * as mock from '@/mocks/client';
import * as content from '@/lib/api/content';
import * as chatApi from '@/lib/api/chat';
import * as feedbackApi from '@/lib/api/feedback';
import * as sosApi from '@/lib/api/sos';
import * as incidentsApi from '@/lib/api/incidents';
import * as translateApi from '@/lib/api/translate';
import * as alertsApi from '@/lib/api/alerts';
import * as favoritesApi from '@/lib/api/favorites';
import * as preferencesApi from '@/lib/api/preferences';

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
export const renameChatSession = USE_MOCKS ? mock.renameChatSession : chatApi.renameChatSession;
export const loadChatSessionMessages = USE_MOCKS ? mock.loadChatSessionMessages : chatApi.loadChatSessionMessages;
export const setChatMessageFeedback = USE_MOCKS ? mock.setChatMessageFeedback : chatApi.setChatMessageFeedback;
export const reportWrongAnswer = USE_MOCKS ? mock.reportWrongAnswer : feedbackApi.reportWrongAnswer;
export const startNewChatSession = USE_MOCKS ? (): void => {} : chatApi.startNewSession;
export const setActiveChatSession = USE_MOCKS ? (_sessionId: string, _countryCode: string): void => {} : chatApi.setActiveSession;
export const getActiveChatSessionId = USE_MOCKS ? mock.getActiveSessionId : chatApi.getActiveSessionId;
export const getLastChatMessageId = USE_MOCKS ? mock.getLastMessageId : chatApi.getLastMessageId;

export const fetchSupportLocations = USE_MOCKS ? mock.fetchSupportLocations : sosApi.fetchSupportLocations;
export const fetchNearbyLocations = USE_MOCKS ? mock.fetchNearbyLocations : sosApi.fetchNearbyLocations;

export const fetchIncidents = USE_MOCKS ? mock.fetchIncidents : incidentsApi.fetchIncidents;
export const fetchIncident = USE_MOCKS ? mock.fetchIncident : incidentsApi.fetchIncident;
export const getIncidentProgress = USE_MOCKS ? mock.getIncidentProgress : incidentsApi.getIncidentProgress;
export const setIncidentProgress = USE_MOCKS ? mock.setIncidentProgress : incidentsApi.setIncidentProgress;

export const fetchQuickPhrases = USE_MOCKS ? mock.fetchQuickPhrases : translateApi.fetchQuickPhrases;
export const translateText = USE_MOCKS ? mock.translateText : translateApi.translateText;

export const fetchAlerts = USE_MOCKS ? mock.fetchAlerts : alertsApi.fetchAlerts;
export const markAlertRead = USE_MOCKS ? mock.markAlertRead : alertsApi.markAlertRead;
export const markAllAlertsRead = USE_MOCKS ? mock.markAllAlertsRead : alertsApi.markAllAlertsRead;
export const setAlertsContext = USE_MOCKS ? (): void => {} : alertsApi.setAlertsContext;

export const fetchFavorites = USE_MOCKS ? mock.fetchFavorites : favoritesApi.fetchFavorites;
export const addFavorite = USE_MOCKS ? mock.addFavorite : favoritesApi.addFavorite;
export const removeFavorite = USE_MOCKS ? mock.removeFavorite : favoritesApi.removeFavorite;

export const fetchPreferences = USE_MOCKS ? mock.fetchPreferences : preferencesApi.fetchPreferences;
export const updatePreferences = USE_MOCKS ? mock.updatePreferences : preferencesApi.updatePreferences;

export type { ChatAnswer, ChatSession, ChatUiMessage } from '@/mocks/client';
