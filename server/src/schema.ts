import { z } from 'zod';

/**
 * What Claude returns. It mirrors the app's Workout model (apps/mobile/src/lib/types.ts)
 * minus ids and app state. The app normalizes and clamps everything on arrival.
 */
export const ExerciseSchema = z.object({
  name: z.string().describe('Common exercise name in Title Case, e.g. "Dumbbell Romanian Deadlift".'),
  mode: z.enum(['time', 'reps']).describe('"time" for intervals/holds, "reps" when a rep count is the target.'),
  durationSec: z.number().nullish().describe('Work seconds per set (mode=time). null for reps.'),
  reps: z.number().nullish().describe('Reps per set (mode=reps), per side if perSide. null for time.'),
  sets: z.number().describe('Sets of this exercise within one round. Usually 1 in circuits.'),
  restSec: z.number().describe('Rest after each set in seconds. 0 if moving straight on.'),
  perSide: z.boolean().describe('True when done on each side / each leg / each arm.'),
  load: z.string().nullish().describe('Always set. Weight, resistance or how to hold it, e.g. "2 × 10 kg dumbbells", "1 kettlebell held by the horns" or "Bodyweight".'),
  tempo: z.string().nullish().describe('Always set, e.g. "2-1-1" (down-pause-up) or "Controlled" for timed moves.'),
  steps: z.array(z.string()).default([]).describe('Exactly 3 short imperative how-to steps, in order: set up, move, finish.'),
  cues: z.array(z.string()).default([]).describe('Exactly 2 very short form cues (max 4 words each).'),
  commonMistakes: z.array(z.string()).default([]).describe('Exactly 2 frequent mistakes to avoid.'),
  muscles: z.array(z.string()).default([]).describe('Main muscles worked, plain English.'),
  equipment: z
    .array(z.string())
    .default([])
    .describe('Plain equipment names only, e.g. "Kettlebell", "Dumbbells", "Bench". No grips, weights or how to hold it: that goes in load or steps.'),
  easier: z.string().nullish().describe('Always set: one regression for beginners.'),
  harder: z.string().nullish().describe('Always set: one progression.'),
  breathing: z.string().nullish().describe('Always set: one short line, e.g. "Exhale as you press".'),
  clipStartSec: z.number().nullish().describe('Start of the video segment that shows this exercise, from the frame timestamps.'),
  clipEndSec: z.number().nullish(),
  notes: z.string().nullish(),
});

export const BlockSchema = z.object({
  title: z.string().describe('The standard name for the kind ("Warm-up", "Main set", "Circuit", "Finisher", "Cool-down"). Not the creator\'s nickname for it.'),
  kind: z.enum(['warmup', 'main', 'circuit', 'finisher', 'cooldown']),
  rounds: z.number().describe('How many times the block is repeated.'),
  restBetweenRoundsSec: z.number(),
  exercises: z.array(ExerciseSchema),
});

export const WorkoutSchema = z.object({
  isWorkout: z.boolean().describe('False if the post does not contain a workout or exercise routine.'),
  notWorkoutReason: z.string().nullish(),
  title: z.string().describe('Catchy but descriptive, max 40 characters, e.g. "Upper Body Dumbbell Circuit".'),
  summary: z.string().describe('Exactly two short sentences: what it is and what it trains, then who it suits. Max 200 characters.'),
  category: z.enum(['strength', 'hiit', 'cardio', 'mobility', 'core', 'mixed']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  creatorName: z.string().nullish().describe('Coach or influencer display name.'),
  creatorHandle: z.string().nullish().describe('@handle if known.'),
  equipment: z.array(z.string()).default([]).describe('Every piece of equipment any exercise uses, plain names, e.g. "Kettlebell", "Mat". Empty for bodyweight only.'),
  targetMuscles: z.array(z.string()).default([]).describe('The 4 main muscle groups trained, plain English ("Forearms", "Biceps"), most worked first.'),
  blocks: z.array(BlockSchema),
  tips: z.array(z.string()).default([]).describe('Exactly 3 coaching tips: the creator\'s own first, then safety or progression advice. One sentence each.'),
  assumptions: z.array(z.string()).default([]).describe('Everything you had to guess (timings, reps, rounds). Plain, short sentences the user can check.'),
});

export type ClaudeWorkout = z.infer<typeof WorkoutSchema>;
