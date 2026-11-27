import { useCSSVariable } from 'uniwind';
import type { Category } from './types';

/** Resolve a design token (e.g. "accent", "cat-strength") to a color string for SVG / icons. */
export function useColor(token: string): string {
  const v = useCSSVariable(`--color-${token}`);
  return typeof v === 'string' ? v : '#888888';
}

export function useColors<const T extends readonly string[]>(tokens: T): { [K in keyof T]: string } {
  const values = useCSSVariable(tokens.map((t) => `--color-${t}`));
  return (values as unknown[]).map((v) => (typeof v === 'string' ? v : '#888888')) as { [K in keyof T]: string };
}

export const CATEGORY_BG: Record<Category, string> = {
  strength: 'bg-cat-strength',
  hiit: 'bg-cat-hiit',
  cardio: 'bg-cat-cardio',
  mobility: 'bg-cat-mobility',
  core: 'bg-cat-core',
  mixed: 'bg-cat-mixed',
};

export const CATEGORY_INK: Record<Category, string> = {
  strength: 'text-cat-strength-ink',
  hiit: 'text-cat-hiit-ink',
  cardio: 'text-cat-cardio-ink',
  mobility: 'text-cat-mobility-ink',
  core: 'text-cat-core-ink',
  mixed: 'text-cat-mixed-ink',
};

/** Strokes in a darker shade of the tile, matching its icons. */
export const CATEGORY_BORDER: Record<Category, string> = {
  strength: 'border-cat-strength-ink',
  hiit: 'border-cat-hiit-ink',
  cardio: 'border-cat-cardio-ink',
  mobility: 'border-cat-mobility-ink',
  core: 'border-cat-core-ink',
  mixed: 'border-cat-mixed-ink',
};
