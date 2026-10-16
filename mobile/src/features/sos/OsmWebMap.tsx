import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type MapView from 'react-native-maps';
import { openUrl } from '@/lib/openExternal';
import { OSM_MAX_ZOOM, OSM_REFERER, OSM_TILE_URL } from './mapRuntime';
import { buildOsmMapHtml, zoomForDelta } from './osmMapHtml';

export type OsmMarker = { id: string; lat: number; lng: number; color: string; kind: 'me' | 'place' | 'external' };

// Cùng chữ ký với phần MapView native để màn hình dùng chung một ref cho cả hai chế độ.
export type MapHandle = Pick<MapView, 'animateToRegion' | 'fitToCoordinates'>;

type Props = {
  center: { lat: number; lng: number };
  delta: number;
  markers: OsmMarker[];
  onReady: () => void;
  onError: (message: string) => void;
  onMarkerPress: (id: string) => void;
};

const FIT_PADDING_PX = 48;

// Bản đồ OpenStreetMap bằng Leaflet trong WebView: không dùng thư viện bản đồ native nên chạy được cả khi
// Google Maps SDK không vẽ nổi ô (Expo Go Android). Trang chỉ nhận lệnh vẽ ghim/bay tới; mọi dữ liệu ghim
// do app gửi vào, trang không tự gọi API của Be.Travel.
export const OsmWebMap = forwardRef<MapHandle, Props>(function OsmWebMap(
  { center, delta, markers, onReady, onError, onMarkerPress },
  ref,
) {
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  // Chỉ dựng HTML một lần: đổi source sẽ nạp lại trang và mất vị trí bản đồ. Dịch chuyển sau đó đi qua flyTo.
  const [html] = useState(() =>
    buildOsmMapHtml({
      lat: center.lat,
      lng: center.lng,
      zoom: zoomForDelta(delta, OSM_MAX_ZOOM),
      tileUrl: OSM_TILE_URL,
      maxZoom: OSM_MAX_ZOOM,
    }),
  );

  const run = useCallback((script: string) => webRef.current?.injectJavaScript(`${script};true;`), []);

  useImperativeHandle(
    ref,
    () => ({
      animateToRegion: (region) =>
        run(`window.flyTo(${region.latitude},${region.longitude},${zoomForDelta(region.latitudeDelta, OSM_MAX_ZOOM)})`),
      fitToCoordinates: (coordinates = []) =>
        run(`window.fitPoints(${JSON.stringify(coordinates.map((c) => [c.latitude, c.longitude]))},${FIT_PADDING_PX})`),
    }),
    [run],
  );

  const markersJson = useMemo(() => JSON.stringify(markers), [markers]);
  useEffect(() => {
    if (ready) run(`window.setMarkers(${markersJson})`);
  }, [ready, markersJson, run]);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string; id?: unknown };
      if (message.type === 'initialized') {
        setReady(true);
      } else if (message.type === 'ready') {
        onReady();
      } else if (message.type === 'error') {
        onError('Không tải được nền bản đồ. Kiểm tra Internet hoặc thử lại.');
      } else if (message.type === 'marker' && typeof message.id === 'string') {
        onMarkerPress(message.id);
      }
    } catch {
      // Thông điệp chỉ do trang HTML của chính app gửi; bỏ qua nếu hỏng thay vì làm sập màn hình.
    }
  };

  return (
    <WebView
      ref={webRef}
      style={{ flex: 1 }}
      containerStyle={{ flex: 1 }}
      originWhitelist={['*']}
      javaScriptEnabled
      applicationNameForUserAgent="BeTravel/1.0"
      onError={() => onError('Không mở được bản đồ trên thiết bị. Hãy thử tải lại.')}
      onContentProcessDidTerminate={() => onError('Bản đồ bị hệ điều hành đóng. Hãy thử tải lại.')}
      onRenderProcessGone={() => onError('Bản đồ bị hệ điều hành đóng. Hãy thử tải lại.')}
      source={{ html, baseUrl: OSM_REFERER }}
      onMessage={onMessage}
      // Liên kết ghi công OSM mở ở trình duyệt ngoài, không điều hướng WebView ra khỏi bản đồ.
      onShouldStartLoadWithRequest={(request) => {
        const isOwnPage = request.url === OSM_REFERER || request.url.startsWith('about:');
        if (isOwnPage) return true;
        if (request.navigationType === 'click' && request.url.startsWith('https://')) void openUrl(request.url);
        return false;
      }}
      scrollEnabled={false}
      overScrollMode="never"
      setSupportMultipleWindows={false}
      domStorageEnabled
    />
  );
});
