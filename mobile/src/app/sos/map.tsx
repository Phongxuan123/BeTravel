import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Linking, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import MapView, { Marker } from 'react-native-maps';
import { ChevronLeft, LocateFixed, Navigation, Phone, Search, Copy, BadgeCheck, WifiOff, Globe } from 'lucide-react-native';
import { IconTile, type Tone } from '@/components/ui/IconTile';
import { SimpleSheet } from '@/components/common/SimpleSheet';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { colors } from '@/lib/theme';
import { useCountry } from '@/lib/countryContext';
import { fetchNearbyLocations, fetchSupportLocations } from '@/lib/data';
import { requestLocationWithExplanation } from '@/lib/locationPermission';
import type { SupportLocation } from '@/mocks/schemas';

const LIGHT_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#EAF1FE' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5A6B87' }] },
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
];

function markerColor(type: SupportLocation['type']): string {
  return { police: colors.danger, hospital: colors.success, embassy: colors.primary, pharmacy: colors.success, other: colors.warning }[type];
}

// Chi duong bang deep link mien phi (khong dung Places API, CLAUDE.md muc 10).
function openDirections(lat: number, lng: number, label: string) {
  const fallback = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const url =
    Platform.OS === 'ios' ? `maps://?daddr=${lat},${lng}&q=${encodeURIComponent(label)}` : `google.navigation:q=${lat},${lng}`;
  Linking.openURL(url).catch(() => Linking.openURL(fallback));
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
  const mapRef = useRef<MapView>(null);

  // Xin quyen vi tri ngay khi mo man hinh (da giai thich TRUOC qua Alert trong
  // requestLocationWithExplanation) -- tu choi van dung duoc qua danh sach
  // toan bo quoc gia (spec B6 muc 10, truong hop 1).
  useEffect(() => {
    let cancelled = false;
    requestLocationWithExplanation().then((result) => {
      if (cancelled) return;
      if (result) setCoords({ lat: result.latitude, lng: result.longitude });
      else setGpsDenied(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const nearbyQuery = useQuery({
    queryKey: ['support-locations', 'nearby', country?.code, coords?.lat, coords?.lng, filter],
    queryFn: () => fetchNearbyLocations(coords!.lat, coords!.lng, { country: country?.code, type: filter === 'all' ? undefined : filter }),
    enabled: Boolean(coords && country?.code),
  });

  const listQuery = useQuery({
    queryKey: ['support-locations', 'list', country?.code, filter],
    queryFn: () => fetchSupportLocations({ country: country?.code, type: filter === 'all' ? undefined : filter }),
    enabled: Boolean(gpsDenied && country?.code),
  });

  const activeQuery = coords ? nearbyQuery : listQuery;
  const locations = activeQuery.data?.data ?? [];
  const isOffline = activeQuery.data?.fromCache === true;

  const region = {
    latitude: coords?.lat ?? country?.embassy.lat ?? 35.68,
    longitude: coords?.lng ?? country?.embassy.lng ?? 139.69,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  };

  const call = (phone: string) => Linking.openURL(`tel:${phone}`);
  const copyAddress = async (address: string) => {
    await Clipboard.setStringAsync(address);
  };

  return (
    <View className="flex-1 bg-bg">
      <ErrorBoundary
        fallback={
          <View className="flex-1 items-center justify-center bg-bg px-8">
            <WifiOff size={40} color={colors.subtle} />
            <Text className="mt-3 text-center text-base font-body-bold text-ink">Không tải được bản đồ</Text>
            <Text className="mt-1 text-center text-sm text-muted">Dùng danh sách bên dưới thay thế.</Text>
          </View>
        }
      >
        {/* Khong truyen `provider` -- mac dinh la PROVIDER_DEFAULT (Apple Maps tren
            iOS, mien phi, khong can key; Google Maps tren Android). CLAUDE.md muc 10. */}
        <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={region} customMapStyle={LIGHT_MAP_STYLE}>
          {locations.map((loc) => (
            <Marker key={loc.id} coordinate={{ latitude: loc.lat, longitude: loc.lng }} title={loc.name} pinColor={markerColor(loc.type)} onPress={() => setDetail(loc)} />
          ))}
        </MapView>
      </ErrorBoundary>

      <View className="absolute inset-x-0" style={{ top: insets.top + 12, paddingHorizontal: 18 }}>
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <Pressable
            accessibilityLabel="Quay lại"
            onPress={() => router.back()}
            className="h-[52px] w-[52px] items-center justify-center rounded-lg bg-surface"
            style={{ shadowColor: '#0E1C33', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}
          >
            <ChevronLeft size={20} color={colors.ink} />
          </Pressable>
          <View
            className="h-[52px] flex-1 flex-row items-center rounded-lg bg-surface px-4"
            style={{ shadowColor: '#0E1C33', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}
          >
            <Search size={18} color={colors.subtle} />
            <TextInput className="ml-2.5 flex-1 text-base text-ink" placeholder="Tìm địa điểm hỗ trợ" placeholderTextColor={colors.subtle} />
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
                  style={{ shadowColor: '#0E1C33', shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 }}
                >
                  <Text className={`text-sm font-body-semibold ${active ? 'text-white' : 'text-ink'}`} numberOfLines={1}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        {isOffline && (
          <View className="mt-2.5 flex-row items-center self-start rounded-full bg-amber-soft px-3 py-1.5" style={{ gap: 6 }}>
            <WifiOff size={14} color="#8A4B08" />
            <Text className="text-[13px] font-body-semibold" style={{ color: '#8A4B08' }}>
              Dữ liệu ngoại tuyến -- có thể chưa cập nhật
            </Text>
          </View>
        )}
      </View>

      {coords && (
        <Pressable
          accessibilityLabel="Định vị lại"
          onPress={() => mapRef.current?.animateToRegion(region, 400)}
          className="absolute right-[18px] h-14 w-14 items-center justify-center rounded-lg bg-surface"
          style={{ bottom: 300, shadowColor: '#0E1C33', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}
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
          <Text className="text-sm text-muted">{gpsDenied ? 'Không có vị trí -- xem theo quốc gia' : country?.name}</Text>
        </View>
        {activeQuery.isError && (
          <Text className="mt-2 px-[18px] text-sm text-danger">Không tải được danh sách. Kiểm tra kết nối mạng.</Text>
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
                onPress={() => (loc.phone ? call(loc.phone) : openDirections(loc.lat, loc.lng, loc.name))}
                accessibilityLabel={loc.phone ? `Gọi ${loc.name}` : `Chỉ đường tới ${loc.name}`}
              >
                {loc.phone && loc.featured ? <Phone size={18} color="#fff" /> : <Navigation size={18} color={colors.primary} />}
              </Pressable>
            </Pressable>
          ))}
          {!activeQuery.isLoading && locations.length === 0 && (
            <Text className="py-6 text-center text-sm text-muted">Chưa có địa điểm hỗ trợ nào cho khu vực này.</Text>
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
            {detail.distanceKm !== undefined && (
              <Text className="text-sm text-muted">
                Cách bạn {detail.distanceKm < 1 ? `${Math.round(detail.distanceKm * 1000)} m` : `${detail.distanceKm.toFixed(1)} km`}
              </Text>
            )}
            {!!detail.website && (
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Globe size={16} color={colors.muted} />
                <Text className="flex-1 text-sm text-primary" numberOfLines={1} onPress={() => Linking.openURL(detail.website!)}>
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
