// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuLawsRagPanel } from '../AuLawsRagPanel';
import { ragApi } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  ragApi: {
    auLaws: vi.fn(async () => ({
      data: [
        {
          titleId: 'C1946A00045',
          name: 'Immigration (Guardianship of Children) Act 1946',
          topics: ['cu-tru'],
          index: { chunks: 28, registerId: 'C2024C00628', embeddingModel: 'gemini-embedding-001' },
          job: { status: 'done', lastError: null, createdAt: '2026-10-20T00:00:00Z' },
        },
        {
          titleId: 'C2004A01918',
          name: null,
          topics: ['xuat-nhap-canh'],
          index: null,
          job: { status: 'running', lastError: null, createdAt: '2026-10-20T00:00:00Z' },
        },
        {
          titleId: 'C2005A00005',
          name: 'Australian Passports Act 2005',
          topics: ['xuat-nhap-canh'],
          index: null,
          job: { status: 'failed', lastError: 'GEMINI_EMBEDDING_FAILED: 429', createdAt: '2026-10-20T00:00:00Z' },
        },
      ],
    })),
    indexAuLaws: vi.fn(async () => ({ data: { queued: ['C2005A00005'], skipped: [] } })),
    removeAuLaw: vi.fn(async () => ({ data: { titleId: 'C1946A00045', deleted: 28 } })),
  },
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

async function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <AuLawsRagPanel />
      </QueryClientProvider>,
    );
  });
  // Chờ react-query trả dữ liệu rồi mới kiểm.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  return container;
}

const buttonOf = (container: HTMLElement, label: string, row: number) =>
  Array.from(container.querySelectorAll('tbody tr')[row].querySelectorAll('button')).find((b) => b.textContent?.includes(label));

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

describe('AuLawsRagPanel', () => {
  it('hiện trạng thái index, số chunk và job của từng luật', async () => {
    const container = await mount();
    expect(container.textContent).toContain('Đã index 1/3 luật');
    expect(container.textContent).toContain('Immigration (Guardianship of Children) Act 1946');
    expect(container.textContent).toContain('28');
    expect(container.textContent).toContain('Đang index');
    expect(container.textContent).toContain('Job lỗi');
    expect(container.textContent).toContain('GEMINI_EMBEDDING_FAILED: 429');
    // Chưa tra được tên thì vẫn hiện mã luật.
    expect(container.textContent).toContain('C2004A01918');
  });

  it('luật đang có job chờ/chạy thì khoá nút Index để không chạy trùng', async () => {
    const container = await mount();
    expect((buttonOf(container, 'Index', 1) as HTMLButtonElement).disabled).toBe(true);
    expect((buttonOf(container, 'Index', 2) as HTMLButtonElement).disabled).toBe(false);
  });

  it('bấm Index xếp job cho đúng luật', async () => {
    const container = await mount();
    await act(async () => {
      buttonOf(container, 'Index', 2)?.click();
    });
    expect(ragApi.indexAuLaws).toHaveBeenCalledWith(['C2005A00005']);
    expect(container.textContent).toContain('Đã xếp 1 luật vào hàng đợi');
  });

  it('xoá luật phải xác nhận trước, huỷ xác nhận thì không gọi API', async () => {
    const container = await mount();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await act(async () => {
      buttonOf(container, 'Xoá', 0)?.click();
    });
    expect(confirm).toHaveBeenCalled();
    expect(ragApi.removeAuLaw).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await act(async () => {
      buttonOf(container, 'Xoá', 0)?.click();
    });
    expect(ragApi.removeAuLaw).toHaveBeenCalledWith('C1946A00045');
  });
});
