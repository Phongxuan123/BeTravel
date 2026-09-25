/**
 * Tuỳ chọn cá nhân (B8) -- đọc qua GET /api/auth/me (đã trả kèm
 * user.preferences), ghi qua PUT /api/users/preferences. Không có GET riêng
 * (đúng theo contracts/README.md mục 22).
 */
import { apiRequest } from './http';
import { me } from './auth';
import type { Preferences } from '@/mocks/schemas';

const DEFAULT_PREFERENCES: Preferences = {
  locale: 'vi',
  alerts: { legal: true, safety: true, tripReminder: false },
  locationConsent: true,
};

export async function fetchPreferences(): Promise<{ ok: true; data: Preferences }> {
  const { user } = await me();
  return { ok: true, data: user.preferences ?? DEFAULT_PREFERENCES };
}

export type PreferencesPatch = {
  locale?: string;
  alerts?: Partial<Preferences['alerts']>;
  locationConsent?: boolean;
};

export async function updatePreferences(patch: PreferencesPatch): Promise<{ ok: true; data: Preferences }> {
  const data = await apiRequest<Preferences>('/users/preferences', { method: 'PUT', body: patch });
  return { ok: true, data };
}
