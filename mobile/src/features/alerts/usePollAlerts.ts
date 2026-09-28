import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useCountry } from '@/lib/countryContext';
import { useAuth } from '@/lib/auth';
import { fetchAlerts, fetchPreferences, setAlertsContext } from '@/lib/data';

const MIN_POLL_INTERVAL_MS = 5 * 60 * 1000;

/*
 * Goi lai canh bao vi tri khi: app active, doi quoc gia, hoac dinh ky (bat
 * dong nghia voi "vi tri thay doi dang ke" -- moi lan dinh ky deu doc lai vi
 * tri hien tai, khong watchPosition lien tuc de tiet kiem pin/quota, xem
 * docs/PROGRESS.md "Quyet dinh phat sinh (B8)"). Toi thieu 5 phut/lan
 * (MIN_POLL_INTERVAL_MS) -- KHONG poll lien tuc (CLAUDE.md B8 muc 5).
 *
 * CHI doc vi tri neu preferences.locationConsent=true VA quyen he thong da
 * duoc cap tu truoc -- khong tu y xin quyen o day (muc 8: "ton trong quyen he
 * thong"), cung khong ep nguoi dung phai bat GPS moi nhan duoc canh bao (tu
 * choi GPS van nhan canh bao cap quoc gia qua setAlertsContext khong co lat/lng).
 */
export function usePollAlerts() {
  const { isGuest, user } = useAuth();
  const { countryCode } = useCountry();
  const queryClient = useQueryClient();
  const owner = user?.email ?? null;
  const preferencesQuery = useQuery({ queryKey: ['preferences'], queryFn: fetchPreferences, enabled: !isGuest });
  // Chưa tải được lựa chọn của người dùng thì chưa đọc GPS.
  const locationConsent = preferencesQuery.data?.data.locationConsent === true;
  const safetyEnabled = preferencesQuery.data?.data.alerts.safety !== false;

  useEffect(() => {
    let cancelled = false;
    let lastPolledAt = 0;
    setAlertsContext(isGuest ? null : { countryCode, owner });
    if (isGuest || !countryCode) return;

    const poll = async (force = false) => {
      if (AppState.currentState !== 'active') return;
      const now = Date.now();
      if (!force && now - lastPolledAt < MIN_POLL_INTERVAL_MS) return;
      lastPolledAt = now;
      let coords: { lat: number; lng: number } | undefined;
      if (locationConsent) {
        try {
          const permission = await Location.getForegroundPermissionsAsync();
          if (cancelled) return;
          if (permission.status === 'granted') {
            const position = await Location.getLastKnownPositionAsync({ maxAge: MIN_POLL_INTERVAL_MS });
            if (position) coords = { lat: position.coords.latitude, lng: position.coords.longitude };
          }
        } catch {
          // Không lấy được GPS thì vẫn tra cảnh báo cấp quốc gia.
        }
      }
      // Bỏ kết quả GPS của phiên/quốc gia/đồng ý đã thay đổi trong lúc chờ.
      if (cancelled) return;
      const latestPreferences = queryClient.getQueryData<Awaited<ReturnType<typeof fetchPreferences>>>(['preferences']);
      if (latestPreferences?.data.locationConsent !== true) coords = undefined;
      setAlertsContext({ countryCode, owner, lat: coords?.lat, lng: coords?.lng });
      await queryClient.invalidateQueries({ queryKey: ['alerts'] });
    };

    void poll(true);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void poll();
    });
    const heartbeat = setInterval(() => void poll(), MIN_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      subscription.remove();
      clearInterval(heartbeat);
    };
  }, [countryCode, locationConsent, isGuest, owner, queryClient]);

  const alertsQuery = useQuery({ queryKey: ['alerts'], queryFn: fetchAlerts, enabled: Boolean(countryCode) && !isGuest });
  return { alerts: !isGuest && safetyEnabled ? alertsQuery.data?.data ?? [] : [] };
}
