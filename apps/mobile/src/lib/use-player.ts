import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { COUNTDOWN_SEC, countdown, haptic, play, preloadAudio } from './feedback';
import { buildSequence, type Step } from './sequence';
import type { Workout } from './types';

/** intro = the big 'get ready' countdown before the first exercise of every workout. */
export type Phase = 'ready' | 'intro' | 'countdown' | 'running' | 'done';

/** The start countdown is always at least this long, even if per-move countdowns are off. */
export const INTRO_MIN_SEC = 5;

export interface PlayerState {
  steps: Step[];
  index: number;
  step: Step | undefined;
  phase: Phase;
  paused: boolean;
  /** Seconds left in the current countdown / timed step. */
  remaining: number;
  /** Seconds the current phase lasts (for the ring). */
  phaseTotal: number;
  /** Seconds spent on the current reps step. */
  repElapsed: number;
  /** Active workout time, excluding pauses. */
  elapsed: number;
  workDone: number;
}

const TICK_MS = 100;

/**
 * The workout clock.
 *  - Start: every workout opens with a get-ready countdown (intro).
 *  - Timed work: optional get-ready countdown, then counts down and
 *    auto-advances.
 *  - Rest: counts down and auto-advances (can be extended or skipped).
 *  - Reps: no timer; shows the count and waits for "Done".
 * Time is computed from timestamps so it stays right if JS stalls.
 */
