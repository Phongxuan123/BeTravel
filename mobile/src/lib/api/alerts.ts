/**
 * Noi man hinh Alerts + banner AppShell vao API that (B8). CUNG CHU KY mock
 * (fetchAlerts khong tham so, markAlertRead/markAllAlertsRead theo id) --
 * quoc gia/vi tri hien tai duoc set truoc qua setAlertsContext() (cung mau
 * voi activeSessionId cua lib/api/chat.ts), khong truyen tham so truc tiep.
 */
import { apiRequest } from './http';
import { StorageKeys, getJSON, setJSON } from '@/lib/storage';
import type { Alert } from '@/mocks/schemas';

type ApiGeoAlert = {
  _id: string;
  countryCode: string;
  scope: 'country' | 'area';
  title: string;
  message: string;
  severity: 'info' | 'warn' | 'danger';
  behaviorsToAvoid: string[];
  linkedArticleId: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: string;
};

const DISMISS_WINDOW_MS = 24 * 60 * 60 * 1000;

async function getDismissedMap(): Promise<Record<string, string>> {
  return (await getJSON<Record<string, string>>(StorageKeys.dismissedAlerts)) ?? {};
}

function isDismissedRecently(dismissedAt: string | undefined): boolean {
  if (!dismissedAt) return false;
  return Date.now() - new Date(dismissedAt).getTime() < DISMISS_WINDOW_MS;
}

function formatMeta(alert: ApiGeoAlert): string {
  const scopeLabel = alert.scope === 'country' ? 'Toàn quốc' : 'Khu vực';
  const date = new Date(alert.effectiveFrom);
  const dateLabel = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
  return `${scopeLabel} · ${dateLabel}`;
}

function adaptAlert(api: ApiGeoAlert, dismissed: Record<string, string>): Alert {
  return {
    id: api._id,
    // GeoAlert khong co khai niem 'legal'/'trip' rieng -- luon la 'safety'
    // (canh bao vi tri/an toan), xem docs/PROGRESS.md "Quyet dinh phat sinh (B8)".
    category: 'safety',
    severity: api.severity,
    title: api.title,
    body: api.message,
    meta: formatMeta(api),
    behaviorsToAvoid: api.behaviorsToAvoid,
    read: isDismissedRecently(dismissed[api._id]),
    createdAt: api.effectiveFrom,
  };
}

let currentContext: { countryCode: string; lat?: number; lng?: number } | null = null;

/** Goi TRUOC fetchAlerts() moi khi quoc gia/vi tri doi -- xem usePollAlerts.ts. */
export function setAlertsContext(context: { countryCode: string; lat?: number; lng?: number }): void {
  currentContext = context;
}

export async function fetchAlerts(): Promise<{ ok: true; data: Alert[] }> {
  if (!currentContext) return { ok: true, data: [] };

  const params = new URLSearchParams({ country: currentContext.countryCode });
  if (currentContext.lat !== undefined) params.set('lat', String(currentContext.lat));
  if (currentContext.lng !== undefined) params.set('lng', String(currentContext.lng));

  const raw = await apiRequest<ApiGeoAlert[]>(`/alerts/applicable?${params.toString()}`);
  const dismissed = await getDismissedMap();
  return { ok: true, data: raw.map((a) => adaptAlert(a, dismissed)) };
}

export async function markAlertRead(id: string): Promise<{ ok: true; data: null }> {
  const dismissed = await getDismissedMap();
  dismissed[id] = new Date().toISOString();
  await setJSON(StorageKeys.dismissedAlerts, dismissed);
  return { ok: true, data: null };
}

export async function markAllAlertsRead(): Promise<{ ok: true; data: null }> {
  const { data } = await fetchAlerts();
  const dismissed = await getDismissedMap();
  const now = new Date().toISOString();
  data.forEach((a) => {
    dismissed[a.id] = now;
  });
  await setJSON(StorageKeys.dismissedAlerts, dismissed);
  return { ok: true, data: null };
}
