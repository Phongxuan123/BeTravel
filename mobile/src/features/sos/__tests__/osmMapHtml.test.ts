import { buildOsmMapHtml, zoomForDelta } from '../osmMapHtml';

test('zoomForDelta đổi độ rộng vùng nhìn sang mức zoom Leaflet, có chặn biên', () => {
  expect(zoomForDelta(0.1)).toBe(12);
  expect(zoomForDelta(0.02)).toBe(14);
  expect(zoomForDelta(100)).toBe(2);
  expect(zoomForDelta(0)).toBe(19);
  expect(zoomForDelta(1000)).toBe(1);
});

test('buildOsmMapHtml đặt tâm đúng thứ tự [lat, lng], khóa Leaflet bằng SRI và không đóng thẻ script sớm', () => {
  const html = buildOsmMapHtml({ lat: 37.5385, lng: 126.9715, zoom: 12, tileUrl: 'https://tile.example/{z}/{x}/{y}.png', maxZoom: 19 });

  // Seoul: lat ~37.5 phải đứng trước lng ~127 (đảo ngược là lỗi kinh điển).
  expect(html).toContain('.setView([37.5385, 126.9715], 12)');
  expect(html).toContain('leaflet@1.9.4/dist/leaflet.js" integrity="sha256-');
  expect(html).toContain('"https://tile.example/{z}/{x}/{y}.png"');
  expect(html).toContain('OpenStreetMap</a> contributors');
});

test('buildOsmMapHtml thoát "<" trong dữ liệu nhúng để URL ô không chèn được thẻ script', () => {
  const html = buildOsmMapHtml({ lat: 1, lng: 2, zoom: 3, tileUrl: 'https://x/</script><script>alert(1)</script>/{z}.png', maxZoom: 19 });

  expect(html).not.toContain('</script><script>alert(1)');
  expect(html).toContain('\\u003c/script>');
});

// Chạy đoạn script nhúng với Leaflet giả: bắt lỗi cú pháp (bản đồ trắng) và kiểm hành vi ghim/giữ lâu.
function runEmbeddedPage() {
  const html = buildOsmMapHtml({ lat: 37.5, lng: 127, zoom: 12, tileUrl: 'https://tile.example/{z}/{x}/{y}.png', maxZoom: 19 });
  const script = /<script>\n([\s\S]*?)<\/script>/.exec(html)?.[1] ?? '';
  const posted: { type: string; [key: string]: unknown }[] = [];
  const mapHandlers: Record<string, (event: { latlng: { lat: number; lng: number } }) => void> = {};
  const markers: { opts: { radius: number }; handlers: Record<string, () => void> }[] = [];
  const layer = { clearLayers: jest.fn() };
  const map = {
    setView: () => map,
    on: (name: string, handler: (event: { latlng: { lat: number; lng: number } }) => void) => { mapHandlers[name] = handler; },
    whenReady: (callback: () => void) => callback(),
    flyTo: jest.fn(),
    fitBounds: jest.fn(),
  };
  const leaflet = {
    map: () => map,
    tileLayer: () => ({ addTo: () => undefined }),
    layerGroup: () => ({ addTo: () => layer }),
    circleMarker: (_latlng: number[], opts: { radius: number }) => {
      const marker = { opts, handlers: {} as Record<string, () => void>,
        on: (name: string, handler: () => void) => { marker.handlers[name] = handler; },
        addTo: () => { markers.push(marker); } };
      return marker;
    },
  };
  const win: Record<string, unknown> = { ReactNativeWebView: { postMessage: (data: string) => posted.push(JSON.parse(data)) } };
  new Function('L', 'window', script)(leaflet, win);
  return { win, posted, mapHandlers, markers };
}

test('trang Leaflet: script chạy được, ghim "đã chọn" lớn và không bấm được, ghim điểm hỗ trợ bấm được', () => {
  const { win, posted, markers } = runEmbeddedPage();
  expect(posted).toContainEqual({ type: 'ready' });

  (win.setMarkers as (items: unknown[]) => void)([
    { id: 'me', lat: 1, lng: 2, color: '#000', kind: 'me' },
    { id: 'picked', lat: 3, lng: 4, color: '#E11D48', kind: 'picked' },
    { id: 'p1', lat: 5, lng: 6, color: '#0f0', kind: 'place' },
  ]);
  const [me, picked, place] = markers;
  expect(picked.opts.radius).toBeGreaterThan(me.opts.radius);
  expect(me.handlers.click).toBeUndefined();
  expect(picked.handlers.click).toBeUndefined();
  place.handlers.click();
  expect(posted).toContainEqual({ type: 'marker', id: 'p1' });
});

test('trang Leaflet: giữ lâu trên bản đồ gửi toạ độ [lat, lng] về app', () => {
  const { posted, mapHandlers } = runEmbeddedPage();
  mapHandlers.contextmenu({ latlng: { lat: 37.5665, lng: 126.978 } });
  expect(posted).toContainEqual({ type: 'longpress', lat: 37.5665, lng: 126.978 });
});
