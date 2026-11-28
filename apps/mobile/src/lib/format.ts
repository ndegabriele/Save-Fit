import type { BlockKind, Category, Creator, Difficulty, Exercise } from './types';

export function clock(totalSec: number): string {
  const s = Math.max(0, Math.ceil(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/** "45s", "1 min", "1 min 30s" */
export function shortDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return r ? `${m} min ${r}s` : `${m} min`;
}

export function creatorLine(creators: Creator[]): string {
  if (!creators.length) return 'Unknown coach';
  const names = creators.map((c) => c.name || c.handle || 'Coach');
  if (names.length <= 2) return names.join(' & ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  strength: 'Strength',
  hiit: 'HIIT',
  cardio: 'Cardio',
  mobility: 'Mobility',
  core: 'Core',
  mixed: 'Mixed',
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const BLOCK_LABEL: Record<BlockKind, string> = {
  warmup: 'Warm-up',
  main: 'Main set',
  circuit: 'Circuit',
  finisher: 'Finisher',
  cooldown: 'Cool-down',
};

export function plural(n: number, word: string, many = `${word}s`): string {
  return `${n} ${n === 1 ? word : many}`;
}

/** "3 × 12 reps each side · 30s rest" */
export function exerciseMeta(e: Exercise): string {
  const work = e.mode === 'time' ? shortDuration(e.durationSec) : `${e.reps} reps`;
  const sets = e.sets > 1 ? `${e.sets} × ${work}` : work;
  const side = e.perSide ? ' each side' : '';
  const rest = e.restSec ? ` · ${shortDuration(e.restSec)} rest` : '';
  return `${sets}${side}${rest}`;
}

