import type { Block, BlockKind, Category, Difficulty, Exercise, Workout } from './types';

/**
 * The server sends a workout "draft" shaped like Workout but without ids and
 * with possibly missing / null fields. This makes it safe to store and play.
 */
export type WorkoutDraft = Partial<Omit<Workout, 'blocks'>> & {
  blocks?: (Partial<Omit<Block, 'exercises'>> & { exercises?: Partial<Exercise>[] })[];
};

const CATS: Category[] = ['strength', 'hiit', 'cardio', 'mobility', 'core', 'mixed'];
const DIFFS: Difficulty[] = ['beginner', 'intermediate', 'advanced'];
const KINDS: BlockKind[] = ['warmup', 'main', 'circuit', 'finisher', 'cooldown'];

const int = (v: unknown, fallback: number, min = 0, max = 10_000) => {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback;
  return Math.min(max, Math.max(min, n));
};
const strs = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim()) : [];

export function normalizeExercise(e: Partial<Exercise>, newId: () => string): Exercise {
  const mode = e.mode === 'reps' ? 'reps' : 'time';
  const clip =
    e.clip && typeof e.clip.start === 'number' && typeof e.clip.end === 'number' && e.clip.end > e.clip.start
      ? { start: e.clip.start, end: e.clip.end }
      : null;
  return {
    id: e.id ?? newId(),
    name: e.name?.trim() || 'Exercise',
    mode,
    durationSec: int(e.durationSec, 40, 5, 3600),
    reps: int(e.reps, 10, 1, 500),
    sets: int(e.sets, 1, 1, 20),
    restSec: int(e.restSec, mode === 'time' ? 20 : 45, 0, 600),
    perSide: Boolean(e.perSide),
    load: e.load ?? null,
    tempo: e.tempo ?? null,
    steps: strs(e.steps),
    cues: strs(e.cues),
    commonMistakes: strs(e.commonMistakes),
    muscles: strs(e.muscles),
    equipment: strs(e.equipment),
    easier: e.easier ?? null,
    harder: e.harder ?? null,
    breathing: e.breathing ?? null,
    clip,
    notes: e.notes ?? null,
  };
}

export function normalizeDraft(
  draft: WorkoutDraft,
  base: Pick<Workout, 'id' | 'createdAt'> & Partial<Workout>,
  newId: () => string,
  now: number,
): Workout {
  const blocks: Block[] = (draft.blocks ?? [])
    .map((b) => ({
      id: b.id ?? newId(),
      title: b.title?.trim() || 'Workout',
      kind: KINDS.includes(b.kind as BlockKind) ? (b.kind as BlockKind) : 'main',
      rounds: int(b.rounds, 1, 1, 20),
      restBetweenRoundsSec: int(b.restBetweenRoundsSec, 0, 0, 900),
      exercises: (b.exercises ?? []).map((e) => normalizeExercise(e, newId)),
      source: b.source ?? null,
    }))
    .filter((b) => b.exercises.length > 0);

  return {
    ...base,
    title: draft.title?.trim() || base.title || 'Saved workout',
    summary: draft.summary ?? null,
    category: CATS.includes(draft.category as Category) ? (draft.category as Category) : 'mixed',
    difficulty: DIFFS.includes(draft.difficulty as Difficulty) ? (draft.difficulty as Difficulty) : 'intermediate',
    creators: (draft.creators ?? []).filter((c) => c && (c.name || c.handle)),
    equipment: strs(draft.equipment),
    targetMuscles: strs(draft.targetMuscles),
    blocks,
    tips: strs(draft.tips),
    assumptions: strs(draft.assumptions),
    source: { ...(base.source ?? {}), ...(draft.source ?? {}) },
    status: 'ready',
    jobId: null,
    jobStage: null,
    error: null,
    updatedAt: now,
    timesCompleted: base.timesCompleted ?? 0,
  };
}
