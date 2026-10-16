// Trang HTML Leaflet + OpenStreetMap chạy trong WebView. Dùng khi ô bản đồ native không vẽ được
// (Expo Go Android, emulator thiếu Google Play Services). Chỉ phụ thuộc Internet, không cần key.
// Hàm thuần để kiểm thử được mà không cần WebView.

import { leafletScript, leafletStyles } from './vendor/leafletAssets';

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
<style>${leafletStyles}</style>
<script>window.addEventListener('error', function () { window.ReactNativeWebView.postMessage(JSON.stringify({type: 'error'})); });</script>
<style>
  html, body, #map { height: 100%; margin: 0; background: #EAF4FF; }
  .leaflet-control-attribution { font-size: 10px; }
</style>
</head><body>
<div id="map"></div>
<script>${leafletScript}</script>
<script>
(function () {
  var post = function (message) { window.ReactNativeWebView.postMessage(JSON.stringify(message)); };
  if (!window.L) { post({ type: 'error' }); return; }
  var map = L.map('map', { zoomControl: false }).setView([${jsValue(lat)}, ${jsValue(lng)}], ${jsValue(zoom)});
  var tiles = L.tileLayer(${jsValue(tileUrl)}, {
    maxZoom: ${jsValue(maxZoom)},
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });
  var hasTiles = false;
  tiles.on('tileload', function () {
    if (!hasTiles) { hasTiles = true; post({ type: 'ready' }); }
  });
  tiles.on('load', function () { if (!hasTiles) post({ type: 'error' }); });
  tiles.addTo(map);
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

  map.whenReady(function () { map.invalidateSize(); post({ type: 'initialized' }); });
  window.addEventListener('resize', function () { map.invalidateSize(); });
})();
</script>
</body></html>`;
}
