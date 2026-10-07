import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Linking, Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { ChevronLeft, LocateFixed, Navigation, Phone, Search, Copy, BadgeCheck, WifiOff, Globe } from 'lucide-react-native';
import { IconTile, type Tone } from '@/components/ui/IconTile';
import { SimpleSheet } from '@/components/common/SimpleSheet';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { colors } from '@/lib/theme';
import { useCountry } from '@/lib/countryContext';
import { openPhone, openUrl } from '@/lib/openExternal';
import { fetchNearbyLocations, fetchSupportLocations } from '@/lib/data';
import { requestLocationWithExplanation } from '@/lib/locationPermission';
import type { SupportLocation } from '@/lib/data';
import { MAP_RADIUS_OPTIONS, MAP_LOCATION_LIMIT, searchLocations, validCoordinates, directionsUrl } from '@/features/sos/mapHelpers';
import { mapRuntime, MAP_STARTUP_TIMEOUT_MS } from '@/features/sos/mapRuntime';

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

const FILTERS: { key: 'all' | SupportLocation['type']; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'embassy', label: 'Đại sứ quán' },
  { key: 'hospital', label: 'Bệnh viện' },
  { key: 'police', label: 'Cảnh sát' },
  { key: 'pharmacy', label: 'Nhà thuốc' },
  { key: 'other', label: 'Khác' },
];

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
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>(useInitialFilter());
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsDenied, setGpsDenied] = useState(false);
  const [detail, setDetail] = useState<SupportLocation | null>(null);
  const [search, setSearch] = useState('');
  const [radiusKm, setRadiusKm] = useState<number>(20);
  const [locating, setLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapTimedOut, setMapTimedOut] = useState(false);
  const [mapAttempt, setMapAttempt] = useState(0);
  const [mapType, setMapType] = useState<'standard' | 'hybrid'>('standard');
  const [listOnly, setListOnly] = useState(false);
  const [previousCountry, setPreviousCountry] = useState(country?.code);
  const mapRef = useRef<MapView>(null);
  const mounted = useRef(true);
  const locatingRef = useRef(false);
  const runtime = mapRuntime(Platform.OS, Constants.executionEnvironment, Constants.expoConfig?.extra);
  const canRenderMap = runtime.available;

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
    try {
      const result = await requestLocationWithExplanation();
      if (!mounted.current) return;
      if (result && validCoordinates(result.latitude, result.longitude)) {
        setCoords({ lat: result.latitude, lng: result.longitude });
        setGpsDenied(false);
        mapRef.current?.animateToRegion({ latitude: result.latitude, longitude: result.longitude,
          latitudeDelta: 0.1, longitudeDelta: 0.1 }, 400);
      } else {
        setCoords(null);
        setGpsDenied(true);
      }
    } catch {
      if (mounted.current) { setCoords(null); setGpsDenied(true); }
    } finally {
      locatingRef.current = false;
      if (mounted.current) setLocating(false);
    }
  };

  const nearbyQuery = useQuery({
    queryKey: ['support-locations', 'nearby', country?.code, coords?.lat, coords?.lng, filter, radiusKm],
    queryFn: () => fetchNearbyLocations(coords!.lat, coords!.lng, { country: country?.code, type: filter === 'all' ? undefined : filter, radiusKm, limit: MAP_LOCATION_LIMIT }),
    enabled: Boolean(coords && country?.code),
  });

  const listQuery = useQuery({
    queryKey: ['support-locations', 'list', country?.code, filter],
    queryFn: () => fetchSupportLocations({ country: country?.code, type: filter === 'all' ? undefined : filter }),
    enabled: Boolean(!coords && country?.code),
  });

  const activeQuery = coords ? nearbyQuery : listQuery;
  const allLocations = activeQuery.data?.data ?? [];
  const locations = searchLocations(allLocations, search);
  const isOffline = activeQuery.data?.fromCache === true;

  const embassy = country?.embassy;
  const hasEmbassy = Boolean(embassy?.name && validCoordinates(embassy.lat, embassy.lng) &&
    (embassy.lat !== 0 || embassy.lng !== 0));
  const center = coords ?? (hasEmbassy ? { lat: embassy!.lat, lng: embassy!.lng } :
    allLocations[0] ? { lat: allLocations[0].lat, lng: allLocations[0].lng } : null);
  const latitude = center?.lat ?? 0;
  const longitude = center?.lng ?? 0;
  const delta = center ? 0.1 : 100;
  const region = { latitude, longitude, latitudeDelta: delta, longitudeDelta: delta };

  // initialRegion chỉ được native đọc một lần; GPS/API đến sau phải cập nhật camera.
  useEffect(() => {
    if (mapReady) mapRef.current?.animateToRegion({ latitude, longitude,
      latitudeDelta: delta, longitudeDelta: delta }, 400);
  }, [mapReady, latitude, longitude, delta, country?.code]);

  const call = (phone: string) => void openPhone(phone);
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
        {/* Google Maps khi native build có key; iOS chưa cấu hình dùng Apple Maps. */}
        <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={region}
          mapType={mapType} customMapStyle={mapType === 'standard' ? LIGHT_MAP_STYLE : []}
          provider={runtime.google ? PROVIDER_GOOGLE : undefined}
          onMapReady={() => setMapReady(true)} showsMyLocationButton={false}>
          {coords && <Marker coordinate={{ latitude: coords.lat, longitude: coords.lng }}
            title="Vị trí của bạn tại lần đo gần nhất" pinColor={colors.primary} />}
          {locations.map((loc) => (
            <Marker key={loc.id} coordinate={{ latitude: loc.lat, longitude: loc.lng }} title={loc.name} pinColor={markerColor(loc.type)} onPress={() => setDetail(loc)} />
          ))}
        </MapView>
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
            <TextInput className="ml-2.5 flex-1 text-base text-ink" placeholder="Tìm tên, địa chỉ, khu vực"
              accessibilityLabel="Tìm địa điểm hỗ trợ" value={search} onChangeText={setSearch}
              maxLength={160} placeholderTextColor={colors.subtle} />
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2.5">
          <View className="flex-row" style={{ gap: 8 }}>
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setFilter(f.key)}
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
        </ScrollView>
        <View className="mt-2 flex-row flex-wrap" style={{ gap: 8 }}>
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
            <Pressable accessibilityLabel="Chế độ vệ tinh" accessibilityState={{ selected: mapType === 'hybrid' }}
              onPress={() => setMapType((type) => type === 'standard' ? 'hybrid' : 'standard')}
              className={`rounded-full px-3 py-2 ${mapType === 'hybrid' ? 'bg-primary' : 'bg-surface'}`}>
              <Text className={mapType === 'hybrid' ? 'text-sm text-white' : 'text-sm text-primary'}>Vệ tinh</Text>
            </Pressable>
          </>}
          {canRenderMap && !listOnly && locations.length > 0 && <Pressable
            onPress={() => mapRef.current?.fitToCoordinates(locations.map((loc) => ({ latitude: loc.lat, longitude: loc.lng })),
              { edgePadding: { top: 220, right: 40, bottom: 340, left: 40 }, animated: true })}
            className="rounded-full bg-surface px-3 py-2">
            <Text className="text-sm text-primary">Xem các điểm</Text>
          </Pressable>}
          {coords && MAP_RADIUS_OPTIONS.map((radius) => <Pressable key={radius}
            accessibilityLabel={`Bán kính ${radius} km`} accessibilityState={{ selected: radiusKm === radius }}
            onPress={() => setRadiusKm(radius)} className={`rounded-full px-3 py-2 ${radiusKm === radius ? 'bg-primary' : 'bg-surface'}`}>
            <Text className={`text-sm ${radiusKm === radius ? 'text-white' : 'text-primary'}`}>{radius} km</Text>
          </Pressable>)}
        </View>
        {isOffline && (
          <View className="mt-2.5 flex-row items-center self-start rounded-full bg-amber-soft px-3 py-1.5" style={{ gap: 6 }}>
            <WifiOff size={14} color="#8A4B08" />
            <Text className="text-[13px] font-body-semibold" style={{ color: '#8A4B08' }}>
              Dữ liệu ngoại tuyến -- có thể cũ hoặc chưa đầy đủ
            </Text>
          </View>
        )}
      </View>

      {coords && canRenderMap && !listOnly && (
        <Pressable
          accessibilityLabel="Định vị lại"
          onPress={() => mapRef.current?.animateToRegion(region, 400)}
          className="absolute right-[18px] h-14 w-14 items-center justify-center rounded-lg bg-surface"
          style={{ bottom: 300, shadowColor: '#102A43', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}
        >
          <LocateFixed size={22} color={colors.primary} />
        </Pressable>
      )}

      <View className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-surface" style={{ maxHeight: 320, paddingBottom: insets.bottom + 16 }}>
        <View className="items-center py-2.5">
          <View className="h-[5px] w-11 rounded-full bg-[#D6DEEA]" />
        </View>
        <View className="flex-row items-center justify-between px-[18px]">
          <Text className="text-xl font-body-bold text-ink">
            {activeQuery.isLoading ? 'Đang tìm...' : `${locations.length} địa điểm`}
          </Text>
          <Text className="ml-2 flex-1 text-right text-sm text-muted">{gpsDenied ? 'GPS không khả dụng' : country?.name}</Text>
        </View>
        {!country && <Text className="mt-2 px-[18px] text-sm text-muted">Chưa tải được quốc gia. Quay lại SOS để thử lại.</Text>}
        {gpsDenied && <Text className="mt-2 px-[18px] text-sm text-muted">Xem theo quốc gia; gõ thành phố/khu vực để lọc. Kiểm tra quyền vị trí và GPS rồi thử lại.</Text>}
        {coords && <Text className="mt-2 px-[18px] text-xs text-muted">Khoảng cách đường chim bay từ lần đo gần nhất. Không có điểm trong {radiusKm} km sẽ mở rộng toàn quốc. Bấm Vị trí của tôi để cập nhật.</Text>}
        {activeQuery.isError && (
          <Pressable accessibilityLabel="Thử tải lại địa điểm" onPress={() => void activeQuery.refetch()}>
            <Text className="mt-2 px-[18px] text-sm text-danger">Không tải được danh sách. Chạm để thử lại.</Text>
          </Pressable>
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
          {!!country && !activeQuery.isLoading && !activeQuery.isError && locations.length === 0 && (
            <Text className="py-6 text-center text-sm text-muted">{search.trim() ? 'Không có địa điểm khớp tìm kiếm trong danh sách đã tải.' : 'Chưa có địa điểm hỗ trợ đã kiểm chứng cho khu vực này.'}</Text>
          )}
        </ScrollView>
      </View>

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
