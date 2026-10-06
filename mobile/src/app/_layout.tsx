import '../styles/global.css';

import { useCallback, useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts as usePlusJakartaFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  useFonts as useJetBrainsMonoFonts,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { AuthProvider } from '@/lib/auth';
import { CountryProvider } from '@/lib/countryContext';
import { AppGate } from '@/components/common/AppGate';

// Expo Router boc moi route con bang Error Boundary nay (INV-13.3).
export { RouteErrorFallback as ErrorBoundary } from '@/components/common/RouteErrorFallback';

SplashScreen.preventAutoHideAsync().catch(() => {
  // đã ẩn splash trước đó — bỏ qua
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const [plusJakartaLoaded, plusJakartaError] = usePlusJakartaFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [monoLoaded, monoError] = useJetBrainsMonoFonts({
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  const fontsLoaded = (plusJakartaLoaded || Boolean(plusJakartaError)) && (monoLoaded || Boolean(monoError));

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <CountryProvider>
              <AppGate>
                <Stack screenOptions={{ headerShown: false }} />
              </AppGate>
            </CountryProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
