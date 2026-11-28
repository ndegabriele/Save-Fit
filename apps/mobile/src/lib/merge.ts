import type { Category, Creator, Difficulty, Workout } from './types';

const ORDER: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

function uniq<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Combines several workouts into one, in the given order.
 * Every block keeps (or gains) a `source`, so the merged workout still knows
 * which creator and which video each part came from.
 */
export function mergeWorkouts(
  parts: Workout[],
  opts: { id: string; title?: string; now: number; newId: () => string },
): Workout {
  if (parts.length < 2) throw new Error('Pick at least two workouts to merge');

  const creators = uniq(
    parts.flatMap((w) => w.creators),
    (c: Creator) => (c.handle ?? c.name).toLowerCase(),
  );

  const blocks = parts.flatMap((w) =>
    w.blocks.map((b) => ({
      ...b,
      id: opts.newId(),
      exercises: b.exercises.map((e) => ({ ...e, id: opts.newId() })),
      source: {
        ...(w.source ?? {}),
        ...(b.source ?? {}),
        creator: b.source?.creator ?? w.creators[0] ?? null,
        workoutTitle: b.source?.workoutTitle ?? w.title,
        workoutId: b.source?.workoutId ?? w.id,
      },
    })),
  );

  const categories = uniq(parts.map((p) => p.category), (c) => c);
  const category: Category = categories.length === 1 && categories[0] ? categories[0] : 'mixed';
  const difficulty = parts
    .map((p) => p.difficulty)
    .reduce((a, b) => (ORDER.indexOf(b) > ORDER.indexOf(a) ? b : a), 'beginner' as Difficulty);

  return {
    id: opts.id,
    title: opts.title?.trim() || parts.map((p) => p.title).join(' + '),
    summary: `Combined from ${parts.length} workouts: ${parts.map((p) => p.title).join(', ')}.`,
    category,
    difficulty,
    creators,
    equipment: uniq(parts.flatMap((p) => p.equipment), (e) => e.toLowerCase()),
    targetMuscles: uniq(parts.flatMap((p) => p.targetMuscles), (m) => m.toLowerCase()),
    blocks,
    tips: uniq(parts.flatMap((p) => p.tips), (t) => t),
    assumptions: [],
    source: parts[0]?.source ? { thumbnailUrl: parts.find((p) => p.source?.thumbnailUrl)?.source?.thumbnailUrl } : null,
    status: 'ready',
    mergedFrom: parts.map((p) => p.id),
    createdAt: opts.now,
    updatedAt: opts.now,
    timesCompleted: 0,
  };
}
