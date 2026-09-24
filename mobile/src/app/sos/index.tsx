import { View, Text, ScrollView, Pressable, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { ChevronLeft, MapPin, Phone, Plus, Flame, Waves, Navigation, Share2, Sun } from 'lucide-react-native';
import { AppShell, APP_SHELL_CONTENT_BOTTOM_PADDING } from '@/components/common/AppShell';
import { IconButton } from '@/components/ui/IconButton';
import { IconTile } from '@/components/ui/IconTile';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { CountryFlag } from '@/components/brand/CountryFlag';
import { colors } from '@/lib/theme';
import { useCountry } from '@/lib/countryContext';
import { requestLocationWithExplanation } from '@/lib/locationPermission';
import { haversineKm } from '@/lib/geo';
import { useState } from 'react';

export default function SosHubScreen() {
  const insets = useSafeAreaInsets();
  const { country } = useCountry();
  const [currentCity, setCurrentCity] = useState('');
  const [embassyDistanceKm, setEmbassyDistanceKm] = useState<number | null>(null);
  const [locatingGps, setLocatingGps] = useState(false);

  if (!country) return null;

  const hasEmbassyCoordinates = Number.isFinite(country.embassy.lat) &&
    Number.isFinite(country.embassy.lng) && (country.embassy.lat !== 0 || country.embassy.lng !== 0);
  const embassyQuery = hasEmbassyCoordinates
    ? `${country.embassy.lat},${country.embassy.lng}` : country.embassy.address;
  const openLink = (url: string) => Linking.openURL(url).catch(() =>
    Alert.alert('Không mở được ứng dụng', 'Vui lòng thử lại hoặc gọi trực tiếp số hiển thị.'));

  const updateLocation = async () => {
    setLocatingGps(true);
    try {
      const coords = await requestLocationWithExplanation();
      if (!coords) return;

      if (hasEmbassyCoordinates) {
        setEmbassyDistanceKm(haversineKm(coords.latitude, coords.longitude, country.embassy.lat, country.embassy.lng));
      }

      const [place] = await Location.reverseGeocodeAsync({ latitude: coords.latitude, longitude: coords.longitude });
      const city = place?.city || place?.subregion || place?.region;
      if (city) setCurrentCity(city);
    } catch {
      Alert.alert('Chưa xác định được vị trí', 'Bạn vẫn có thể gọi hỗ trợ hoặc xem bản đồ theo quốc gia.');
    } finally {
      setLocatingGps(false);
    }
  };

  return (
    <AppShell active="sos">
      <ScrollView contentContainerStyle={{ paddingBottom: APP_SHELL_CONTENT_BOTTOM_PADDING }}>
        <View className="bg-danger-tint px-[18px] pb-5" style={{ paddingTop: insets.top + 12 }}>
          <View className="flex-row items-center justify-between">
            <IconButton accessibilityLabel="Quay lại" variant="outline" icon={<ChevronLeft size={20} color={colors.ink} />} onPress={() => router.back()} />
            <Text className="font-display text-ink" style={{ fontSize: 22 }}>
              Hỗ trợ khẩn cấp
            </Text>
            <IconButton
              accessibilityLabel="Tăng tương phản màn hình"
              variant="outline"
              icon={<Sun size={18} color={colors.ink} />}
              onPress={() => router.push({ pathname: '/coming-soon', params: { title: 'Tăng tương phản' } })}
            />
          </View>

          <View className="mt-4 h-[52px] flex-row items-center rounded-lg bg-surface px-3.5" style={{ gap: 8 }}>
            <MapPin size={18} color={colors.danger} />
            <Text className="flex-1 text-base font-body-semibold text-ink" numberOfLines={1}>
              {currentCity || country.currentCity || 'Chưa xác định vị trí'}
            </Text>
            <Pressable onPress={updateLocation} disabled={locatingGps}>
              <Text className="font-body-bold text-primary">{locatingGps ? 'Đang tìm...' : 'Cập nhật'}</Text>
            </Pressable>
          </View>
        </View>

        <View className="px-[18px]">
          <View className="mt-5 rounded-xl bg-danger p-[18px]" style={{ shadowColor: 'rgba(214,40,40,1)', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}>
            <Text className="text-xs font-body-bold text-white/80">SỐ KHẨN CẤP TẠI {country.name.toUpperCase()}</Text>
            <Text className="mt-1 font-display text-white" style={{ fontSize: 26 }}>
              Cảnh sát · {country.emergencyNumbers.police}
            </Text>
            <Pressable
              className="mt-4 h-[58px] flex-row items-center justify-center gap-2 rounded-lg bg-white"
              disabled={!country.emergencyNumbers.police} onPress={() => openLink(`tel:${country.emergencyNumbers.police}`)}
              accessibilityLabel={`Gọi cảnh sát số ${country.emergencyNumbers.police}`}
            >
              <Phone size={20} color={colors.danger} />
              <Text className="text-[22px] font-body-bold text-danger">Gọi ngay {country.emergencyNumbers.police}</Text>
            </Pressable>
            <Text className="mt-2 text-center text-[13px] text-white/85">Cuộc gọi miễn phí, kể cả khi hết dữ liệu di động</Text>
          </View>

          <View className="mt-4 flex-row" style={{ gap: 10 }}>
            <ServiceTile label="Cứu thương" number={country.emergencyNumbers.ambulance} tone="red" icon={<Plus size={18} color={colors.danger} />} />
            <ServiceTile label="Cứu hoả" number={country.emergencyNumbers.fire} tone="orange" icon={<Flame size={18} color={colors.warning} />} />
            <ServiceTile label="Cứu hộ biển" number={country.emergencyNumbers.marine} tone="blue" icon={<Waves size={18} color={colors.primary} />} />
          </View>

          <View className="mt-4 rounded-lg border border-line bg-surface p-4">
            <View className="flex-row items-center">
              <CountryFlag code="VN" width={44} height={30} />
              <Text className="ml-3 flex-1 text-lg font-body-bold text-ink">{country.embassy.name}</Text>
            </View>
            <Text className="mt-2 text-sm text-muted">{country.embassy.address}</Text>
            <View className="mt-2 flex-row items-center" style={{ gap: 8 }}>
              <Badge label="Gọi để xác nhận giờ mở cửa" tone="neutral" />
              {embassyDistanceKm !== null && (
                <Text className="text-sm text-muted">
                  Cách bạn {embassyDistanceKm < 1 ? `${Math.round(embassyDistanceKm * 1000)} m` : `${embassyDistanceKm.toFixed(1)} km`}
                </Text>
              )}
            </View>
            <View className="mt-3 flex-row" style={{ gap: 10 }}>
              <Pressable className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-md bg-primary" disabled={!country.embassy.phone} onPress={() => openLink(`tel:${country.embassy.phone}`)}>
                <Phone size={18} color="#fff" />
                <Text className="font-body-bold text-white">Gọi ngay</Text>
              </Pressable>
              <Pressable
                className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-md border border-line bg-surface"
                disabled={!embassyQuery} onPress={() => openLink(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(embassyQuery)}`)}
              >
                <MapPin size={18} color={colors.ink} />
                <Text className="font-body-semibold text-ink">Chỉ đường</Text>
              </Pressable>
            </View>
          </View>

          <View className="mt-4 flex-row items-center gap-3 rounded-lg border border-line bg-surface p-4">
            <IconTile tone="blue">
              <Share2 size={20} color={colors.primary} />
            </IconTile>
            <View className="flex-1">
              <Text className="text-base font-body-bold text-ink">Chia sẻ vị trí với người thân</Text>
              <Text className="text-[13px] text-muted">Tính năng đang phát triển</Text>
            </View>
            <Switch value={false} onValueChange={() => router.push({ pathname: '/coming-soon', params: { title: 'Chia sẻ vị trí' } })} accessibilityLabel="Chia sẻ vị trí với người thân" />
          </View>

          <View className="mt-6">
            <Text className="mb-3 text-base font-body-bold text-ink">Địa điểm hỗ trợ gần bạn</Text>
            <Pressable onPress={() => router.push('/sos/map')} className="h-[120px] items-center justify-center rounded-lg bg-primary-soft">
              <Navigation size={28} color={colors.primary} />
              <Text className="mt-1 text-sm font-body-semibold text-primary-strong">Mở bản đồ hỗ trợ</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </AppShell>
  );
}

function ServiceTile({ label, number, tone, icon }: { label: string; number: string; tone: 'red' | 'orange' | 'blue'; icon: React.ReactNode }) {
  const textColor = tone === 'red' ? colors.danger : tone === 'orange' ? colors.warning : colors.primary;
  return (
    <Pressable disabled={!number} onPress={() => Linking.openURL(`tel:${number}`).catch(() => Alert.alert('Không gọi được', `Vui lòng gọi trực tiếp số ${number}.`))} className="h-[104px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface">
      <IconTile tone={tone} size={36}>
        {icon}
      </IconTile>
      <Text className="text-[14px] font-body-bold text-ink">{label}</Text>
      <Text className="text-base font-body-bold" style={{ color: textColor }}>
        {number || 'Chưa có số'}
      </Text>
    </Pressable>
  );
}
