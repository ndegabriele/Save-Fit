import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useRouter } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useEffect } from 'react';

/** Expo Go has no share extension; the native module is optional so this just disables it. */
export const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * When the user shares a reel / TikTok / link to Save Fit from another app,
 * open the import screen pre-filled with it. The import screen starts the
 * conversion straight away so the share is truly "one tap".
 */
export function ShareIntentHandler() {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (!hasShareIntent) return;
    const url = shareIntent.webUrl ?? undefined;
    const text = shareIntent.text ?? undefined;
    if (url || text) {
      router.push({ pathname: '/import', params: { url: url ?? '', text: text ?? '', auto: '1' } });
    }
    resetShareIntent();
  }, [hasShareIntent, shareIntent, resetShareIntent, router]);

  return null;
}
