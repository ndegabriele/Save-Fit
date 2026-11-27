/**
 * Save Fit data model.
 *
 * A Workout is made of Blocks (warm-up, main circuit, cool-down ...).
 * Each Block keeps its own `source`, so a merged workout can mix videos and
 * creators: warm-up from creator A, main set from B, stretch from C.
 */

export type Category = 'strength' | 'hiit' | 'cardio' | 'mobility' | 'core' | 'mixed';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type BlockKind = 'warmup' | 'main' | 'circuit' | 'finisher' | 'cooldown';
export type ExerciseMode = 'time' | 'reps';
export type Platform = 'instagram' | 'tiktok' | 'youtube' | 'other';

export interface Creator {
  name: string;
  handle?: string | null;
  platform?: Platform;
}

export interface Source {
  /** Original post link (Instagram / TikTok / YouTube ...). */
  url?: string | null;
  /** Video we can stream for clips (served by the Save Fit server). */
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  creator?: Creator | null;
  /** Title of the workout the block came from (for merged workouts). */
  workoutTitle?: string | null;
  workoutId?: string | null;
}

export interface Exercise {
  id: string;
  name: string;
  mode: ExerciseMode;
  /** Seconds of work per set when mode === 'time'. */
  durationSec: number;
  /** Reps per set when mode === 'reps'. */
  reps: number;
  sets: number;
  /** Rest after each set, seconds. */
  restSec: number;
  /** Do the exercise on each side (left then right). */
  perSide: boolean;
  /** e.g. "2 × 8 kg dumbbells", "bodyweight". */
  load?: string | null;
  /** e.g. "3-1-1", "slow on the way down". */
  tempo?: string | null;
  /** Numbered how-to steps. */
  steps: string[];
  /** Short form cues shown during the workout. */
  cues: string[];
  commonMistakes: string[];
  muscles: string[];
  equipment: string[];
  easier?: string | null;
  harder?: string | null;
  breathing?: string | null;
  /** Segment of the source video that shows this movement. */
  clip?: { start: number; end: number } | null;
  notes?: string | null;
}

export interface Block {
  id: string;
  title: string;
  kind: BlockKind;
  rounds: number;
  restBetweenRoundsSec: number;
  exercises: Exercise[];
  source?: Source | null;
}

export type WorkoutStatus = 'processing' | 'ready' | 'failed';

export interface Workout {
  id: string;
  title: string;
  summary?: string | null;
  category: Category;
  difficulty: Difficulty;
  creators: Creator[];
  equipment: string[];
  targetMuscles: string[];
  blocks: Block[];
  /** General tips from the creator / AI (safety, progressions ...). */
  tips: string[];
  /** Things the AI had to guess. Shown so the user knows what to check. */
  assumptions: string[];
  source?: Source | null;
  status: WorkoutStatus;
  /** Server import job id while processing. */
  jobId?: string | null;
  jobStage?: string | null;
  error?: string | null;
  mergedFrom?: string[];
  createdAt: number;
  updatedAt: number;
  lastPlayedAt?: number | null;
  timesCompleted: number;
}
