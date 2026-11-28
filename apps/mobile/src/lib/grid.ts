/** Everything in Save Fit sits on a 4px grid. Use this for any computed size. */
export const GRID = 4;
export const grid = (n: number): number => Math.max(GRID, Math.round(n / GRID) * GRID);
