import type { ExpoConfig } from 'expo/config';

// iOS share sheet needs an App Group, which free (personal team) Apple accounts can't sign.
// Leave it off for Xcode installs with a free Apple ID; set SAVEFIT_IOS_SHARE=1 once there's a paid account.
const iosShare = process.env.SAVEFIT_IOS_SHARE === '1';

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
    // Free Apple IDs need a bundle id nobody else has registered; override with IOS_BUNDLE_ID if Xcode says it's taken.
    bundleIdentifier: process.env.IOS_BUNDLE_ID || 'app.savefit.mobile',
    supportsTablet: true,
    infoPlist: {
      // The import server runs on your computer over plain HTTP on the local network.
      NSLocalNetworkUsageDescription: 'Save Fit connects to your Save Fit server on this network to turn videos into workouts.',
      NSAppTransportSecurity: { NSAllowsLocalNetworking: true, NSAllowsArbitraryLoads: true },
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'app.savefit.mobile',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#C9FB10',
    },
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-video',
    'expo-audio',
    'expo-font',
    [
      'expo-speech-recognition',
      {
        microphonePermission: 'Save Fit listens for “play”, “pause”, “next” and “previous” during a workout when you turn on voice commands.',
        speechRecognitionPermission: 'Save Fit turns what you say into workout controls (play, pause, next, previous), on your phone where possible.',
      },
    ],
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
        disableIOS: !iosShare,
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
