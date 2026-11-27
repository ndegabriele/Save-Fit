import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useStore } from './store';

type Sound = 'tick' | 'go' | 'done';

const SOURCES: Record<Sound, number> = {
  tick: require('../../assets/sounds/tick.wav'),
  go: require('../../assets/sounds/go.wav'),
  done: require('../../assets/sounds/done.wav'),
};

const players: Partial<Record<Sound, AudioPlayer>> = {};
let audioReady = false;

async function ensureAudio() {
  if (audioReady) return;
  audioReady = true;
  try {
    // Play over the user's music (ducking it) and in silent mode,
    // like every interval timer does.
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' });
  } catch {}
}

export function play(sound: Sound) {
  if (!useStore.getState().settings.sound) return;
  void ensureAudio();
  try {
    const p = (players[sound] ??= createAudioPlayer(SOURCES[sound]));
    p.seekTo(0);
    p.play();
  } catch {}
}

export const haptic = {
  tap() {
    if (useStore.getState().settings.haptics) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  firm() {
    if (useStore.getState().settings.haptics) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  success() {
    if (useStore.getState().settings.haptics) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  select() {
    if (useStore.getState().settings.haptics) void Haptics.selectionAsync();
  },
};
