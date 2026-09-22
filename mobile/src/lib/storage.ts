import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageKeys = {
  onboarded: 'bt_onboarded',
  authUser: 'bt_auth_user',
  recentSearches: 'bt_recent_searches',
  incidentProgress: 'bt_incident_progress',
  preferences: 'bt_preferences',
  emergencyContacts: 'bt_emergency_contacts',
  documentStatus: 'bt_document_status',
  savedArticles: 'bt_saved_articles',
} as const;

export async function getJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function setJSON<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // bỏ qua lỗi ghi storage — không chặn luồng chính
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // bỏ qua
  }
}
