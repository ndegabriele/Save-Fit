import * as ScreenOrientation from 'expo-screen-orientation';
import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { ShareIntentProvider } from 'expo-share-intent';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { HeroUINativeProvider } from 'heroui-native';
import { useEffect } from 'react';
import { Dimensions, Platform, StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Uniwind } from 'uniwind';
import '../../global.css';
import { preloadAudio } from '@/lib/feedback';
import { ImportRunner } from '@/lib/import-runner';
import { IS_EXPO_GO, ShareIntentHandler } from '@/lib/share-intent';
import { useStore } from '@/lib/store';

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 250, fade: true });

function ThemeSync() {
  const theme = useStore((s) => s.settings.theme);
  useEffect(() => {
    Uniwind.setTheme(theme);
  }, [theme]);
  return null;
}

export default function RootLayout() {
  // Fetch the workout sounds early so the first countdown starts on time.
  useEffect(() => preloadAudio(), []);

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Bricolage-SemiBold': BricolageGrotesque_600SemiBold,
    'Bricolage-ExtraBold': BricolageGrotesque_800ExtraBold,
  });
  const hydrated = useStore((s) => s.hydrated);
  const seeded = useStore((s) => s.seeded);
  const scheme = useColorScheme();
  const theme = useStore((s) => s.settings.theme);
  const dark = theme === 'dark' || (theme === 'system' && scheme === 'dark');

  useEffect(() => {
    if (hydrated && !seeded) useStore.getState().seedSamples();
  }, [hydrated, seeded]);

  // Phones stay portrait; tablets (shortest side 600+) may rotate, and the player uses landscape on them.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const { width, height } = Dimensions.get('screen');
    if (Math.min(width, height) < 600) void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, []);

  useEffect(() => {
    if (fontsLoaded && hydrated) void SplashScreen.hideAsync();
  }, [fontsLoaded, hydrated]);

  if (!fontsLoaded || !hydrated) return null;

  return (
    <ShareIntentProvider options={{ disabled: IS_EXPO_GO, resetOnBackground: true }}>
      <GestureHandlerRootView style={styles.root}>
        <HeroUINativeProvider config={{ textProps: { maxFontSizeMultiplier: 1.6 }, devInfo: { stylingPrinciples: false } }}>
          <ThemeSync />
          <ImportRunner />
          <ShareIntentHandler />
          <StatusBar style={dark ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="import" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="merge" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="workout/[id]/index" />
            <Stack.Screen name="workout/[id]/edit" />
            <Stack.Screen name="workout/[id]/exercise" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="workout/[id]/play" options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
          </Stack>
        </HeroUINativeProvider>
      </GestureHandlerRootView>
    </ShareIntentProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
