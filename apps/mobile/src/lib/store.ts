import type { Mode, Palette } from './palettes';
import { kv } from './kv';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { uid } from './id';
import { mergeWorkouts } from './merge';
import { normalizeDraft, type WorkoutDraft } from './normalize';
import { SAMPLE_WORKOUTS } from './samples';
import { STARTER_LINKS } from './starter-links';
import type { Workout } from './types';
import { snapTime, type Plan } from './plan';

export interface Settings {
  /** Seconds of "get ready" countdown before each timed exercise. */
  countdownSec: number;
  /** Beeps and chimes. */
  sfx: boolean;
  /** 0–1. */
  sfxVolume: number;
  /** The coach's spoken countdown and cues. */
  voice: boolean;
  /** 0–1. */
  voiceVolume: number;
  haptics: boolean;
  /** Say play, pause, next or previous during a workout. Off until the user turns it on (needs the mic). */
  voiceCommands: boolean;
  /** Show the coach's video clip in the player when available. */
  showVideo: boolean;
  theme: Mode;
  /** Colour theme; each has its own light and dark. */
  palette: Palette;
  /** Optional override of the server URL baked into the build. */
  apiUrl: string;
}

interface State {
  workouts: Workout[];
  settings: Settings;
  seeded: boolean;
  hydrated: boolean;
  /** Links waiting to be imported (shown on the library). */
  inbox: string[];
  dismissLink: (url: string) => void;
  seedSamples: () => void;
  addProcessing: (input: { url?: string | null; text?: string | null; jobId: string }) => string;
  completeImport: (id: string, draft: WorkoutDraft) => void;
  failImport: (id: string, error: string) => void;
  setStage: (id: string, stage: string) => void;
  update: (id: string, fn: (w: Workout) => Workout) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => string | null;
  merge: (ids: string[], title?: string) => string;
  markPlayed: (id: string, completed: boolean) => void;
  /** Workouts placed on the calendar. */
  plans: Plan[];
  addPlan: (input: Omit<Plan, 'id'>) => string;
  updatePlan: (id: string, patch: Partial<Omit<Plan, 'id'>>) => void;
  removePlan: (id: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
}

export const DEFAULT_SETTINGS: Settings = {
  countdownSec: 5,
  sfx: true,
  sfxVolume: 0.7,
  voice: true,
  voiceVolume: 1,
  haptics: true,
  voiceCommands: false,
  showVideo: true,
  theme: 'system',
  palette: 'default',
  apiUrl: '',
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      workouts: [],
      settings: DEFAULT_SETTINGS,
      seeded: false,
      hydrated: false,
      inbox: STARTER_LINKS,
      dismissLink: (url) => set({ inbox: get().inbox.filter((u) => u !== url) }),

      seedSamples: () => {
        if (get().seeded) return;
        const now = Date.now();
        const samples = SAMPLE_WORKOUTS.map((draft, i) =>
          normalizeDraft(draft, { id: uid(), createdAt: now - i * 60_000, timesCompleted: 0 }, uid, now - i * 60_000),
        );
        set({ workouts: [...get().workouts, ...samples], seeded: true });
      },

      addProcessing: ({ url, text, jobId }) => {
        const id = uid();
        const now = Date.now();
        const placeholder: Workout = {
          id,
          title: 'Reading your workout…',
          category: 'mixed',
          difficulty: 'intermediate',
          creators: [],
          equipment: [],
          targetMuscles: [],
          blocks: [],
          tips: [],
          assumptions: [],
          source: { url: url ?? null },
          summary: text ?? null,
          status: 'processing',
          jobId,
          jobStage: 'queued',
          createdAt: now,
          updatedAt: now,
          timesCompleted: 0,
        };
        set({ workouts: [placeholder, ...get().workouts] });
        return id;
      },

      completeImport: (id, draft) =>
        get().update(id, (w) => normalizeDraft(draft, w, uid, Date.now())),

      failImport: (id, error) =>
        get().update(id, (w) => ({ ...w, status: 'failed', error, jobId: null, updatedAt: Date.now() })),

      setStage: (id, stage) => get().update(id, (w) => (w.jobStage === stage ? w : { ...w, jobStage: stage })),

      update: (id, fn) =>
        set({ workouts: get().workouts.map((w) => (w.id === id ? fn(w) : w)) }),

      // Deleting a workout also takes it off the calendar.
      remove: (id) => set({ workouts: get().workouts.filter((w) => w.id !== id), plans: get().plans.filter((p) => p.workoutId !== id) }),

      plans: [],
      addPlan: (input) => {
        const plan: Plan = { ...input, id: uid(), minutes: snapTime(input.minutes) };
        set({ plans: [...get().plans, plan] });
        return plan.id;
      },
      updatePlan: (id, patch) =>
        set({
          plans: get().plans.map((p) => (p.id === id ? { ...p, ...patch, minutes: snapTime(patch.minutes ?? p.minutes) } : p)),
        }),
      removePlan: (id) => set({ plans: get().plans.filter((p) => p.id !== id) }),

      duplicate: (id) => {
        const src = get().workouts.find((w) => w.id === id);
        if (!src) return null;
        const now = Date.now();
        const copy: Workout = {
          ...structuredClone(src),
          id: uid(),
          title: `${src.title} (copy)`,
          createdAt: now,
          updatedAt: now,
          timesCompleted: 0,
          lastPlayedAt: null,
        };
        set({ workouts: [copy, ...get().workouts] });
        return copy.id;
      },

      merge: (ids, title) => {
        const parts = ids
          .map((id) => get().workouts.find((w) => w.id === id))
          .filter((w): w is Workout => Boolean(w));
        const merged = mergeWorkouts(parts, { id: uid(), title, now: Date.now(), newId: uid });
        set({ workouts: [merged, ...get().workouts] });
        return merged.id;
      },

      markPlayed: (id, completed) =>
        get().update(id, (w) => ({
          ...w,
          lastPlayedAt: Date.now(),
          timesCompleted: w.timesCompleted + (completed ? 1 : 0),
        })),

      setSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
    }),
    {
      name: 'save-fit',
      version: 2,
      storage: createJSONStorage(() => kv),
      // v1 had a single `sound` switch: it now drives the sound effects.
      migrate: (persisted, version) => {
        const p = persisted as { settings?: Partial<Settings> & { sound?: boolean } };
        if (version < 2 && p?.settings) {
          const { sound, ...rest } = p.settings;
          p.settings = { ...rest, sfx: sound ?? true };
        }
        return p as unknown as State;
      },
      // Fill in settings added after the user's data was saved.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...p.settings } };
      },
      partialize: ({ workouts, settings, seeded, inbox, plans }) => ({ workouts, settings, seeded, inbox, plans }),
      onRehydrateStorage: () => () => {
        useStore.setState({ hydrated: true });
      },
    },
  ),
);

export const useWorkout = (id: string | undefined) =>
  useStore((s) => (id ? s.workouts.find((w) => w.id === id) : undefined));
