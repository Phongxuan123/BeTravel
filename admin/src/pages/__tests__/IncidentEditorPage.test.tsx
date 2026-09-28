// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import IncidentEditorPage from '../IncidentEditorPage';
import { incidentsApi } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  countriesApi: { list: vi.fn(async () => ({ data: [] })) },
  incidentsApi: { get: vi.fn(), update: vi.fn(), create: vi.fn() },
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe('Incident editor', () => {
  it('refetch không ghi đè draft và lưu kèm revision lúc bắt đầu sửa', async () => {
    const incident = { _id: 'i1', title: 'Bản đầu', slug: 'test', countryCode: null, iconKey: 'IdCard', tone: 'blue', urgent: false, reassurance: '', status: 'draft', steps: [], updatedAt: '2026-09-28T00:00:00.000Z' };
    vi.mocked(incidentsApi.get).mockResolvedValue({ data: incident } as never);
    vi.mocked(incidentsApi.update).mockResolvedValue({ data: { ...incident, updatedAt: '2026-09-28T02:00:00.000Z' } } as never);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['admin', 'incidents', 'i1'], { data: incident });
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => { root.render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/incidents/i1']}><Routes><Route path="/incidents/:id" element={<IncidentEditorPage />} /></Routes></MemoryRouter></QueryClientProvider>); });
    const title = [...container.querySelectorAll('input')].find((input) => input.value === 'Bản đầu')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(title, 'Đang nhập');
      title.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => { client.setQueryData(['admin', 'incidents', 'i1'], { data: { ...incident, title: 'Người khác sửa', updatedAt: '2026-09-28T01:00:00.000Z' } }); });
    expect(title.value).toBe('Đang nhập');
    await act(async () => { container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(incidentsApi.update).toHaveBeenCalledWith('i1', expect.objectContaining({ title: 'Đang nhập', updatedAt: incident.updatedAt }));
    await act(async () => { root.unmount(); });
    client.clear();
    container.remove();
  });
});
