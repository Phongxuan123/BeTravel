import { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Linking } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { ChevronLeft, LocateFixed, Navigation, Phone, Search } from 'lucide-react-native';
import { IconTile, type Tone } from '@/components/ui/IconTile';
import { colors } from '@/lib/theme';
import { useCountry } from '@/lib/countryContext';
import { fetchSupportLocations } from '@/lib/data';
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
  other: 'Khác',
};

const TYPE_TONE: Record<SupportLocation['type'], Tone> = {
  police: 'red',
  hospital: 'green',
  embassy: 'blue',
  other: 'orange',
};

const FILTERS: { key: 'all' | SupportLocation['type']; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'embassy', label: 'Đại sứ quán' },
  { key: 'hospital', label: 'Bệnh viện' },
  { key: 'police', label: 'Cảnh sát' },
];

export default function SosMapScreen() {
  const insets = useSafeAreaInsets();
  const { country } = useCountry();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');
  const locationsQuery = useQuery({ queryKey: ['support-locations'], queryFn: fetchSupportLocations });
  const locations = (locationsQuery.data?.data ?? []).filter((l) => filter === 'all' || l.type === filter);

  const region = {
    latitude: country?.embassy.lat ?? 35.68,
    longitude: country?.embassy.lng ?? 139.69,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  };

  return (
    <View className="flex-1 bg-bg">
      <MapView style={{ flex: 1 }} initialRegion={region} customMapStyle={LIGHT_MAP_STYLE}>
        {locations.map((loc) => (
          <Marker key={loc.id} coordinate={{ latitude: loc.lat, longitude: loc.lng }} title={loc.name} pinColor={markerColor(loc.type)} />
        ))}
      </MapView>

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
      </View>

      <Pressable
        accessibilityLabel="Định vị lại"
        className="absolute right-[18px] h-14 w-14 items-center justify-center rounded-lg bg-surface"
        style={{ bottom: 300, shadowColor: '#0E1C33', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}
      >
        <LocateFixed size={22} color={colors.primary} />
      </Pressable>

      <View className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-surface" style={{ maxHeight: 320, paddingBottom: insets.bottom + 16 }}>
        <View className="items-center py-2.5">
          <View className="h-[5px] w-11 rounded-full bg-[#D6DEEA]" />
        </View>
        <View className="flex-row items-center justify-between px-[18px]">
          <Text className="text-xl font-body-bold text-ink">{locations.length} địa điểm gần bạn</Text>
          <Text className="text-sm text-muted">{country?.currentCity}</Text>
        </View>
        <ScrollView className="mt-3" contentContainerStyle={{ paddingHorizontal: 18, gap: 10 }}>
          {locations.map((loc) => (
            <Pressable
              key={loc.id}
              className={`h-[72px] flex-row items-center rounded-lg px-3 ${loc.featured ? 'border border-danger-line bg-danger-tint' : 'border border-line bg-surface'}`}
            >
              <IconTile tone={TYPE_TONE[loc.type]} size={48}>
                <Text className="text-xs font-body-bold" style={{ color: colors.ink }}>
                  {TYPE_LABEL[loc.type][0]}
                </Text>
              </IconTile>
              <View className="ml-3 flex-1">
                <Text className="text-[17px] font-body-bold text-ink" numberOfLines={1}>
                  {loc.name}
                </Text>
                <Text className="text-sm text-muted" numberOfLines={1}>
                  {loc.meta}
                </Text>
              </View>
              <Pressable
                className={`h-13 w-13 items-center justify-center rounded-md ${loc.featured ? 'bg-danger' : 'bg-primary-soft'}`}
                style={{ width: 44, height: 44 }}
                onPress={() => (loc.phone ? Linking.openURL(`tel:${loc.phone}`) : Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`))}
                accessibilityLabel={loc.phone ? `Gọi ${loc.name}` : `Chỉ đường tới ${loc.name}`}
              >
                {loc.phone && loc.featured ? <Phone size={18} color="#fff" /> : <Navigation size={18} color={colors.primary} />}
              </Pressable>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function markerColor(type: SupportLocation['type']): string {
  return { police: colors.danger, hospital: colors.success, embassy: colors.primary, other: colors.warning }[type];
}
