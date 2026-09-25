import { useEffect, useRef } from 'react';
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
  const { isGuest } = useAuth();
  const { countryCode } = useCountry();
  const queryClient = useQueryClient();
  const lastPolledAt = useRef(0);

  const preferencesQuery = useQuery({ queryKey: ['preferences'], queryFn: fetchPreferences, enabled: !isGuest });
  const locationConsent = preferencesQuery.data?.data.locationConsent ?? true;

  const poll = async (force = false) => {
    if (!countryCode) return;
    const now = Date.now();
    if (!force && now - lastPolledAt.current < MIN_POLL_INTERVAL_MS) return;
    lastPolledAt.current = now;

    let coords: { lat: number; lng: number } | undefined;
    if (locationConsent) {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.status === 'granted') {
          const position = await Location.getLastKnownPositionAsync();
          if (position) coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        }
      } catch {
        // Khong lay duoc vi tri -- tiep tuc voi CHI canh bao cap quoc gia.
      }
    }

    setAlertsContext({ countryCode, lat: coords?.lat, lng: coords?.lng });
    queryClient.invalidateQueries({ queryKey: ['alerts'] });
  };

  useEffect(() => {
    poll(true);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') poll();
    });
    const heartbeat = setInterval(() => poll(), MIN_POLL_INTERVAL_MS);
    return () => {
      subscription.remove();
      clearInterval(heartbeat);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode, locationConsent]);

  const alertsQuery = useQuery({ queryKey: ['alerts'], queryFn: fetchAlerts, enabled: Boolean(countryCode) && !isGuest });
  return { alerts: alertsQuery.data?.data ?? [] };
}
