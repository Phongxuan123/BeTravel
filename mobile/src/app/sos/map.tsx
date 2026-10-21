import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Linking, Platform, Alert, Keyboard } from 'react-native';
import Constants from 'expo-constants';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { ChevronLeft, LocateFixed, Navigation, Phone, Search, Copy, BadgeCheck, WifiOff, Globe, MapPin, X } from 'lucide-react-native';
import { IconTile, type Tone } from '@/components/ui/IconTile';
import { SimpleSheet } from '@/components/common/SimpleSheet';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { colors } from '@/lib/theme';
import { useCountry } from '@/lib/countryContext';
import { openPhone, openUrl } from '@/lib/openExternal';
import { fetchExternalPlaces, fetchNearbyLocations, fetchSupportLocations, searchPlaces } from '@/lib/data';
import {
  LOCATION_FAILURE_MESSAGES,
  MAP_LOCATION_POLICY,
  requestLocationDetailed,
  type LocationFailure,
} from '@/lib/locationPermission';
import type { PlaceSearchResult, SupportLocation } from '@/lib/data';
import { MAP_RADIUS_OPTIONS, MAP_LOCATION_LIMIT, searchLocations, validCoordinates, directionsUrl } from '@/features/sos/mapHelpers';
import { mapRuntime, mapTiles, MAP_STARTUP_TIMEOUT_MS } from '@/features/sos/mapRuntime';
import { OsmWebMap, type MapHandle, type OsmMarker } from '@/features/sos/OsmWebMap';
import { useDebouncedValue } from '@/features/sos/useDebouncedValue';

const LIGHT_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#EAF4FF' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6B7280' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#DCE8FB' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

const TYPE_LABEL: Record<SupportLocation['type'], string> = {
  police: 'Cảnh sát',
  hospital: 'Bệnh viện',
  embassy: 'Đại sứ quán',
  pharmacy: 'Nhà thuốc',
  other: 'Khác',
};

const TYPE_TONE: Record<SupportLocation['type'], Tone> = {
  police: 'red',
  hospital: 'green',
  embassy: 'blue',
  pharmacy: 'green',
  other: 'orange',
};

// Nhãn nguồn của lớp địa điểm bổ sung (khớp `source` backend trả về).
const EXTERNAL_SOURCE_LABEL: Record<string, string> = { google_maps: 'Google Maps', openstreetmap: 'OpenStreetMap' };

const FILTERS: { key: 'all' | SupportLocation['type']; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'embassy', label: 'Đại sứ quán' },
  { key: 'hospital', label: 'Bệnh viện' },
  { key: 'police', label: 'Cảnh sát' },
  { key: 'pharmacy', label: 'Nhà thuốc' },
  { key: 'other', label: 'Khác' },
];

// Chỉ gọi tìm địa điểm khi đã gõ đủ ký tự và ngừng gõ một lúc (nhà cung cấp giới hạn 1 yêu cầu/giây).
const PLACE_SEARCH_MIN_CHARS = 3;
const PLACE_SEARCH_DEBOUNCE_MS = 500;
const PLACE_SEARCH_STALE_MS = 10 * 60_000;
const PLACE_FOCUS_DELTA = 0.02;
const LONG_PRESS_FOCUS_DELTA = 0.05;
// GPS đo cách đây quá lâu thì nút định vị đo lại thay vì chỉ đưa camera về chỗ cũ.
const GPS_RECENT_MS = 30_000;
// Quá ngưỡng này thì ghi rõ giờ đo trong chú thích để người dùng biết vị trí không còn mới.
const GPS_STALE_NOTICE_MS = 2 * 60_000;
const PICKED_COLOR = '#E11D48';

const DECLINED_MESSAGE = 'Bạn đã chọn để sau. Bấm "Vị trí của tôi" khi muốn dùng GPS.';

function formatMeasuredTime(timestamp: number): string {
  const time = new Date(timestamp);
  return `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
}

const isRecentFix = (measuredAt: number | null): boolean =>
  measuredAt !== null && Date.now() - measuredAt <= GPS_RECENT_MS;

// Chú thích giờ đo chỉ khi vị trí đã cũ; vị trí mới đo thì không cần nhắc.
const staleFixNotice = (measuredAt: number | null): string =>
  measuredAt !== null && Date.now() - measuredAt > GPS_STALE_NOTICE_MS ? ` (đo lúc ${formatMeasuredTime(measuredAt)})` : '';

function markerColor(type: SupportLocation['type']): string {
  return { police: colors.danger, hospital: colors.success, embassy: colors.primary, pharmacy: colors.success, other: colors.warning }[type];
}

// Chi duong bang deep link mien phi (khong dung Places API, CLAUDE.md muc 10).
function openDirections(lat: number, lng: number, label: string) {
  const fallback = directionsUrl(lat, lng);
  const url =
    Platform.OS === 'ios' ? `maps://?daddr=${lat},${lng}&q=${encodeURIComponent(label)}` : `google.navigation:q=${lat},${lng}`;
  Linking.openURL(url).catch(() => void openUrl(fallback));
}

// CTA "Tìm đồn gần nhất" tu man hinh xu ly su co (B7) mo thang man hinh nay
// da loc san theo loai diem, vd /sos/map?type=police.
function useInitialFilter(): (typeof FILTERS)[number]['key'] {
  const params = useLocalSearchParams<{ type?: string }>();
  const match = FILTERS.find((f) => f.key === params.type);
  return match?.key ?? 'all';
}

