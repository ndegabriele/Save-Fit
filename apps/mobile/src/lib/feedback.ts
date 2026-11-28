import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useStore } from './store';

/**
 * Workout audio, in two layers the user controls separately (Settings → During workouts):
 *  - SFX: soft tick on each of the last 5 seconds, a chime when a move starts, a chime at the finish.
 *  - Coach voice: a calm "5, 4, 3, 2, 1" (ElevenLabs voice "Douglas").
 *
 * Staying in sync: the last 5 seconds are two pre-timed 5 s tracks (voice, ticks) with every
 * count on an exact second, started once together. The counts can't drift from each other,
 * and starting one track is far more punctual than starting five clips.
 * Players download their file first (in Expo Go assets otherwise stream from the dev server)
 * and keep the audio session open between sounds, so iOS doesn't spin it up again each time.
 * When the coach speaks, the ticks play a little quieter (DUCK).
 */

export type Sfx = 'tick' | 'go' | 'done';

const SFX: Record<Sfx, number> = {
  tick: require('../../assets/sounds/tick.wav'),
  go: require('../../assets/sounds/go.wav'),
  done: require('../../assets/sounds/done.wav'),
};

const TRACK = {
  voice: require('../../assets/sounds/countdown-voice.wav'),
  tick: require('../../assets/sounds/countdown-tick.wav'),
};

/** Length of the countdown tracks: they cover the last this-many seconds of a timer. */
export const COUNTDOWN_SEC = 5;

/** How loud the ticks play under the coach's voice (fraction of the SFX volume). */
const DUCK = 0.55;

let audioReady = false;
async function ensureAudio() {
  if (audioReady) return;
  audioReady = true;
  try {
    // Play over the user's music (ducking it) and in silent mode, like every interval timer does.
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' });
  } catch {}
}

/** Players rewind themselves when they finish, so starting one never waits on a seek. */
function load(source: number) {
  const p = createAudioPlayer(source, { downloadFirst: true, keepAudioSessionActive: true });
  p.addListener('playbackStatusUpdate', (s) => {
    if (s.didJustFinish) {
      p.pause();
      void p.seekTo(0);
    }
  });
  return p;
}

/** Start `p` at `at` seconds, seeking only when it isn't already there. */
function startAt(p: AudioPlayer, volume: number, at = 0) {
  try {
    p.volume = Math.max(0, Math.min(1, volume));
    if (p.playing || Math.abs(p.currentTime - at) > 0.02) {
      if (p.playing) p.pause();
      void p.seekTo(at).then(() => p.play());
    } else {
      p.play();
    }
  } catch {}
}

const settings = () => useStore.getState().settings;

const sfxPlayers: Partial<Record<Sfx, AudioPlayer>> = {};
const sfxPlayer = (k: Sfx) => (sfxPlayers[k] ??= load(SFX[k]));
let voiceTrack: AudioPlayer | null = null;
let tickTrack: AudioPlayer | null = null;
const tracks = () => {
  voiceTrack ??= load(TRACK.voice);
  tickTrack ??= load(TRACK.tick);
  return [voiceTrack, tickTrack] as const;
};

/** Create every player up front (and fetch its file) so the first cue of a workout is on time. */
export function preloadAudio() {
  void ensureAudio();
  try {
    (Object.keys(SFX) as Sfx[]).forEach(sfxPlayer);
    tracks();
  } catch {}
}

/** Play a one-off sound effect. */
export function play(sound: Sfx) {
  const s = settings();
  if (!s.sfx || s.sfxVolume <= 0) return;
  void ensureAudio();
  try {
    startAt(sfxPlayer(sound), s.sfxVolume);
  } catch {}
}

/** The last-5-seconds countdown (voice and ticks). */
export const countdown = {
  /** Start with `secondsLeft` on the timer (5 = from the top; less = joins part way through). */
  start(secondsLeft: number) {
    const s = settings();
    const voiceOn = s.voice && s.voiceVolume > 0;
    const tickOn = s.sfx && s.sfxVolume > 0;
    if (!voiceOn && !tickOn) return;
    void ensureAudio();
    const at = Math.max(0, COUNTDOWN_SEC - secondsLeft);
    try {
      const [voice, tick] = tracks();
      if (voiceOn) startAt(voice, s.voiceVolume, at);
      if (tickOn) startAt(tick, s.sfxVolume * (voiceOn ? DUCK : 1), at);
    } catch {}
  },
  stop() {
    for (const p of [voiceTrack, tickTrack]) {
      try {
        if (p?.playing) p.pause();
      } catch {}
    }
  },
};

/** Settings previews. */
export const preview = {
  sfx() {
    play('tick');
  },
  /** The coach saying "three". */
  voice() {
    const s = settings();
    if (!s.voice || s.voiceVolume <= 0) return;
    void ensureAudio();
    try {
      const [voice] = tracks();
      startAt(voice, s.voiceVolume, 2);
      setTimeout(() => voice.playing && voice.pause(), 900);
    } catch {}
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
