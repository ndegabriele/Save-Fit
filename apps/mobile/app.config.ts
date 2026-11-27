import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Save Fit',
  slug: 'save-fit',
  scheme: 'savefit',
  version: '0.1.0',
  // Phones are locked to portrait at runtime (see _layout); tablets can rotate.
  orientation: 'default',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  ios: {
    bundleIdentifier: 'app.savefit.mobile',
    supportsTablet: true,
  },
  android: {
    package: 'app.savefit.mobile',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#C8F25A',
    },
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-video',
    'expo-audio',
    'expo-font',
    [
      'expo-splash-screen',
      { image: './assets/splash-icon.png', imageWidth: 160, resizeMode: 'contain', backgroundColor: '#F6F6F8', dark: { backgroundColor: '#0E0F12' } },
    ],
    [
      'expo-share-intent',
      {
        iosActivationRules: {
          NSExtensionActivationSupportsWebURLWithMaxCount: 1,
          NSExtensionActivationSupportsWebPageWithMaxCount: 1,
          NSExtensionActivationSupportsText: true,
        },
        androidIntentFilters: ['text/*'],
        iosShareExtensionName: 'Save Fit',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // Backend that fetches the video and asks Claude to structure it.
    // Set EXPO_PUBLIC_API_URL in .env (see .env.example).
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
  },
};

export default config;
