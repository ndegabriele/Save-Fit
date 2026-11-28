import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useStore } from './store';

/**
 * Workout audio, in two layers the user controls separately (Settings → During workouts):
 *  - SFX: soft tick, start chime, finish chime.
 *  - Coach voice: counts the last 5 seconds and calls get ready / go / rest.
 * Both sets were generated with ElevenLabs (voice: "Coach Cap") and trimmed so the
 * sound starts on the first sample. When the coach speaks, beeps play a little quieter
 * underneath (DUCK) so the voice stays clear.
 */

export type Sfx = 'tick' | 'go' | 'done';
export type VoiceLine = 1 | 2 | 3 | 4 | 5 | 'go' | 'rest' | 'ready' | 'done';

const SFX: Record<Sfx, number> = {
  tick: require('../../assets/sounds/tick.mp3'),
  go: require('../../assets/sounds/go.mp3'),
  done: require('../../assets/sounds/done.mp3'),
};

const VOICE: Record<VoiceLine, number> = {
  1: require('../../assets/sounds/coach/1.mp3'),
  2: require('../../assets/sounds/coach/2.mp3'),
  3: require('../../assets/sounds/coach/3.mp3'),
  4: require('../../assets/sounds/coach/4.mp3'),
  5: require('../../assets/sounds/coach/5.mp3'),
  go: require('../../assets/sounds/coach/go.mp3'),
  rest: require('../../assets/sounds/coach/rest.mp3'),
  ready: require('../../assets/sounds/coach/get-ready.mp3'),
  done: require('../../assets/sounds/coach/done.mp3'),
};

/** Lengths in ms (rounded up), so a count isn't spoken over a longer line. */
const VOICE_MS: Record<VoiceLine, number> = { 1: 920, 2: 450, 3: 630, 4: 530, 5: 500, go: 530, rest: 760, ready: 870, done: 2540 };

/** How loud beeps play under the coach's voice (fraction of the SFX volume). */
const DUCK = 0.55;

const sfxPlayers: Partial<Record<Sfx, AudioPlayer>> = {};
const voicePlayers: Partial<Record<VoiceLine, AudioPlayer>> = {};
let audioReady = false;
let voiceBusyUntil = 0;

async function ensureAudio() {
  if (audioReady) return;
  audioReady = true;
  try {
    // Play over the user's music (ducking it) and in silent mode, like every interval timer does.
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' });
  } catch {}
}

function fire(p: AudioPlayer, volume: number) {
  try {
    p.volume = Math.max(0, Math.min(1, volume));
    p.seekTo(0);
    p.play();
  } catch {}
}

const settings = () => useStore.getState().settings;

/** Create every player up front so the first beep of a workout isn't late. */
export function preloadAudio() {
  void ensureAudio();
  try {
    for (const k of Object.keys(SFX) as Sfx[]) sfxPlayers[k] ??= createAudioPlayer(SFX[k]);
    for (const k of Object.keys(VOICE)) {
      const line = (/^\d$/.test(k) ? Number(k) : k) as VoiceLine;
      voicePlayers[line] ??= createAudioPlayer(VOICE[line]);
    }
  } catch {}
}

/** Play a sound effect. `ducked` lowers it under a voice line playing at the same time. */
export function play(sound: Sfx, ducked = false) {
  const s = settings();
  if (!s.sfx || s.sfxVolume <= 0) return;
  void ensureAudio();
  try {
    const p = (sfxPlayers[sound] ??= createAudioPlayer(SFX[sound]));
    fire(p, s.sfxVolume * (ducked ? DUCK : 1));
  } catch {}
}

/**
 * Speak a coach line. Returns true if it plays.
 * `skipIfBusy` drops it while a longer line is still playing (a count right after "Get ready").
 */
export function say(line: VoiceLine, { skipIfBusy = false } = {}) {
  const s = settings();
  if (!s.voice || s.voiceVolume <= 0) return false;
  const now = Date.now();
  if (skipIfBusy && now < voiceBusyUntil) return false;
  void ensureAudio();
  try {
    const p = (voicePlayers[line] ??= createAudioPlayer(VOICE[line]));
    fire(p, s.voiceVolume);
    voiceBusyUntil = now + VOICE_MS[line];
    return true;
  } catch {
    return false;
  }
}

/** The workout's audio moments: voice first, then the beep under it. */
export const cue = {
  /** One of the last 5 seconds of a timer. */
  count(n: number) {
    const speaking = settings().voice && Date.now() < voiceBusyUntil;
    const spoken = n >= 1 && n <= 5 && say(n as VoiceLine, { skipIfBusy: true });
    play('tick', spoken || speaking);
  },
  ready() {
    say('ready');
  },
  go() {
    play('go', say('go'));
  },
  rest() {
    say('rest');
  },
  done() {
    play('done', say('done'));
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
