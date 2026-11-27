import { kv } from './kv';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { uid } from './id';
import { mergeWorkouts } from './merge';
import { normalizeDraft, type WorkoutDraft } from './normalize';
import { SAMPLE_WORKOUTS } from './samples';
import type { Workout } from './types';

export interface Settings {
  /** Seconds of "get ready" countdown before each timed exercise. */
  countdownSec: number;
  sound: boolean;
  haptics: boolean;
  /** Show the coach's video clip in the player when available. */
  showVideo: boolean;
  theme: 'system' | 'light' | 'dark';
  /** Optional override of the server URL baked into the build. */
  apiUrl: string;
}

interface State {
  workouts: Workout[];
  settings: Settings;
  seeded: boolean;
  hydrated: boolean;
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
  setSettings: (patch: Partial<Settings>) => void;
}

export const DEFAULT_SETTINGS: Settings = {
  countdownSec: 5,
  sound: true,
  haptics: true,
  showVideo: true,
  theme: 'system',
  apiUrl: '',
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      workouts: [],
      settings: DEFAULT_SETTINGS,
      seeded: false,
      hydrated: false,

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

      remove: (id) => set({ workouts: get().workouts.filter((w) => w.id !== id) }),

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
      version: 1,
      storage: createJSONStorage(() => kv),
      partialize: ({ workouts, settings, seeded }) => ({ workouts, settings, seeded }),
      onRehydrateStorage: () => () => {
        useStore.setState({ hydrated: true });
      },
    },
  ),
);

export const useWorkout = (id: string | undefined) =>
  useStore((s) => (id ? s.workouts.find((w) => w.id === id) : undefined));
