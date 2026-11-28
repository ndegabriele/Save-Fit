import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useStore } from './store';

/**
 * Workout audio, in two layers the user controls separately (Settings → During workouts):
 *  - SFX: soft tick on each of the last 5 seconds, a chime when a move starts, a chime at the finish.
 *  - Coach voice: a calm "5, 4, 3, 2, 1" on the same seconds as the ticks.
 * Both were generated with ElevenLabs (voice: "Douglas"), trimmed to start on the first sample
 * and stored as WAV, which has no decoder delay, so they land exactly when they're fired.
 * When the coach speaks, the tick plays a little quieter underneath (DUCK).
 */

export type Sfx = 'tick' | 'go' | 'done';
export type VoiceLine = 1 | 2 | 3 | 4 | 5;

const SFX: Record<Sfx, number> = {
  tick: require('../../assets/sounds/tick.wav'),
  go: require('../../assets/sounds/go.wav'),
  done: require('../../assets/sounds/done.wav'),
};

const VOICE: Record<VoiceLine, number> = {
  1: require('../../assets/sounds/coach/1.wav'),
  2: require('../../assets/sounds/coach/2.wav'),
  3: require('../../assets/sounds/coach/3.wav'),
  4: require('../../assets/sounds/coach/4.wav'),
  5: require('../../assets/sounds/coach/5.wav'),
};

/** How loud the tick plays under the coach's voice (fraction of the SFX volume). */
const DUCK = 0.55;

const sfxPlayers: Partial<Record<Sfx, AudioPlayer>> = {};
const voicePlayers: Partial<Record<VoiceLine, AudioPlayer>> = {};
let audioReady = false;

async function ensureAudio() {
  if (audioReady) return;
  audioReady = true;
  try {
    // Play over the user's music (ducking it) and in silent mode, like every interval timer does.
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' });
  } catch {}
}

/** Players rewind themselves when they finish, so firing one never waits on a seek. */
function load(source: number) {
  const p = createAudioPlayer(source);
  p.addListener('playbackStatusUpdate', (s) => {
    if (s.didJustFinish) {
      p.pause();
      void p.seekTo(0);
    }
  });
  return p;
}

function fire(p: AudioPlayer, volume: number) {
  try {
    p.volume = Math.max(0, Math.min(1, volume));
    if (p.playing || p.currentTime > 0.02) {
      // Still sounding (or never rewound): restart from the top.
      void p.seekTo(0).then(() => p.play());
    } else {
      p.play();
    }
  } catch {}
}

const settings = () => useStore.getState().settings;
const sfxPlayer = (k: Sfx) => (sfxPlayers[k] ??= load(SFX[k]));
const voicePlayer = (k: VoiceLine) => (voicePlayers[k] ??= load(VOICE[k]));

/** Create every player up front so the first beep of a workout isn't late. */
export function preloadAudio() {
  void ensureAudio();
  try {
    (Object.keys(SFX) as Sfx[]).forEach(sfxPlayer);
    ([1, 2, 3, 4, 5] as const).forEach(voicePlayer);
  } catch {}
}

/** Play a sound effect. `ducked` lowers it under the coach's voice. */
export function play(sound: Sfx, ducked = false) {
  const s = settings();
  if (!s.sfx || s.sfxVolume <= 0) return;
  void ensureAudio();
  try {
    fire(sfxPlayer(sound), s.sfxVolume * (ducked ? DUCK : 1));
  } catch {}
}

/** Speak a count. Returns true if it plays. */
export function say(line: VoiceLine) {
  const s = settings();
  if (!s.voice || s.voiceVolume <= 0) return false;
  void ensureAudio();
  try {
    fire(voicePlayer(line), s.voiceVolume);
    return true;
  } catch {
    return false;
  }
}

/** The workout's audio moments. */
export const cue = {
  /** One of the last 5 seconds of a timer: the coach's count with the tick under it. */
  count(n: number) {
    const spoken = n >= 1 && n <= 5 && say(n as VoiceLine);
    play('tick', spoken);
  },
  go() {
    play('go');
  },
  done() {
    play('done');
  },
};

export const haptic = {
  tap() {
    if (settings().haptics) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  firm() {
    if (settings().haptics) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  success() {
    if (settings().haptics) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  select() {
    if (settings().haptics) void Haptics.selectionAsync();
  },
};
