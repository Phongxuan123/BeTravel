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
