import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { IS_EXPO_GO } from './share-intent';
import { COMMAND_WORDS, createCommandTracker, parseCommand, type VoiceCommand } from './voice-words';

export { parseCommand, type VoiceCommand };

/**
 * Hands-free control in the player: say "play", "pause", "next" or "previous".
 * Uses the phone's own speech recogniser (Apple Speech on iOS, Google on Android), on-device
 * where the phone supports it, through expo-speech-recognition. That's a native module, so it
 * needs the Save Fit app build: in Expo Go it reports unavailable and the player works as before.
 */

type SpeechModule = typeof import('expo-speech-recognition');
let mod: SpeechModule | null | undefined;
function speech(): SpeechModule | null {
  if (mod !== undefined) return mod;
  try {
    mod = IS_EXPO_GO || Platform.OS === 'web' ? null : (require('expo-speech-recognition') as SpeechModule);
  } catch {
    mod = null;
  }
  return mod;
}

/** True when this build can listen (not Expo Go, and the phone has a recogniser). */
export function voiceCommandsAvailable(): boolean {
  try {
    return Boolean(speech()?.ExpoSpeechRecognitionModule.isRecognitionAvailable());
  } catch {
    return false;
  }
}

/** Asks for microphone + speech permission. Resolves true when granted. */
export async function requestVoicePermission(): Promise<boolean> {
  const m = speech();
  if (!m) return false;
  const res = await m.ExpoSpeechRecognitionModule.requestPermissionsAsync();
  return res.granted;
}

/**
 * Listens while `enabled`, calling onCommand once per spoken command. Recognition restarts
 * itself when the phone ends a session (iOS and Android both stop after a silence).
 */
export function useVoiceCommands(enabled: boolean, onCommand: (c: VoiceCommand) => void) {
  const handler = useRef(onCommand);
  handler.current = onCommand;

  useEffect(() => {
    const m = speech();
    if (!enabled || !m) return;
    const S = m.ExpoSpeechRecognitionModule;
    let active = true;
    let restart: ReturnType<typeof setTimeout> | undefined;
    // Each spoken command fires once, however many times the recogniser resends it.
    const tracker = createCommandTracker();

    const begin = () => {
      if (!active) return;
      try {
        S.start({
          lang: 'en-US',
          interimResults: true,
          continuous: true,
          requiresOnDeviceRecognition: S.supportsOnDeviceRecognition(),
          addsPunctuation: false,
          contextualStrings: Object.keys(COMMAND_WORDS),
          // iOS: keep the workout sounds playing through the speaker while listening,
          // with echo cancellation so the app doesn't hear itself.
          iosCategory: { category: 'playAndRecord', categoryOptions: ['defaultToSpeaker', 'allowBluetooth', 'mixWithOthers'], mode: 'default' },
          iosVoiceProcessingEnabled: true,
          androidIntentOptions: { EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1500 },
        });
      } catch {
        // Already running or busy: the end handler will try again.
      }
    };

    const subs = [
      S.addListener('start', () => tracker.reset()),
      S.addListener('result', (e) => {
        const cmd = tracker.feed(e.results[0]?.transcript ?? '', e.isFinal, Date.now());
        if (cmd) handler.current(cmd);
      }),
      S.addListener('end', () => {
        if (active) restart = setTimeout(begin, 300);
      }),
      S.addListener('error', (e) => {
        // Permission refused or no recogniser: stop trying. Anything else (no speech, timeout): keep listening.
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'language-not-supported') active = false;
      }),
    ];

    void S.requestPermissionsAsync().then((p) => {
      if (p.granted) begin();
      else active = false;
    });

    return () => {
      active = false;
      if (restart) clearTimeout(restart);
      subs.forEach((s) => s.remove());
      try {
        S.abort();
      } catch {
        // not running
      }
    };
  }, [enabled]);
}
