import { z } from 'zod';

/**
 * What Claude returns. It mirrors the app's Workout model (apps/mobile/src/lib/types.ts)
 * minus ids and app state. The app normalizes and clamps everything on arrival.
 */
export const ExerciseSchema = z.object({
  name: z.string().describe('Common exercise name in Title Case, e.g. "Dumbbell Romanian Deadlift".'),
  mode: z.enum(['time', 'reps']).describe('"time" for intervals/holds, "reps" when a rep count is the target.'),
  durationSec: z.number().nullable().describe('Work seconds per set (mode=time). null for reps.'),
  reps: z.number().nullable().describe('Reps per set (mode=reps), per side if perSide. null for time.'),
  sets: z.number().describe('Sets of this exercise within one round. Usually 1 in circuits.'),
  restSec: z.number().describe('Rest after each set in seconds. 0 if moving straight on.'),
  perSide: z.boolean().describe('True when done on each side / each leg / each arm.'),
  load: z.string().nullable().describe('Weight or resistance if shown or stated, e.g. "2 × 10 kg dumbbells".'),
  tempo: z.string().nullable(),
  steps: z.array(z.string()).describe('3-5 short imperative how-to steps, in order.'),
  cues: z.array(z.string()).describe('2-3 very short form cues (max 4 words each) to show mid-set.'),
  commonMistakes: z.array(z.string()).describe('1-3 frequent mistakes to avoid.'),
  muscles: z.array(z.string()).describe('Main muscles worked, plain English.'),
  equipment: z.array(z.string()),
  easier: z.string().nullable().describe('A regression for beginners.'),
  harder: z.string().nullable().describe('A progression.'),
  breathing: z.string().nullable(),
  clipStartSec: z.number().nullable().describe('Start of the video segment that shows this exercise, from the frame timestamps.'),
  clipEndSec: z.number().nullable(),
  notes: z.string().nullable(),
});

export const BlockSchema = z.object({
  title: z.string().describe('Short name, e.g. "Warm-up", "Circuit A", "Finisher".'),
  kind: z.enum(['warmup', 'main', 'circuit', 'finisher', 'cooldown']),
  rounds: z.number().describe('How many times the block is repeated.'),
  restBetweenRoundsSec: z.number(),
  exercises: z.array(ExerciseSchema),
});

export const WorkoutSchema = z.object({
  isWorkout: z.boolean().describe('False if the post does not contain a workout or exercise routine.'),
  notWorkoutReason: z.string().nullable(),
  title: z.string().describe('Catchy but descriptive, max 40 characters, e.g. "Upper Body Dumbbell Circuit".'),
  summary: z.string().describe('One or two sentences: what it is, who it suits, what it trains.'),
  category: z.enum(['strength', 'hiit', 'cardio', 'mobility', 'core', 'mixed']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  creatorName: z.string().nullable().describe('Coach or influencer display name.'),
  creatorHandle: z.string().nullable().describe('@handle if known.'),
  equipment: z.array(z.string()),
  targetMuscles: z.array(z.string()),
  blocks: z.array(BlockSchema),
  tips: z.array(z.string()).describe('Coaching tips from the creator or sensible safety/progression advice. Max 4.'),
  assumptions: z.array(z.string()).describe('Everything you had to guess (timings, reps, rounds). Plain, short sentences the user can check.'),
});

export type ClaudeWorkout = z.infer<typeof WorkoutSchema>;
