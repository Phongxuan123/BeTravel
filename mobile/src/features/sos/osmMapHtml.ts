// Trang HTML Leaflet + OpenStreetMap chạy trong WebView. Dùng khi ô bản đồ native không vẽ được
// (Expo Go Android, emulator thiếu Google Play Services). Chỉ phụ thuộc Internet, không cần key.
// Hàm thuần để kiểm thử được mà không cần WebView.

const LEAFLET_VERSION = '1.9.4';
// Khóa phiên bản + SRI để CDN không thể đổi mã chạy trong WebView (hash đối chiếu với tệp unpkg đã tải).
const LEAFLET_CSS_SRI = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
const LEAFLET_JS_SRI = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';

export type OsmMapOptions = { lat: number; lng: number; zoom: number; tileUrl: string; maxZoom: number };

// Zoom tương ứng với độ rộng vùng nhìn (độ) mà react-native-maps dùng: 0.1 --> 12, 0.02 --> 14, 100 --> 2.
export function zoomForDelta(latitudeDelta: number, maxZoom = 19): number {
  const raw = Math.round(Math.log2(360 / Math.max(latitudeDelta, 1e-6)));
  return Math.min(maxZoom, Math.max(1, raw));
}

// Giá trị nhúng vào <script> phải thoát "<" để dữ liệu không đóng thẻ script sớm.
const jsValue = (value: unknown): string => JSON.stringify(value).replace(/</g, '\\u003c');

export function buildOsmMapHtml({ lat, lng, zoom, tileUrl, maxZoom }: OsmMapOptions): string {
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<!-- Máy chủ ô OSM yêu cầu Referer nhận diện được ứng dụng; unsafe-url gửi đủ địa chỉ baseUrl. -->
<meta name="referrer" content="unsafe-url"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css" integrity="${LEAFLET_CSS_SRI}" crossorigin=""/>
<style>
  html, body, #map { height: 100%; margin: 0; background: #EAF4FF; }
  .leaflet-control-attribution { font-size: 10px; }
</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js" integrity="${LEAFLET_JS_SRI}" crossorigin=""></script>
<script>
(function () {
  var post = function (message) { window.ReactNativeWebView.postMessage(JSON.stringify(message)); };
  var map = L.map('map', { zoomControl: false }).setView([${jsValue(lat)}, ${jsValue(lng)}], ${jsValue(zoom)});
  L.tileLayer(${jsValue(tileUrl)}, {
    maxZoom: ${jsValue(maxZoom)},
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  var layer = L.layerGroup().addTo(map);

  // items: [{ id, lat, lng, color, kind }] -- chỉ dữ liệu cần để vẽ ghim, nhấn ghim gửi id về app.
  window.setMarkers = function (items) {
    layer.clearLayers();
    items.forEach(function (item) {
      var marker = L.circleMarker([item.lat, item.lng], {
        radius: item.kind === 'me' ? 9 : 12, color: '#FFFFFF', weight: 3,
        fillColor: item.color, fillOpacity: 1, dashArray: item.kind === 'external' ? '3 3' : null
      });
      if (item.kind !== 'me') marker.on('click', function () { post({ type: 'marker', id: item.id }); });
      marker.addTo(layer);
    });
  };
  window.flyTo = function (lat, lng, zoom) { map.flyTo([lat, lng], zoom, { duration: 0.4 }); };
  window.fitPoints = function (points, padding) {
    if (points.length) map.fitBounds(points, { padding: [padding, padding], maxZoom: 16 });
  };

  map.whenReady(function () { post({ type: 'ready' }); });
})();
</script>
</body></html>`;
}
