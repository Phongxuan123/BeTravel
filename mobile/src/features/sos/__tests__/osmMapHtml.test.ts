import { buildOsmMapHtml, zoomForDelta } from '../osmMapHtml';
const { runInNewContext } = jest.requireActual('node:vm');

test('zoomForDelta đổi độ rộng vùng nhìn sang mức zoom Leaflet, có chặn biên', () => {
  expect(zoomForDelta(0.1)).toBe(12);
  expect(zoomForDelta(0.02)).toBe(14);
  expect(zoomForDelta(100)).toBe(2);
  expect(zoomForDelta(0)).toBe(19);
  expect(zoomForDelta(1000)).toBe(1);
});

test('buildOsmMapHtml đặt tâm đúng thứ tự [lat, lng], đóng gói Leaflet không cần CDN và không đóng thẻ script sớm', () => {
  const html = buildOsmMapHtml({ lat: 37.5385, lng: 126.9715, zoom: 12, tileUrl: 'https://tile.example/{z}/{x}/{y}.png', maxZoom: 19 });

  // Seoul: lat ~37.5 phải đứng trước lng ~127 (đảo ngược là lỗi kinh điển).
  expect(html).toContain('.setView([37.5385, 126.9715], 12)');
  expect(html).not.toContain('https://unpkg.com');
  expect(html).toContain('Leaflet 1.9.4');
  expect(html).toContain('"https://tile.example/{z}/{x}/{y}.png"');
  expect(html).toContain('OpenStreetMap</a> contributors');
});

test('buildOsmMapHtml thoát "<" trong dữ liệu nhúng để URL ô không chèn được thẻ script', () => {
  const html = buildOsmMapHtml({ lat: 1, lng: 2, zoom: 3, tileUrl: 'https://x/</script><script>alert(1)</script>/{z}.png', maxZoom: 19 });

  expect(html).not.toContain('</script><script>alert(1)');
  expect(html).toContain('\\u003c/script>');
});

test('khung Leaflet chưa đủ: chờ ô tải thành công, báo lỗi nếu không có ô', () => {
  const messages: { type: string }[] = [];
  const events: Record<string, () => void> = {};
  const map = { setView() { return this; }, whenReady(callback: () => void) { callback(); }, invalidateSize: jest.fn() };
  const tiles = { on(event: string, callback: () => void) { events[event] = callback; }, addTo: jest.fn() };
  const html = buildOsmMapHtml({ lat: 1, lng: 2, zoom: 3, tileUrl: 'https://tiles/{z}/{x}/{y}', maxZoom: 19 });
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)![1];
  const L = { map: () => map, tileLayer: () => tiles, layerGroup: () => ({ addTo: () => ({}) }) };
  runInNewContext(script, { L, window: { L, addEventListener: jest.fn(), ReactNativeWebView: { postMessage: (raw: string) => messages.push(JSON.parse(raw)) } } });
  expect(messages).toEqual([{ type: 'initialized' }]);
  events.load();
  expect(messages.at(-1)).toEqual({ type: 'error' });
  events.tileload();
  expect(messages.at(-1)).toEqual({ type: 'ready' });
});
