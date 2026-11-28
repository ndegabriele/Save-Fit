/**
 * One-off repair for workouts imported before the H.264 fix: re-encodes any saved video
 * that iPhones can't play. Run with `npm run fix-videos` while the server is stopped or running.
 */
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { DATA_DIR } from '../src/jobs.ts';
import { ensurePlayable } from '../src/media.ts';

const jobs = await readdir(path.join(DATA_DIR, 'jobs')).catch(() => [] as string[]);
let fixed = 0;
for (const id of jobs) {
  const file = path.join(DATA_DIR, 'jobs', id, 'video.mp4');
  if (await ensurePlayable(file).catch(() => false)) fixed++;
}
console.log(`Checked ${jobs.length} imports, re-encoded ${fixed} video${fixed === 1 ? '' : 's'}.`);
