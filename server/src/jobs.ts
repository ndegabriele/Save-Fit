import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { convertToWorkout } from './convert.ts';
import { detectPlatform, fetchAvatar, fetchMedia, type Media } from './media.ts';
import type { ClaudeWorkout } from './schema.ts';

export type Stage = 'queued' | 'fetching' | 'reading' | 'watching' | 'structuring' | 'done' | 'failed';

export interface Job {
  id: string;
  status: 'pending' | 'done' | 'failed';
  stage: Stage;
  url: string | null;
  text: string | null;
  workout?: unknown;
  error?: string;
  createdAt: number;
}

export const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');
const jobs = new Map<string, Job>();
const queue: string[] = [];
const CONCURRENCY = Number(process.env.CONCURRENCY || 2);
let running = 0;

const jobDir = (id: string) => path.join(DATA_DIR, 'jobs', id);

async function save(job: Job) {
  jobs.set(job.id, job);
  await mkdir(jobDir(job.id), { recursive: true });
  await writeFile(path.join(jobDir(job.id), 'job.json'), JSON.stringify(job));
}

export async function getJob(id: string): Promise<Job | undefined> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return undefined;
  const cached = jobs.get(id);
  if (cached) return cached;
  try {
    const job = JSON.parse(await readFile(path.join(jobDir(id), 'job.json'), 'utf8')) as Job;
    // A job that was mid-flight when the server stopped will never finish.
    if (job.status === 'pending') return { ...job, status: 'failed', stage: 'failed', error: 'The server restarted. Try again.' };
    return job;
  } catch {
    return undefined;
  }
}

/** Callers' API keys, in memory only: never written to job.json or logged, dropped when the job ends. */
const keys = new Map<string, string>();

export async function createJob(url: string | null, text: string | null, apiKey: string | null = null): Promise<Job> {
  const job: Job = { id: randomUUID(), status: 'pending', stage: 'queued', url, text, createdAt: Date.now() };
  if (apiKey) keys.set(job.id, apiKey);
  await save(job);
  queue.push(job.id);
  void pump();
  return job;
}

async function pump() {
  while (running < CONCURRENCY && queue.length) {
    const id = queue.shift() as string;
    running++;
    void runJob(id).finally(() => {
      running--;
      void pump();
    });
  }
}

async function runJob(id: string) {
  const job = jobs.get(id);
  if (!job) return;
  const dir = jobDir(id);
  const setStage = async (stage: Stage) => save({ ...(jobs.get(id) as Job), stage });
  try {
    let media: Media;
    if (job.url) {
      media = await fetchMedia(job.url, dir, (s) => void setStage(s));
    } else {
      media = { platform: 'other', title: null, caption: null, uploader: null, handle: null, duration: null, videoFile: null, thumbnailFile: null, subtitles: null, frames: [] };
    }
    await setStage('structuring');
    const result = await convertToWorkout(media, dir, job.text, job.url, keys.get(id));
    if (!result.isWorkout) throw new Error(result.notWorkoutReason || "This post doesn't look like a workout.");
    const avatarFile = job.url ? await fetchAvatar(detectPlatform(job.url), media.handle ?? result.creatorHandle, dir) : null;
    await save({ ...(jobs.get(id) as Job), status: 'done', stage: 'done', workout: toDraft(result, media, job, avatarFile) });
    console.log(`[job ${id}] done: ${result.title}`);
  } catch (e) {
    let error = e instanceof Error ? e.message : String(e);
    if (/authentication|invalid x-api-key|401/i.test(error)) error = 'Your Claude API key was rejected. Check it in Settings → AI account.';
    else if (/credit balance|billing/i.test(error)) error = 'Your Anthropic account is out of credit. Add credit at console.anthropic.com.';
    console.error(`[job ${id}] failed: ${error}`);
    await save({ ...(jobs.get(id) as Job), status: 'failed', stage: 'failed', error });
  } finally {
    keys.delete(id);
  }
}

/** Shape Claude's answer into the app's WorkoutDraft (see apps/mobile/src/lib/normalize.ts). */
export function toDraft(w: ClaudeWorkout, media: Media, job: Pick<Job, 'id' | 'url'>, avatarFile: string | null = null) {
  const platform = job.url ? detectPlatform(job.url) : 'other';
  const creator = {
    name: w.creatorName || media.uploader || media.handle || 'Unknown coach',
    handle: w.creatorHandle || (media.handle ? `@${media.handle.replace(/^@/, '')}` : null),
    platform,
    avatarUrl: avatarFile ? `/media/${job.id}/${avatarFile}` : null,
  };
  const videoUrl = media.videoFile ? `/media/${job.id}/${media.videoFile}` : null;
  const thumbnailUrl = media.thumbnailFile ? `/media/${job.id}/${media.thumbnailFile}` : null;
  const source = { url: job.url, videoUrl, thumbnailUrl, creator, workoutTitle: w.title };
  return {
    title: w.title,
    summary: w.summary,
    category: w.category,
    difficulty: w.difficulty,
    creators: [creator],
    equipment: w.equipment,
    targetMuscles: w.targetMuscles,
    tips: w.tips,
    assumptions: w.assumptions,
    source: { url: job.url, videoUrl, thumbnailUrl, creator },
    blocks: w.blocks.map((b) => ({
      title: b.title,
      kind: b.kind,
      rounds: b.rounds,
      restBetweenRoundsSec: b.restBetweenRoundsSec,
      source,
      exercises: b.exercises.map((e) => ({
        name: e.name,
        mode: e.mode,
        durationSec: e.durationSec ?? undefined,
        reps: e.reps ?? undefined,
        sets: e.sets,
        restSec: e.restSec,
        perSide: e.perSide,
        load: e.load,
        tempo: e.tempo,
        steps: e.steps,
        cues: e.cues,
        commonMistakes: e.commonMistakes,
        muscles: e.muscles,
        equipment: e.equipment,
        easier: e.easier,
        harder: e.harder,
        breathing: e.breathing,
        notes: e.notes,
        clip: videoUrl && e.clipStartSec != null && e.clipEndSec != null && e.clipEndSec > e.clipStartSec ? { start: e.clipStartSec, end: e.clipEndSec } : null,
      })),
    })),
  };
}
