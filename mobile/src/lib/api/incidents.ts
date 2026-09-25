/**
 * Nối incidents/[slug].tsx và incidents/index.tsx vào API thật (B7). CÙNG
 * chữ ký cơ bản với mock, thêm object tham số optional (giống pattern sos.ts,
 * chat.ts) -- xem lib/data.ts cho công tắc mock/thật.
 */
import { apiRequest } from './http';
import type { Incident } from '@/mocks/schemas';

export type ApiIncidentCta = { type: 'map' | 'call' | 'ai' | 'link'; label: string; payload: Record<string, unknown> };
export type ApiIncidentStep = {
  order: number;
  title: string;
  body: string[];
  checklist: { label: string }[];
  contactRefs: string[];
  articleRefs: string[];
  ctas: ApiIncidentCta[];
};
export type ApiIncident = {
  _id: string;
  slug: string;
  countryCode: string | null;
  title: string;
  iconKey: string;
  tone: 'blue' | 'red' | 'orange' | 'green';
  urgent: boolean;
  reassurance: string;
  steps: ApiIncidentStep[];
  status: 'draft' | 'published';
};

// mocks/schemas.ts#incidentSchema duoc thiet ke sat voi model that (B7) nen
// adapter chi la pass-through gan nhu nguyen ven -- giu STEP GIU NGUYEN de
// man hinh doc duoc order/ctas/contactRefs/articleRefs that.
export function adaptIncident(api: ApiIncident): Incident {
  return {
    _id: api._id,
    slug: api.slug,
    countryCode: api.countryCode,
    title: api.title,
    iconKey: api.iconKey,
    tone: api.tone,
    urgent: api.urgent,
    reassurance: api.reassurance,
    steps: api.steps,
  };
}

export async function fetchIncidents(countryCode?: string): Promise<{ ok: true; data: Incident[] }> {
  const params = new URLSearchParams();
  if (countryCode) params.set('country', countryCode);
  const data = await apiRequest<ApiIncident[]>(`/incidents?${params.toString()}`);
  return { ok: true, data: data.map(adaptIncident) };
}

export async function fetchIncident(slug: string): Promise<{ ok: true; data: Incident | null }> {
  try {
    const data = await apiRequest<ApiIncident>(`/incidents/${slug}`);
    return { ok: true, data: adaptIncident(data) };
  } catch {
    return { ok: true, data: null };
  }
}

export async function getIncidentProgress(incidentId: string): Promise<{ ok: true; data: { completedSteps: number[] } }> {
  const data = await apiRequest<{ completedSteps: number[] }>(`/users/incident-progress/${incidentId}`);
  return { ok: true, data };
}

export async function setIncidentProgress(
  incidentId: string,
  completedSteps: number[],
): Promise<{ ok: true; data: { completedSteps: number[] } }> {
  const data = await apiRequest<{ completedSteps: number[] }>(`/users/incident-progress/${incidentId}`, {
    method: 'PUT',
    body: { completedSteps },
  });
  return { ok: true, data };
}
