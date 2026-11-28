import { Platform } from 'react-native';

// react-native-web has no Platform.constants; HeroUI Native reads
// Platform.constants.reactNativeVersion at import time. Only matters for the
// web preview build; native platforms already have it.
if (Platform.OS === 'web') {
  const p = Platform as unknown as { constants?: Record<string, unknown> };
  if (!p.constants) p.constants = {};
  p.constants.reactNativeVersion ??= { major: 0, minor: 88, patch: 0 };
}