export function usePlayer(workout: Pick<Workout, 'blocks'> | undefined, countdownSec: number) {
  const steps = useMemo(() => (workout ? buildSequence(workout) : []), [workout]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ready');
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [workDone, setWorkDone] = useState(0);
  /** Bumped whenever the current timer's end moves, so the cue schedule is rebuilt. */
  const [timerRev, setTimerRev] = useState(0);

  // Timestamps for the current phase.
  const endsAt = useRef(0);
  const phaseTotal = useRef(0);
  const pausedLeft = useRef(0);
  const stepStartedAt = useRef(Date.now());
  const activeMs = useRef(0);
  const lastTick = useRef(Date.now());
  const lastBeep = useRef<number | null>(null);

  const step = steps[index];

  const startTimer = useCallback((seconds: number) => {
    phaseTotal.current = seconds;
    endsAt.current = Date.now() + seconds * 1000;
    lastBeep.current = null;
    setTimerRev((r) => r + 1);
  }, []);

  const enterStep = useCallback(
    (i: number, withCountdown: boolean) => {
      const s = steps[i];
      setIndex(i);
      setPaused(false);
      stepStartedAt.current = Date.now();
      if (!s) {
        setPhase('done');
        return;
      }
      if (s.kind === 'work' && s.mode === 'time' && withCountdown && countdownSec > 0) {
        setPhase('countdown');
        startTimer(countdownSec);
      } else {
        setPhase('running');
        if (s.kind === 'rest' || s.mode === 'time') startTimer(s.durationSec);
        if (s.kind === 'work') {
          play('go');
          haptic.firm();
        }
      }
    },
    [steps, countdownSec, startTimer],
  );

  const start = useCallback(() => {
    setIndex(0);
    setPaused(false);
    setPhase('intro');
    startTimer(Math.max(INTRO_MIN_SEC, countdownSec));
  }, [countdownSec, startTimer]);

  const next = useCallback(() => {
    if (step?.kind === 'work') setWorkDone((n) => n + 1);
    if (index >= steps.length - 1) {
      setPhase('done');
      play('done');
      haptic.success();
      return;
    }
    const upcoming = steps[index + 1];
    // Countdown only when coming from work (rest already acts as a get-ready).
    enterStep(index + 1, step?.kind !== 'rest' || upcoming?.kind !== 'work');
  }, [index, steps, step, enterStep]);

  const prev = useCallback(() => {
    // Within the first 3 s, go to the previous step; otherwise restart this one.
    const target = Date.now() - stepStartedAt.current < 3000 ? Math.max(0, index - 1) : index;
    enterStep(target, true);
  }, [index, enterStep]);

  const togglePause = useCallback(() => {
    if (phase === 'ready') return start();
    setPaused((p) => {
      if (!p) pausedLeft.current = Math.max(0, endsAt.current - Date.now());
      else endsAt.current = Date.now() + pausedLeft.current;
      setTimerRev((r) => r + 1);
      return !p;
    });
    haptic.tap();
  }, [phase, start]);

  const addTime = useCallback((sec: number) => {
    if (paused) pausedLeft.current += sec * 1000;
    else endsAt.current += sec * 1000;
    phaseTotal.current += sec;
    setTimerRev((r) => r + 1);
    haptic.select();
  }, [paused]);

  /** Skip the get-ready countdown (the start one or a per-move one). */
  const goNow = useCallback(() => {
    if (phase === 'intro') {
      pausedLeft.current = 0;
      return enterStep(0, false);
    }
    if (phase !== 'countdown' || !step) return;
    // Starting now also un-pauses: the saved remainder belonged to the countdown.
    setPaused(false);
    pausedLeft.current = 0;
    setPhase('running');
    startTimer(step.durationSec);
    play('go');
    haptic.firm();
  }, [phase, step, startTimer, enterStep]);

  // Clock
  useEffect(() => {
    if (phase === 'ready' || phase === 'done') return;
    lastTick.current = Date.now();
    const id = setInterval(() => {
      const t = Date.now();
      // The start countdown isn't workout time.
      if (!paused && phase !== 'intro') activeMs.current += t - lastTick.current;
      lastTick.current = t;
      setNow(t);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [phase, paused]);

  const timed = phase === 'intro' || phase === 'countdown' || (phase === 'running' && (step?.kind === 'rest' || step?.mode === 'time'));
  const remainingMs = paused ? pausedLeft.current : Math.max(0, endsAt.current - now);
  const remaining = timed ? remainingMs / 1000 : 0;

  // Load the sounds when the player opens, so the first cue is on time.
  useEffect(() => preloadAudio(), []);

  // The last 5 seconds: one pre-timed audio track (voice + ticks) started as the timer reaches 5,
  // or part way through if it's already under 5 (a short timer, a resume). The screen re-renders
  // on each exact second, so the number changes with the count instead of on the next clock tick.
  useEffect(() => {
    if (!timed || paused) return;
    const t0 = Date.now();
    const end = endsAt.current;
    const ids: ReturnType<typeof setTimeout>[] = [];
    const startIn = end - COUNTDOWN_SEC * 1000 - t0;
    if (startIn <= 150) countdown.start((end - t0) / 1000);
    else ids.push(setTimeout(() => countdown.start(COUNTDOWN_SEC), startIn));
    for (let n = COUNTDOWN_SEC; n >= 1; n--) {
      const at = end - n * 1000;
      if (at < t0 - 150) continue;
      ids.push(
        setTimeout(() => {
          setNow(Math.max(Date.now(), at));
          if (lastBeep.current === n) return;
          lastBeep.current = n;
          haptic.tap();
        }, Math.max(0, at - t0)),
      );
    }
    // Wake exactly at zero so the next move (and its chime) starts on time.
    ids.push(setTimeout(() => setNow(Math.max(Date.now(), end)), Math.max(0, end - t0)));
    return () => {
      ids.forEach(clearTimeout);
      countdown.stop();
    };
  }, [timed, paused, timerRev]);

  // Transitions when the timer hits 0.
  useEffect(() => {
    if (!timed || paused) return;
    if (remainingMs <= 0) {
      if (phase === 'intro') {
        enterStep(0, false);
      } else if (phase === 'countdown' && step) {
        setPhase('running');
        startTimer(step.durationSec);
        play('go');
        haptic.firm();
      } else {
        next();
      }
    }
  }, [timed, paused, remaining, remainingMs, phase, step, next, startTimer, enterStep]);

  const state: PlayerState = {
    steps,
    index,
    step,
    phase,
    paused,
    remaining,
    phaseTotal: phaseTotal.current,
    repElapsed: step?.kind === 'work' && step.mode === 'reps' ? (now - stepStartedAt.current) / 1000 : 0,
    elapsed: activeMs.current / 1000,
    workDone,
  };

  return { ...state, start, next, prev, togglePause, addTime, goNow, jump: (i: number) => enterStep(i, true) };
}
