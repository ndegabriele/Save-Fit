import type { Block, Exercise, Workout } from './types';

/**
 * Turns a workout into the flat list of steps the player walks through.
 *
 * Order: block -> round -> exercise -> set -> side. A rest step follows each
 * set when the exercise has rest, and a round rest follows each round except
 * the last. Nothing rests after the final step of the workout.
 */
export type Step =
  | {
      kind: 'work';
      key: string;
      blockIndex: number;
      block: Block;
      exercise: Exercise;
      round: number;
      rounds: number;
      set: number;
      sets: number;
      side: 'left' | 'right' | null;
      mode: Exercise['mode'];
      durationSec: number;
      reps: number;
    }
  | {
      kind: 'rest';
      key: string;
      blockIndex: number;
      block: Block;
      durationSec: number;
      label: string;
      /** What comes next, for the "up next" preview. */
      next: Exercise | null;
    };

export function buildSequence(workout: Pick<Workout, 'blocks'>): Step[] {
  const steps: Step[] = [];

  workout.blocks.forEach((block, blockIndex) => {
    const rounds = Math.max(1, block.rounds);
    for (let round = 1; round <= rounds; round++) {
      block.exercises.forEach((exercise) => {
        const sets = Math.max(1, exercise.sets);
        for (let set = 1; set <= sets; set++) {
          const sides: ('left' | 'right' | null)[] = exercise.perSide ? ['left', 'right'] : [null];
          for (const side of sides) {
            steps.push({
              kind: 'work',
              key: `${block.id}:${round}:${exercise.id}:${set}:${side ?? 'both'}`,
              blockIndex,
              block,
              exercise,
              round,
              rounds,
              set,
              sets,
              side,
              mode: exercise.mode,
              durationSec: Math.max(1, exercise.durationSec),
              reps: Math.max(1, exercise.reps),
            });
          }
          if (exercise.restSec > 0) {
            steps.push({
              kind: 'rest',
              key: `${block.id}:${round}:${exercise.id}:${set}:rest`,
              blockIndex,
              block,
              durationSec: exercise.restSec,
              label: 'Rest',
              next: null,
            });
          }
        }
      });
      if (round < rounds && block.restBetweenRoundsSec > 0) {
        steps.push({
          kind: 'rest',
          key: `${block.id}:${round}:round-rest`,
          blockIndex,
          block,
          durationSec: block.restBetweenRoundsSec,
          label: `Round ${round} done`,
          next: null,
        });
      }
    }
  });

  // Drop rests that end the workout, merge back-to-back rests (set rest
  // followed by round rest) into the longer one, then fill "next".
  const cleaned: Step[] = [];
  for (const step of steps) {
    const prev = cleaned[cleaned.length - 1];
    if (step.kind === 'rest' && prev?.kind === 'rest') {
      if (step.durationSec > prev.durationSec) cleaned[cleaned.length - 1] = step;
      continue;
    }
    cleaned.push(step);
  }
  while (cleaned.length && cleaned[cleaned.length - 1]?.kind === 'rest') cleaned.pop();

  for (let i = 0; i < cleaned.length; i++) {
    const step = cleaned[i];
    if (step?.kind !== 'rest') continue;
    const nextWork = cleaned.slice(i + 1).find((s) => s.kind === 'work');
    step.next = nextWork?.kind === 'work' ? nextWork.exercise : null;
  }
  return cleaned;
}

/** Rough duration of an exercise including its rests, in seconds. */
export function exerciseSeconds(ex: Exercise): number {
  const sides = ex.perSide ? 2 : 1;
  // ~3 s per rep is a common coaching estimate.
  const work = ex.mode === 'time' ? ex.durationSec : ex.reps * 3;
  return Math.max(1, ex.sets) * (work * sides + ex.restSec);
}

export function blockSeconds(block: Block): number {
  const one = block.exercises.reduce((sum, ex) => sum + exerciseSeconds(ex), 0);
  const rounds = Math.max(1, block.rounds);
  return one * rounds + block.restBetweenRoundsSec * (rounds - 1);
}

export function workoutSeconds(workout: Pick<Workout, 'blocks'>): number {
  return workout.blocks.reduce((sum, b) => sum + blockSeconds(b), 0);
}

export function workoutMinutes(workout: Pick<Workout, 'blocks'>): number {
  return Math.max(1, Math.round(workoutSeconds(workout) / 60));
}

export function exerciseCount(workout: Pick<Workout, 'blocks'>): number {
  return workout.blocks.reduce((sum, b) => sum + b.exercises.length, 0);
}
