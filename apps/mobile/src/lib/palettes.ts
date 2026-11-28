/**
 * Colour themes. Each palette has a light and a dark variant, defined as
 * Uniwind themes in global.css (and registered in metro.config.js).
 * The lime accent is the same in every palette.
 * Runtime imports stay out of this file so the node tests can load it.
 */
export type Palette = 'default' | 'bone' | 'mouse' | 'obsidian';
export type Mode = 'system' | 'light' | 'dark';

export const PALETTES: readonly { id: Palette; name: string; blurb: string; swatch: readonly [string, string, string] }[] = [
  { id: 'default', name: 'Save Fit', blurb: 'White and graphite', swatch: ['#F5F5F7', '#FFFFFF', '#1D1D22'] },
  { id: 'bone', name: 'Bone', blurb: 'Warm paper', swatch: ['#F3EDE2', '#FDFBF7', '#C0603A'] },
  { id: 'mouse', name: 'Mouse grey', blurb: 'Grey and blue', swatch: ['#E2E5E9', '#F6F7F9', '#2F6FDB'] },
  { id: 'obsidian', name: 'Obsidian', blurb: 'Volcanic glass', swatch: ['#1F1C24', '#2A2730', '#A27CF0'] },
];

/** Uniwind theme name for a palette, mode and the device scheme; `dark` drives the status bar. */
export function resolveTheme(palette: Palette, mode: Mode, scheme: 'light' | 'dark' | null | undefined): { name: string; dark: boolean } {
  const wantsDark = mode === 'dark' || (mode === 'system' && scheme === 'dark');
  if (palette === 'default') return { name: mode === 'system' ? 'system' : mode, dark: wantsDark };
  // Obsidian is dark either way: its "light" is a lifted, smoky dark; its dark is near-black.
  if (palette === 'obsidian') return { name: wantsDark ? 'obsidian-dark' : 'obsidian-dim-dark', dark: true };
  return { name: `${palette}-${wantsDark ? 'dark' : 'light'}`, dark: wantsDark };
}

/** The player is always dark, in the palette's own dark. */
export function playerTheme(palette: Palette): string {
  return palette === 'default' ? 'dark' : `${palette}-dark`;
}
