// Web preview only: no secure storage in the browser, so keep it for this tab session.
const SecureStore = {
  getItemAsync: async (k: string) => sessionStorage.getItem(k),
  setItemAsync: async (k: string, v: string) => sessionStorage.setItem(k, v),
  deleteItemAsync: async (k: string) => sessionStorage.removeItem(k),
};
import { useSyncExternalStore } from 'react';

/**
 * TEMPORARY "bring your own key": the user's Anthropic API key lives only in the
 * phone's secure storage (Keychain / Keystore) and is sent with each import.
 * Will be replaced by proper accounts.
 */
const KEY = 'anthropic-api-key';
let cached: string | null = null;
let loaded = false;
const listeners = new Set<() => void>();

export async function loadAiKey(): Promise<string | null> {
  if (!loaded) {
    cached = await SecureStore.getItemAsync(KEY).catch(() => null);
    loaded = true;
    listeners.forEach((l) => l());
  }
  return cached;
}

export async function setAiKey(value: string | null): Promise<void> {
  if (value) await SecureStore.setItemAsync(KEY, value);
  else await SecureStore.deleteItemAsync(KEY);
  cached = value;
  loaded = true;
  listeners.forEach((l) => l());
}

export function useAiKey(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      void loadAiKey();
      return () => listeners.delete(l);
    },
    () => cached,
  );
}

export function maskKey(key: string): string {
  return `${key.slice(0, 10)}…${key.slice(-4)}`;
}