export default function SosMapScreen() {
  const insets = useSafeAreaInsets();
  const { country } = useCountry();
  const initialFilter = useInitialFilter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>(initialFilter);
  // Danh sách phía dưới chỉ hiện khi người dùng chủ động (chọn bộ lọc, tìm địa điểm, định vị); mở từ CTA có sẵn loại (?type=) thì mở luôn.
  const [sheetOpen, setSheetOpen] = useState(initialFilter !== 'all');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsFailure, setGpsFailure] = useState<LocationFailure | null>(null);
  const [measuredAt, setMeasuredAt] = useState<number | null>(null);
  // Điểm do người dùng chọn (kết quả tìm kiếm hoặc giữ lâu trên bản đồ): thay GPS khi máy không có GPS.
  const [picked, setPicked] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [detail, setDetail] = useState<SupportLocation | null>(null);
  const [search, setSearch] = useState('');
  const [radiusKm, setRadiusKm] = useState<number>(20);
  const [locating, setLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapTimedOut, setMapTimedOut] = useState(false);
  const [mapAttempt, setMapAttempt] = useState(0);
  const [mapType, setMapType] = useState<'standard' | 'hybrid'>('standard');
  const [listOnly, setListOnly] = useState(false);
  const [showExternal, setShowExternal] = useState(false);
  const [previousCountry, setPreviousCountry] = useState(country?.code);
  // Một ref cho cả hai chế độ: MapView native và OsmWebMap (Leaflet) cùng có animateToRegion/fitToCoordinates.
  const mapRef = useRef<MapHandle>(null);
  const mounted = useRef(true);
  const locatingRef = useRef(false);
  const runtime = mapRuntime(Platform.OS, Constants.executionEnvironment, Constants.expoConfig?.extra);
  const osmTiles = mapTiles(Platform.OS, Constants.executionEnvironment, process.env.EXPO_PUBLIC_MAP_TILES) === 'osm';
  // Chế độ OSM (WebView) không cần key Google nên luôn vẽ được bản đồ khi có Internet.
  const canRenderMap = osmTiles || runtime.available;
  // Bắt buộc hiện khi danh sách là nội dung duy nhất (chế độ danh sách, không vẽ được bản đồ) hoặc có lỗi cần người dùng thấy (thiếu quốc gia).
  const showSheet = sheetOpen || listOnly || !canRenderMap || !country;

  useEffect(() => {
    if (!canRenderMap || listOnly || mapReady || mapTimedOut) return;
    const timer = setTimeout(() => { setMapTimedOut(true); setListOnly(true); }, MAP_STARTUP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [canRenderMap, listOnly, mapReady, mapTimedOut, mapAttempt]);

  const restartMap = () => {
    setMapReady(false);
    setMapTimedOut(false);
    setListOnly(false);
    setMapAttempt((attempt) => attempt + 1);
  };

  // Tải danh sách ngay; GPS chỉ chạy khi người dùng chủ động chọn định vị.
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Reset trước khi render quốc gia mới để sheet không hiện liên hệ của nước cũ.
  if (previousCountry !== country?.code) {
    setPreviousCountry(country?.code);
    setDetail(null);
    setSearch('');
  }

  const locate = async () => {
    if (locatingRef.current) return;
    locatingRef.current = true;
    setLocating(true);
    // Kết quả (hoặc lý do GPS thất bại) hiện trong danh sách nên mở ngay.
    setSheetOpen(true);
    try {
      const result = await requestLocationDetailed(MAP_LOCATION_POLICY);
      if (!mounted.current) return;
      if (result.coords && validCoordinates(result.coords.latitude, result.coords.longitude)) {
        setCoords({ lat: result.coords.latitude, lng: result.coords.longitude });
        setMeasuredAt(result.measuredAt);
        setGpsFailure(null);
        // Người dùng đã chọn dùng GPS: bỏ điểm chọn tay để kết quả tính theo vị trí thật.
        setPicked(null);
        mapRef.current?.animateToRegion({ latitude: result.coords.latitude, longitude: result.coords.longitude,
          latitudeDelta: 0.1, longitudeDelta: 0.1 }, 400);
      } else {
        setCoords(null);
        setMeasuredAt(null);
        setGpsFailure(result.failure ?? 'unavailable');
      }
    } catch {
      if (mounted.current) { setCoords(null); setMeasuredAt(null); setGpsFailure('unavailable'); }
    } finally {
      locatingRef.current = false;
      if (mounted.current) setLocating(false);
    }
  };

  // Nút định vị nổi: chưa có vị trí hoặc vị trí đã cũ thì đo lại; còn mới thì chỉ đưa camera về chỗ người dùng.
  const onLocatePress = () => {
    if (coords && isRecentFix(measuredAt)) {
      mapRef.current?.animateToRegion({ latitude: coords.lat, longitude: coords.lng,
        latitudeDelta: 0.1, longitudeDelta: 0.1 }, 400);
    } else {
      void locate();
    }
  };

  // Chọn vị trí: từ kết quả tìm kiếm hoặc giữ lâu trên bản đồ. Danh sách bên dưới tính quanh điểm này.
  const pickPoint = (point: { lat: number; lng: number; label: string }, delta = PLACE_FOCUS_DELTA) => {
    if (!validCoordinates(point.lat, point.lng)) return;
    setPicked(point);
    setSheetOpen(true);
    setDetail(null);
    mapRef.current?.animateToRegion({ latitude: point.lat, longitude: point.lng,
      latitudeDelta: delta, longitudeDelta: delta }, 400);
  };

  const choosePlace = (place: PlaceSearchResult) => {
    pickPoint({ lat: place.lat, lng: place.lng, label: place.name });
    // Xóa chữ tìm để danh sách điểm hỗ trợ không bị lọc mất khi chuyển sang xem quanh nơi vừa chọn.
    setSearch('');
    setSearchPanelOpen(false);
    Keyboard.dismiss();
  };

  const onSearchChange = (text: string) => {
    setSearch(text);
    setSearchPanelOpen(text.trim().length >= 2);
  };

  // Tâm tính khoảng cách: điểm người dùng chọn (tìm kiếm/giữ lâu) ưu tiên hơn GPS vì đó là nơi họ đang muốn xem.
  const origin = picked ?? coords;

  const nearbyQuery = useQuery({
    queryKey: ['support-locations', 'nearby', country?.code, origin?.lat, origin?.lng, filter, radiusKm],
    queryFn: () => fetchNearbyLocations(origin!.lat, origin!.lng, { country: country?.code, type: filter === 'all' ? undefined : filter, radiusKm, limit: MAP_LOCATION_LIMIT }),
    enabled: Boolean(origin && country?.code),
  });

  const listQuery = useQuery({
    queryKey: ['support-locations', 'list', country?.code, filter],
    queryFn: () => fetchSupportLocations({ country: country?.code, type: filter === 'all' ? undefined : filter }),
    enabled: Boolean(!origin && country?.code),
  });

  const activeQuery = origin ? nearbyQuery : listQuery;
  const allLocations = activeQuery.data?.data ?? [];
  const locations = searchLocations(allLocations, search);
  const isOffline = activeQuery.data?.fromCache === true;

  // Tìm địa điểm theo chữ (OpenStreetMap): khác với ô lọc danh sách điểm hỗ trợ đã xác minh bên dưới.
  const debouncedSearch = useDebouncedValue(search.trim(), PLACE_SEARCH_DEBOUNCE_MS);
  const canSearchPlaces = searchPanelOpen && debouncedSearch.length >= PLACE_SEARCH_MIN_CHARS;
  const placesQuery = useQuery({
    queryKey: ['places', 'search', country?.code, debouncedSearch],
    queryFn: () => searchPlaces(debouncedSearch, country?.code),
    enabled: canSearchPlaces,
    staleTime: PLACE_SEARCH_STALE_MS,
    // Mỗi lần gọi tốn lượt của nhà cung cấp: người dùng bấm thử lại khi cần.
    retry: false,
  });
  const isTypingPending = search.trim() !== debouncedSearch;
  const foundPlaces = placesQuery.data?.data ?? [];

  const embassy = country?.embassy;
  const hasEmbassy = Boolean(embassy?.name && validCoordinates(embassy.lat, embassy.lng) &&
    (embassy.lat !== 0 || embassy.lng !== 0));
  const center = origin ?? (hasEmbassy ? { lat: embassy!.lat, lng: embassy!.lng } :
    allLocations[0] ? { lat: allLocations[0].lat, lng: allLocations[0].lng } : null);
  const latitude = center?.lat ?? 0;
  const longitude = center?.lng ?? 0;
  const delta = center ? 0.1 : 100;
  const region = { latitude, longitude, latitudeDelta: delta, longitudeDelta: delta };

  // Lớp gợi ý thêm (chưa xác minh) chỉ chạy khi người dùng bật và đang lọc 1 loại cụ thể. Có tâm (GPS hoặc
  // toạ độ đại sứ quán) thì tìm quanh tâm; riêng Đại sứ quán luôn tìm theo quốc gia được chọn.
  const externalType = filter === 'all' || filter === 'other' ? null : filter;
  const externalByCountry = externalType === 'embassy' && !!country?.code;
  const canQueryExternal = Boolean(externalType && (center || externalByCountry));
  const externalQuery = useQuery({
    queryKey: ['support-locations', 'external', externalByCountry ? null : center?.lat, externalByCountry ? null : center?.lng, externalByCountry ? country?.code : null, externalType],
    queryFn: () => fetchExternalPlaces(externalByCountry
      ? { type: 'embassy', country: country!.code }
      : { type: externalType!, lat: center!.lat, lng: center!.lng }),
    enabled: showExternal && canQueryExternal,
    staleTime: 10 * 60 * 1000,
    // Mỗi lần gọi tốn quota/tải của nhà cung cấp: không tự thử lại.
    retry: false,
  });
  // Không áp ô tìm kiếm cho lớp gợi ý: tên/địa chỉ OSM thường bằng tiếng Việt hoặc tiếng bản địa nên gõ "seoul"
  // sẽ lọc mất hết. Ô tìm kiếm chỉ dành cho danh sách đã xác minh.
  const externalPlaces = showExternal && externalType ? externalQuery.data?.data ?? [] : [];
  // Ghim cho chế độ OSM (WebView): chỉ gửi dữ liệu tối thiểu, tên/chi tiết vẫn nằm ở app.
  const osmMarkers: OsmMarker[] = [
    ...(coords ? [{ id: 'me', lat: coords.lat, lng: coords.lng, color: colors.primary, kind: 'me' as const }] : []),
    ...(picked ? [{ id: 'picked', lat: picked.lat, lng: picked.lng, color: PICKED_COLOR, kind: 'picked' as const }] : []),
    ...locations.map((loc) => ({ id: loc.id, lat: loc.lat, lng: loc.lng, color: markerColor(loc.type), kind: 'place' as const })),
    ...externalPlaces.map((place) => ({ id: place.id, lat: place.lat, lng: place.lng, color: colors.muted, kind: 'external' as const })),
  ];

  // initialRegion chỉ được native đọc một lần; GPS/API đến sau phải cập nhật camera.
  useEffect(() => {
    if (mapReady) mapRef.current?.animateToRegion({ latitude, longitude,
      latitudeDelta: delta, longitudeDelta: delta }, 400);
  }, [mapReady, latitude, longitude, delta, country?.code]);

  // Đại sứ quán theo nước được chọn, kể cả GPS đang ở nước khác: đưa các ghim vào vùng nhìn.
  const externalKey = externalPlaces.map((place) => place.id).join('|');
  useEffect(() => {
    if ((!externalByCountry && center) || !mapReady || externalPlaces.length === 0) return;
    mapRef.current?.fitToCoordinates(externalPlaces.map((place) => ({ latitude: place.lat, longitude: place.lng })),
      { edgePadding: { top: 220, right: 40, bottom: 340, left: 40 }, animated: true });
    // externalPlaces đổi identity mỗi render; externalKey là chữ ký ổn định của danh sách.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalByCountry, center?.lat, center?.lng, mapReady, externalKey]);

  const call = (phone: string) => void openPhone(phone);
  const policeNumber = country?.emergencyNumbers?.police ?? '';
  const showEmptyState = !!country && !activeQuery.isLoading && !activeQuery.isError && locations.length === 0;
  const copyAddress = async (address: string) => {
    try {
      await Clipboard.setStringAsync(address);
      Alert.alert('Đã sao chép', 'Bạn có thể gửi địa chỉ hoặc đưa cho tài xế xem.');
    } catch { Alert.alert('Không sao chép được', 'Vui lòng thử lại.'); }
  };

  return (
    <View className="flex-1 bg-bg">
      {canRenderMap && !listOnly ? <ErrorBoundary key={mapAttempt}
        fallback={
          <View className="flex-1 items-center justify-center bg-bg px-8">
            <WifiOff size={40} color={colors.subtle} />
            <Text className="mt-3 text-center text-base font-body-bold text-ink">Không tải được bản đồ</Text>
            <Text className="mt-1 text-center text-sm text-muted">Dùng danh sách bên dưới thay thế.</Text>
            <Pressable onPress={() => setListOnly(true)} className="mt-3 rounded-md bg-primary px-4 py-3">
              <Text className="text-white">Xem danh sách hỗ trợ</Text>
            </Pressable>
          </View>
        }
      >
        {osmTiles ? (
          <OsmWebMap ref={mapRef} center={{ lat: latitude, lng: longitude }} delta={delta}
            markers={osmMarkers} onReady={() => setMapReady(true)}
            onLongPress={(point) => pickPoint({ ...point, label: 'Vị trí đã chọn' }, LONG_PRESS_FOCUS_DELTA)}
            onMarkerPress={(id) => setDetail([...locations, ...externalPlaces].find((place) => place.id === id) ?? null)} />
        ) : (
          /* Google Maps khi native build có key; iOS chưa cấu hình dùng Apple Maps. */
          <MapView ref={mapRef as React.RefObject<MapView>} style={{ flex: 1 }} initialRegion={region}
            mapType={mapType} customMapStyle={mapType === 'standard' ? LIGHT_MAP_STYLE : []}
            provider={runtime.google ? PROVIDER_GOOGLE : undefined}
            onMapReady={() => setMapReady(true)} showsMyLocationButton={false}
            onLongPress={(event) => pickPoint({ lat: event.nativeEvent.coordinate.latitude,
              lng: event.nativeEvent.coordinate.longitude, label: 'Vị trí đã chọn' }, LONG_PRESS_FOCUS_DELTA)}>
            {picked && <Marker coordinate={{ latitude: picked.lat, longitude: picked.lng }}
              title={picked.label} pinColor={PICKED_COLOR} />}
            {coords && <Marker coordinate={{ latitude: coords.lat, longitude: coords.lng }}
              title="Vị trí của bạn tại lần đo gần nhất" pinColor={colors.primary} />}
            {locations.map((loc) => (
              <Marker key={loc.id} coordinate={{ latitude: loc.lat, longitude: loc.lng }} title={loc.name} pinColor={markerColor(loc.type)} onPress={() => setDetail(loc)} />
            ))}
            {externalPlaces.map((place) => (
              <Marker key={place.id} coordinate={{ latitude: place.lat, longitude: place.lng }}
                title={`${place.name} (chưa xác minh)`} pinColor={colors.muted} onPress={() => setDetail(place)} />
            ))}
          </MapView>
        )}
      </ErrorBoundary> : <View className="flex-1 items-center justify-center px-8">
        <Globe size={40} color={colors.subtle} />
        <Text className="mt-3 text-center text-base text-ink">
          {mapTimedOut ? 'Bản đồ chưa khởi tạo được' : listOnly ? 'Đang xem danh sách hỗ trợ' : 'Bản đồ chưa được cấu hình trên thiết bị này'}
        </Text>
        <Text className="mt-2 text-center text-sm text-muted">Bạn vẫn có thể tìm địa điểm, gọi và mở chỉ đường từ danh sách.</Text>
        <Pressable className="mt-3 rounded-md bg-primary px-4 py-3" onPress={() => void openUrl(
          center ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}` : 'https://www.google.com/maps')}>
          <Text className="font-body-bold text-white">Mở Google Maps</Text>
        </Pressable>
      </View>}

      <View className="absolute inset-x-0" style={{ top: insets.top + 12, paddingHorizontal: 18 }}>
        {canRenderMap && !listOnly && !mapReady && <View accessibilityRole="progressbar" className="mb-2 self-center rounded-full bg-surface px-3 py-2">
          <Text className="text-sm text-muted">Đang khởi tạo bản đồ...</Text>
        </View>}
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <Pressable
            accessibilityLabel="Quay lại"
            onPress={() => router.back()}
            className="h-[52px] w-[52px] items-center justify-center rounded-lg bg-surface"
            style={{ shadowColor: '#102A43', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}
          >
            <ChevronLeft size={20} color={colors.ink} />
          </Pressable>
          <View
            className="h-[52px] flex-1 flex-row items-center rounded-lg bg-surface px-4"
            style={{ shadowColor: '#102A43', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}
          >
            <Search size={18} color={colors.subtle} />
            <TextInput className="ml-2.5 flex-1 text-base text-ink" placeholder="Tìm địa điểm, địa chỉ, khu vực"
              accessibilityLabel="Tìm địa điểm hỗ trợ" value={search} onChangeText={onSearchChange}
              returnKeyType="search" onSubmitEditing={() => setSearchPanelOpen(search.trim().length >= 2)}
              maxLength={160} placeholderTextColor={colors.subtle} />
            {search.length > 0 && (
              <Pressable accessibilityLabel="Xóa chữ tìm kiếm" hitSlop={10}
                onPress={() => { setSearch(''); setSearchPanelOpen(false); }}>
                <X size={18} color={colors.subtle} />
              </Pressable>
            )}
          </View>
        </View>
        {searchPanelOpen && (
          <View testID="place-search-panel" className="mt-2 max-h-[300px] rounded-lg bg-surface py-1"
            style={{ shadowColor: '#102A43', shadowOpacity: 0.12, shadowRadius: 10, elevation: 4 }}>
            <View className="flex-row items-center justify-between px-4 py-2">
              <Text className="text-xs font-body-bold uppercase tracking-wider text-muted">Địa điểm trên bản đồ</Text>
              <Pressable accessibilityLabel="Đóng kết quả tìm kiếm" hitSlop={10} onPress={() => setSearchPanelOpen(false)}>
                <X size={16} color={colors.muted} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {search.trim().length < PLACE_SEARCH_MIN_CHARS && (
                <Text className="px-4 pb-3 text-sm text-muted">Gõ ít nhất {PLACE_SEARCH_MIN_CHARS} ký tự để tìm địa điểm.</Text>
              )}
              {canSearchPlaces && (isTypingPending || placesQuery.isLoading) && (
                <Text className="px-4 pb-3 text-sm text-muted">Đang tìm địa điểm...</Text>
              )}
              {canSearchPlaces && !isTypingPending && placesQuery.isError && (
                <Pressable accessibilityLabel="Thử tìm lại địa điểm" onPress={() => void placesQuery.refetch()}>
                  <Text className="px-4 pb-3 text-sm text-danger">
                    Chưa tìm được địa điểm lúc này. Chạm để thử lại, hoặc giữ lâu trên bản đồ để chọn vị trí.
                  </Text>
                </Pressable>
              )}
              {canSearchPlaces && !isTypingPending && !placesQuery.isLoading && !placesQuery.isError && foundPlaces.length === 0 && (
                <Text className="px-4 pb-3 text-sm text-muted">Không tìm thấy địa điểm nào khớp.</Text>
              )}
              {!isTypingPending && placesQuery.data?.scope === 'global' && country?.name && foundPlaces.length > 0 && (
                <Text className="px-4 pb-2 text-xs text-warning-strong">
                  Không có kết quả trong {country.name}, đang hiện kết quả toàn cầu.
                </Text>
              )}
              {!isTypingPending && foundPlaces.map((place) => (
                <Pressable key={place.id} accessibilityLabel={`Đến ${place.name}`} onPress={() => choosePlace(place)}
                  className="flex-row items-center px-4 py-2.5" style={{ gap: 10 }}>
                  <MapPin size={18} color={colors.primary} />
                  <View className="flex-1">
                    <Text className="text-[15px] font-body-bold text-ink" numberOfLines={1}>{place.name}</Text>
                    <Text className="text-xs text-muted" numberOfLines={1}>{place.address}</Text>
                  </View>
                </Pressable>
              ))}
              <Text className="px-4 pb-2 pt-1 text-[11px] text-subtle">Kết quả từ OpenStreetMap, chưa được Be.Travel xác minh.</Text>
            </ScrollView>
          </View>
        )}
        {!searchPanelOpen && <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2.5">
          <View className="flex-row" style={{ gap: 8 }}>
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => { setFilter(f.key); setSheetOpen(f.key !== 'all'); }}
                  className={`h-9 items-center justify-center rounded-full px-3.5 ${active ? 'bg-primary' : 'bg-surface'}`}
                  style={{ shadowColor: '#102A43', shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 }}
                >
                  <Text className={`text-sm font-body-semibold ${active ? 'text-white' : 'text-ink'}`} numberOfLines={1}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>}
        {!searchPanelOpen && <View className="mt-2 flex-row flex-wrap" style={{ gap: 8 }}>
          <Pressable accessibilityLabel="Lấy vị trí hiện tại" disabled={locating} onPress={() => void locate()}
            className="rounded-full bg-surface px-3 py-2">
            <Text className="text-sm text-primary">{locating ? 'Đang định vị...' : 'Vị trí của tôi'}</Text>
          </Pressable>
          {canRenderMap && <Pressable onPress={() => listOnly ? restartMap() : setListOnly(true)} className="rounded-full bg-surface px-3 py-2">
            <Text className="text-sm text-primary">{listOnly ? mapTimedOut ? 'Thử tải lại bản đồ' : 'Xem bản đồ' : 'Xem danh sách'}</Text>
          </Pressable>}
          {canRenderMap && !listOnly && <>
            <Pressable accessibilityLabel="Đưa bản đồ về tâm" disabled={!mapReady}
              onPress={() => mapRef.current?.animateToRegion(region, 400)} className="rounded-full bg-surface px-3 py-2">
              <Text className="text-sm text-primary">Về tâm bản đồ</Text>
            </Pressable>
            {!osmTiles && <Pressable accessibilityLabel="Chế độ vệ tinh" accessibilityState={{ selected: mapType === 'hybrid' }}
              onPress={() => setMapType((type) => type === 'standard' ? 'hybrid' : 'standard')}
              className={`rounded-full px-3 py-2 ${mapType === 'hybrid' ? 'bg-primary' : 'bg-surface'}`}>
              <Text className={mapType === 'hybrid' ? 'text-sm text-white' : 'text-sm text-primary'}>Vệ tinh</Text>
            </Pressable>}
          </>}
          {canRenderMap && !listOnly && locations.length > 0 && <Pressable
            onPress={() => mapRef.current?.fitToCoordinates(locations.map((loc) => ({ latitude: loc.lat, longitude: loc.lng })),
              { edgePadding: { top: 220, right: 40, bottom: 340, left: 40 }, animated: true })}
            className="rounded-full bg-surface px-3 py-2">
            <Text className="text-sm text-primary">Xem các điểm</Text>
          </Pressable>}
          {canQueryExternal && <Pressable accessibilityLabel="Hiện gợi ý thêm chưa xác minh"
            accessibilityState={{ selected: showExternal }} onPress={() => setShowExternal((value) => !value)}
            className={`rounded-full px-3 py-2 ${showExternal ? 'bg-primary' : 'bg-surface'}`}>
            <Text className={showExternal ? 'text-sm text-white' : 'text-sm text-primary'}>Gợi ý thêm (chưa xác minh)</Text>
          </Pressable>}
          {origin && MAP_RADIUS_OPTIONS.map((radius) => <Pressable key={radius}
            accessibilityLabel={`Bán kính ${radius} km`} accessibilityState={{ selected: radiusKm === radius }}
            onPress={() => setRadiusKm(radius)} className={`rounded-full px-3 py-2 ${radiusKm === radius ? 'bg-primary' : 'bg-surface'}`}>
            <Text className={`text-sm ${radiusKm === radius ? 'text-white' : 'text-primary'}`}>{radius} km</Text>
          </Pressable>)}
        </View>}
        {picked && !searchPanelOpen && (
          <View testID="picked-point-chip" className="mt-2.5 flex-row items-center self-start rounded-full bg-surface px-3 py-1.5"
            style={{ gap: 6, shadowColor: '#102A43', shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 }}>
            <MapPin size={14} color={PICKED_COLOR} />
            <Text className="max-w-[220px] text-[13px] font-body-semibold text-ink" numberOfLines={1}>
              Đang xem quanh: {picked.label}
            </Text>
            <Pressable accessibilityLabel="Bỏ điểm đã chọn" hitSlop={10} onPress={() => setPicked(null)}>
              <X size={14} color={colors.muted} />
            </Pressable>
          </View>
        )}
        {isOffline && (
          <View className="mt-2.5 flex-row items-center self-start rounded-full bg-amber-soft px-3 py-1.5" style={{ gap: 6 }}>
            <WifiOff size={14} color="#8A4B08" />
            <Text className="text-[13px] font-body-semibold" style={{ color: '#8A4B08' }}>
              Dữ liệu ngoại tuyến -- có thể cũ hoặc chưa đầy đủ
            </Text>
          </View>
        )}
      </View>

      {canRenderMap && !listOnly && (
        <Pressable
          accessibilityLabel={coords ? 'Định vị lại' : 'Định vị tôi'}
          disabled={locating}
          onPress={onLocatePress}
          className="absolute right-[18px] h-14 w-14 items-center justify-center rounded-lg bg-surface"
          style={{ bottom: showSheet ? 300 : insets.bottom + 84, shadowColor: '#102A43', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}
        >
          <LocateFixed size={22} color={locating ? colors.subtle : colors.primary} />
        </Pressable>
      )}

      {!showSheet && (
        <View pointerEvents="box-none" className="absolute inset-x-0 items-center" style={{ bottom: insets.bottom + 16 }}>
          <Pressable accessibilityLabel="Mở danh sách địa điểm" onPress={() => setSheetOpen(true)}
            className="rounded-full bg-surface px-4 py-3"
            style={{ shadowColor: '#102A43', shadowOpacity: 0.15, shadowRadius: 10, elevation: 4 }}>
            <Text className={`text-sm font-body-bold ${activeQuery.isError ? 'text-danger' : 'text-ink'}`}>
              {activeQuery.isError ? 'Không tải được danh sách. Chạm để mở'
                : activeQuery.isLoading ? 'Đang tìm...' : `${locations.length} địa điểm đã xác minh · Xem danh sách`}
            </Text>
          </Pressable>
        </View>
      )}

      {showSheet && <View className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-surface" style={{ maxHeight: 320, paddingBottom: insets.bottom + 16 }}>
        {listOnly ? (
          <View className="items-center py-2.5">
            <View className="h-[5px] w-11 rounded-full bg-[#D6DEEA]" />
          </View>
        ) : (
          // Chạm vào thanh kéo cũng đóng được danh sách (người dùng không có thao tác vuốt xuống).
          <Pressable accessibilityLabel="Đóng danh sách" onPress={() => setSheetOpen(false)} className="items-center py-3">
            <View className="h-[5px] w-11 rounded-full bg-[#D6DEEA]" />
          </Pressable>
        )}
        <View className="flex-row items-center justify-between px-[18px]">
          <Text className="text-xl font-body-bold text-ink">
            {activeQuery.isLoading ? 'Đang tìm...' : `${locations.length} địa điểm đã xác minh`}
          </Text>
          <Text className="ml-2 flex-1 text-right text-sm text-muted">{gpsFailure ? 'GPS không khả dụng' : country?.name}</Text>
          {!listOnly && (
            <Pressable accessibilityLabel="Đóng danh sách địa điểm" hitSlop={10} onPress={() => setSheetOpen(false)}
              className="ml-3 h-9 w-9 items-center justify-center rounded-full bg-primary-soft">
              <X size={18} color={colors.ink} />
            </Pressable>
          )}
        </View>
        {showExternal && canQueryExternal && !externalQuery.isLoading && !externalQuery.isError && (
          <Text className="px-[18px] text-sm text-warning-strong">+ {externalPlaces.length} gợi ý thêm (chưa xác minh)</Text>
        )}
        {!country && <Text className="mt-2 px-[18px] text-sm text-muted">Chưa tải được quốc gia. Quay lại SOS để thử lại.</Text>}
        {gpsFailure && (
          <View className="mt-2 px-[18px]" style={{ gap: 6 }}>
            <Text className="text-sm text-muted">
              {gpsFailure === 'declined' ? DECLINED_MESSAGE : LOCATION_FAILURE_MESSAGES[gpsFailure]}
            </Text>
            {(gpsFailure === 'denied' || gpsFailure === 'services-off') && (
              <Pressable accessibilityLabel="Mở cài đặt vị trí" onPress={() => void Linking.openSettings()}>
                <Text className="text-sm font-body-bold text-primary">Mở Cài đặt</Text>
              </Pressable>
            )}
            <Text className="text-sm text-muted">
              Bạn vẫn xem được theo quốc gia, gõ tên nơi cần tìm ở ô phía trên, hoặc giữ lâu trên bản đồ để chọn vị trí.
            </Text>
          </View>
        )}
        {origin && (
          <Text className="mt-2 px-[18px] text-xs text-muted">
            {picked ? `Khoảng cách đường chim bay từ ${picked.label}.` : 'Khoảng cách đường chim bay từ lần đo gần nhất'}
            {picked ? '' : staleFixNotice(measuredAt)}
            {` Không có điểm trong ${radiusKm} km sẽ mở rộng toàn quốc.`}
            {picked ? '' : ' Bấm Vị trí của tôi để cập nhật.'}
          </Text>
        )}
        {activeQuery.isError && (
          <Pressable accessibilityLabel="Thử tải lại địa điểm" onPress={() => void activeQuery.refetch()}>
            <Text className="mt-2 px-[18px] text-sm text-danger">Không tải được danh sách. Chạm để thử lại.</Text>
          </Pressable>
        )}
        {/* Đặt ngoài ScrollView: khi danh sách rỗng, ScrollView trong sheet maxHeight co về 0 và
            cắt mất thông báo (lỗi B08). Luôn chừa lối gọi số khẩn cấp khi chưa có điểm nào. */}
        {showEmptyState && (
          <View className="mt-3 px-[18px]" style={{ gap: 10 }}>
            <Text className="text-center text-sm text-muted">{search.trim() ? 'Không có địa điểm khớp tìm kiếm trong danh sách đã tải.' : 'Chưa có địa điểm hỗ trợ đã kiểm chứng cho khu vực này.'}</Text>
            {!!policeNumber && (
              <Pressable accessibilityLabel={`Gọi cảnh sát ${policeNumber}`} onPress={() => call(policeNumber)}
                className="h-12 flex-row items-center justify-center rounded-lg bg-danger" style={{ gap: 8 }}>
                <Phone size={18} color="#fff" />
                <Text className="font-body-bold text-white">Gọi cảnh sát {policeNumber}</Text>
              </Pressable>
            )}
          </View>
        )}
        <ScrollView className="mt-3" contentContainerStyle={{ paddingHorizontal: 18, gap: 10 }}>
          {locations.map((loc) => (
            <Pressable
              key={loc.id}
              accessibilityLabel={`Xem chi tiết ${loc.name}`}
              onPress={() => {
                setDetail(loc);
                mapRef.current?.animateToRegion({ latitude: loc.lat, longitude: loc.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 400);
              }}
              className={`min-h-[72px] flex-row items-center rounded-lg px-3 py-2 ${loc.featured ? 'border border-danger-line bg-danger-tint' : 'border border-line bg-surface'}`}
            >
              <IconTile tone={TYPE_TONE[loc.type]} size={48}>
                <Text className="text-xs font-body-bold" style={{ color: colors.ink }}>
                  {TYPE_LABEL[loc.type][0]}
                </Text>
              </IconTile>
              <View className="ml-3 flex-1">
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <Text className="text-[17px] font-body-bold text-ink" numberOfLines={1}>
                    {loc.name}
                  </Text>
                  {loc.verified && <BadgeCheck size={16} color={colors.success} />}
                </View>
                <Text className="text-sm text-muted" numberOfLines={1}>
                  {loc.meta}
                </Text>
              </View>
              <Pressable
                className={`h-11 w-11 items-center justify-center rounded-md ${loc.featured ? 'bg-danger' : 'bg-primary-soft'}`}
                onPress={(event) => { event.stopPropagation(); if (loc.phone) call(loc.phone); else openDirections(loc.lat, loc.lng, loc.name); }}
                accessibilityLabel={loc.phone ? `Gọi ${loc.name}` : `Chỉ đường tới ${loc.name}`}
              >
                {loc.phone ? <Phone size={18} color={loc.featured ? '#fff' : colors.primary} /> : <Navigation size={18} color={colors.primary} />}
              </Pressable>
            </Pressable>
          ))}
          {showExternal && canQueryExternal && (
            <View style={{ gap: 10 }}>
              <Text className="mt-1 text-xs font-body-bold text-warning-strong">
                Gợi ý từ nguồn mở bên ngoài, CHƯA được Be.Travel xác minh. Hãy gọi hoặc kiểm tra lại trước khi đến.
              </Text>
              {externalQuery.isLoading && <Text className="text-sm text-muted">Đang tìm gợi ý...</Text>}
              {externalQuery.isError && <Pressable accessibilityLabel="Thử tải lại gợi ý" onPress={() => void externalQuery.refetch()}>
                <Text className="text-sm text-danger">Nguồn địa điểm chưa phản hồi. Chạm để thử lại; chưa thể kết luận không có đại sứ quán hoặc địa điểm.</Text>
              </Pressable>}
              {!externalQuery.isLoading && !externalQuery.isError && externalPlaces.length === 0 && (
                <Text className="text-sm text-muted">Không có gợi ý nào gần đây.</Text>
              )}
              {externalPlaces.map((place) => (
                <Pressable key={place.id} accessibilityLabel={`Xem chi tiết ${place.name} (chưa xác minh)`}
                  onPress={() => {
                    setDetail(place);
                    mapRef.current?.animateToRegion({ latitude: place.lat, longitude: place.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 400);
                  }}
                  className="min-h-[64px] flex-row items-center rounded-lg border border-dashed border-line bg-surface px-3 py-2">
                  <View className="flex-1">
                    <Text className="text-[16px] font-body-bold text-ink" numberOfLines={1}>{place.name}</Text>
                    <Text className="text-sm text-muted" numberOfLines={1}>{place.meta}</Text>
                    <Text className="text-xs text-warning-strong">Chưa xác minh</Text>
                  </View>
                  <Pressable className="h-11 w-11 items-center justify-center rounded-md bg-primary-soft"
                    onPress={(event) => { event.stopPropagation(); if (place.phone) call(place.phone); else openDirections(place.lat, place.lng, place.name); }}
                    accessibilityLabel={place.phone ? `Gọi ${place.name}` : `Chỉ đường tới ${place.name}`}>
                    {place.phone ? <Phone size={18} color={colors.primary} /> : <Navigation size={18} color={colors.primary} />}
                  </Pressable>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </View>}

      <SimpleSheet visible={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? ''}>
        {detail && (
          <View style={{ gap: 12 }}>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <IconTile tone={TYPE_TONE[detail.type]}>
                <Text className="text-xs font-body-bold text-ink">{TYPE_LABEL[detail.type][0]}</Text>
              </IconTile>
              <View className="flex-1">
                <Text className="text-base font-body-bold text-ink">{detail.name}</Text>
                {!!detail.nameLocal && <Text className="text-sm text-muted">{detail.nameLocal}</Text>}
              </View>
              {detail.verified && (
                <View className="flex-row items-center rounded-full bg-primary-soft px-2.5 py-1" style={{ gap: 4 }}>
                  <BadgeCheck size={14} color={colors.primary} />
                  <Text className="text-xs font-body-semibold text-primary-strong">Đã kiểm chứng</Text>
                </View>
              )}
            </View>

            {!!detail.source && (
              <Text className="rounded-md bg-amber-soft p-2.5 text-xs text-warning-strong">
                Nguồn {EXTERNAL_SOURCE_LABEL[detail.source] ?? detail.source}, chưa được Be.Travel xác minh. Hãy gọi hoặc kiểm tra lại trước khi đến.
              </Text>
            )}
            {!!detail.address && (
              <Pressable className="flex-row items-start" style={{ gap: 8 }} onPress={() => copyAddress(detail.address!)}>
                <Copy size={16} color={colors.muted} style={{ marginTop: 2 }} />
                <Text className="flex-1 text-sm text-ink">{detail.address}</Text>
              </Pressable>
            )}
            {!!detail.openHours && <Text className="text-sm text-muted">Giờ mở cửa: {detail.openHours}</Text>}
            {!!detail.verifiedAt && <Text className="text-sm text-muted">Ngày kiểm chứng: {detail.verifiedAt.slice(0, 10)}</Text>}
            {detail.distanceKm !== undefined && (
              <Text className="text-sm text-muted">
                Cách bạn {detail.distanceKm < 1 ? `${Math.round(detail.distanceKm * 1000)} m` : `${detail.distanceKm.toFixed(1)} km`}
              </Text>
            )}
            {!!detail.website && (
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Globe size={16} color={colors.muted} />
                <Text className="flex-1 text-sm text-primary" numberOfLines={1} onPress={() => void openUrl(detail.website!)}>
                  {detail.website}
                </Text>
              </View>
            )}

            <View className="mt-1 flex-row" style={{ gap: 10 }}>
              {!!detail.phone && (
                <Pressable className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-md bg-primary" onPress={() => call(detail.phone!)}>
                  <Phone size={18} color="#fff" />
                  <Text className="font-body-bold text-white">Gọi ngay</Text>
                </Pressable>
              )}
              <Pressable
                className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-md border border-line bg-surface"
                onPress={() => openDirections(detail.lat, detail.lng, detail.name)}
              >
                <Navigation size={18} color={colors.ink} />
                <Text className="font-body-semibold text-ink">Chỉ đường</Text>
              </Pressable>
            </View>
          </View>
        )}
      </SimpleSheet>
    </View>
  );
}
