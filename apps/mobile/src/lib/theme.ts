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

/** Gradient stops need a hex we can append alpha to; theme colours come back as oklch() or rgb(). */
export function toHex(c: string): string {
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  const rgb = c.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (rgb) return '#' + [rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('');
  const ok = c.match(/oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/i);
  if (!ok) return '#808080';
  const L = Number(ok[1]) / (ok[2] ? 100 : 1);
  const C = Number(ok[3]);
  const h = (Number(ok[4]) * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
  return (
    '#' +
    lin
      .map((v) => {
        const x = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
        return Math.round(Math.min(1, Math.max(0, x)) * 255)
          .toString(16)
          .padStart(2, '0');
      })
      .join('')
  );
}
