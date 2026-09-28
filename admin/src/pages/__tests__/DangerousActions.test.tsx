// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import LocationsPage from '../LocationsPage';
import RagIndexPage from '../RagIndexPage';
import { locationsApi, ragApi } from '../../lib/api';

vi.mock('../../components/MapPicker', () => ({ MapPicker: () => null }));
vi.mock('../../lib/api', () => ({
  countriesApi: {
    list: vi.fn(async () => ({ data: [{ _id: 'c1', code: 'VN', name: 'Việt Nam', status: 'active' }] })),
  },
  locationsApi: {
    list: vi.fn(async () => ({
      data: [{
        _id: 'l1', countryCode: 'VN', type: 'embassy', name: 'Điểm chưa xác minh', address: 'Hà Nội',
        phone: '1', verified: false, location: { type: 'Point', coordinates: [105.8, 21.0] },
      }],
    })),
    bulkVerify: vi.fn(async () => ({ data: { verifiedCount: 1 } })),
  },
  ragApi: {
    status: vi.fn(async () => ({ data: [] })),
    reindexCountry: vi.fn(async () => ({ data: { queued: 0 } })),
  },
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

async function mount(element: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<QueryClientProvider client={client}><MemoryRouter>{element}</MemoryRouter></QueryClientProvider>);
  });
  // Cho cac query mock (countries, locations...) resolve va render xong.
  for (let tick = 0; tick < 3; tick++) {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  }
  return {
    container,
    button: (text: string) => [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(text))!,
    cleanup: async () => { await act(async () => root.unmount()); container.remove(); },
  };
}

// Chi khoi phuc spy window.confirm -- restoreAllMocks se xoa ca implementation
// cua mock API o tren, lam test sau khong con du lieu.
afterEach(() => vi.mocked(window.confirm).mockRestore?.());

// INV-14.6 (docs/07_QA_BugHunt.md): thao tac anh huong du lieu cong khai phai
// co hop xac nhan -- xac minh diem SOS la dua no len app cho nguoi dung that.
describe('Thao tác nguy hiểm ở Admin', () => {
  it('xác minh hàng loạt điểm SOS phải qua hộp xác nhận', async () => {
    const page = await mount(<LocationsPage />);
    // Checkbox duy nhat khi chua mo modal la o chon dong trong bang.
    await act(async () => { page.container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click(); });

    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await act(async () => { page.button('Xác minh đã chọn').click(); });
    expect(locationsApi.bulkVerify).not.toHaveBeenCalled();

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await act(async () => { page.button('Xác minh đã chọn').click(); });
    expect(locationsApi.bulkVerify).toHaveBeenCalledWith(['l1']);
    await page.cleanup();
  });

  it('re-index lấy quốc gia từ dữ liệu (không hard-code) và phải xác nhận', async () => {
    const page = await mount(<RagIndexPage />);
    const select = page.container.querySelector('select')!;
    expect([...select.options].map((o) => o.value)).toEqual(['', 'VN']);
    await act(async () => {
      select.value = 'VN';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await act(async () => { page.button('Re-index VN').click(); });
    expect(ragApi.reindexCountry).not.toHaveBeenCalled();
    await page.cleanup();
  });
});
