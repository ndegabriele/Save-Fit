import type { Block, BlockKind, Category, Difficulty, Exercise, Workout } from './types';

/**
 * Every imported workout has the same shape, so every workout page looks the same.
 * The server prompt asks for exactly these counts; this trims anything extra.
 */
export const SHAPE = { steps: 3, cues: 2, mistakes: 2, tips: 3, targets: 4 } as const;

// Same names as BLOCK_LABEL in format.ts (kept here so this file has no runtime imports and runs in the node tests).
const PART_NAME: Record<BlockKind, string> = { warmup: 'Warm-up', main: 'Main set', circuit: 'Circuit', finisher: 'Finisher', cooldown: 'Cool-down' };

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
const strs = (v: unknown, max = Infinity): string[] =>
  Array.isArray(v)
    ? [...new Set(v.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim()))].slice(0, max)
    : [];
const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

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
    load: text(e.load),
    tempo: text(e.tempo),
    steps: strs(e.steps, SHAPE.steps),
    cues: strs(e.cues, SHAPE.cues),
    commonMistakes: strs(e.commonMistakes, SHAPE.mistakes),
    muscles: strs(e.muscles),
    equipment: strs(e.equipment),
    easier: text(e.easier),
    harder: text(e.harder),
    breathing: text(e.breathing),
    clip,
    notes: text(e.notes),
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
      title: '',
      kind: KINDS.includes(b.kind as BlockKind) ? (b.kind as BlockKind) : 'main',
      rounds: int(b.rounds, 1, 1, 20),
      restBetweenRoundsSec: int(b.restBetweenRoundsSec, 0, 0, 900),
      exercises: (b.exercises ?? []).map((e) => normalizeExercise(e, newId)),
      source: b.source ?? null,
    }))
    .filter((b) => b.exercises.length > 0);
  // Standard part names ("Warm-up", "Circuit"), lettered when a kind repeats ("Circuit A", "Circuit B").
  for (const b of blocks) {
    const same = blocks.filter((x) => x.kind === b.kind);
    b.title = same.length > 1 ? `${PART_NAME[b.kind]} ${String.fromCharCode(65 + same.indexOf(b))}` : PART_NAME[b.kind];
  }
  // "You'll need" is exactly what the exercises use, so the two never disagree.
  const gear = strs(blocks.flatMap((b) => b.exercises.flatMap((e) => e.equipment)));

  return {
    ...base,
    title: draft.title?.trim() || base.title || 'Saved workout',
    summary: text(draft.summary),
    category: CATS.includes(draft.category as Category) ? (draft.category as Category) : 'mixed',
    difficulty: DIFFS.includes(draft.difficulty as Difficulty) ? (draft.difficulty as Difficulty) : 'intermediate',
    creators: (draft.creators ?? []).filter((c) => c && (c.name || c.handle)),
    equipment: gear.length ? gear : strs(draft.equipment),
    targetMuscles: strs(draft.targetMuscles, SHAPE.targets),
    blocks,
    tips: strs(draft.tips, SHAPE.tips),
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
