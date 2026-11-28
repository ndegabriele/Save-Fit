import { useEffect, useRef } from 'react';
import { getImport, startImport, type ImportStage } from './api';
import { haptic, play } from './feedback';
import { useStore } from './store';

const POLL_MS = 2500;
/** A job still running after this long is stuck (server crashed mid-way, laptop asleep...). */
const GIVE_UP_MS = 20 * 60_000;

/**
 * Starts an import on the server and adds a "processing" card to the library.
 * The user can leave the import screen; ImportRunner keeps polling.
 */
export async function beginImport(input: { url?: string | null; text?: string | null }): Promise<string> {
  const job = await startImport(input);
  return useStore.getState().addProcessing({ url: input.url, text: input.text, jobId: job.id });
}

export async function retryImport(workoutId: string): Promise<void> {
  const w = useStore.getState().workouts.find((x) => x.id === workoutId);
  if (!w) return;
  const job = await startImport({ url: w.source?.url, text: w.summary });
  useStore.getState().update(workoutId, (x) => ({ ...x, status: 'processing', jobId: job.id, jobStage: 'queued', error: null, updatedAt: Date.now() }));
}

/** Mounted once at the root. Polls every processing workout until it is ready or failed. */
export function ImportRunner() {
  const busy = useRef(false);

  useEffect(() => {
    const tick = async () => {
      if (busy.current) return;
      const pending = useStore.getState().workouts.filter((w) => w.status === 'processing' && w.jobId);
      if (!pending.length) return;
      busy.current = true;
      const { completeImport, failImport, setStage } = useStore.getState();
      await Promise.all(
        pending.map(async (w) => {
          if (Date.now() - w.updatedAt > GIVE_UP_MS) {
            failImport(w.id, 'This import took too long. Check the server is running, then try again.');
            return;
          }
          try {
            const job = await getImport(w.jobId as string);
            if (job.status === 'done' && job.workout) {
              try {
                completeImport(w.id, job.workout);
              } catch {
                // A malformed result would otherwise be fetched (and fail) forever.
                failImport(w.id, 'The workout came back in a shape Save Fit can’t read. Try again.');
                return;
              }
              haptic.success();
              play('done');
            } else if (job.status === 'failed') {
              failImport(w.id, job.error ?? 'The server could not read this video.');
            } else {
              setStage(w.id, job.stage as ImportStage);
            }
          } catch (e) {
            // A 404 means the server restarted and lost the job. Network blips just retry on the next tick.
            if (e instanceof Error && /404|not found/i.test(e.message)) failImport(w.id, 'The import was interrupted. Try again.');
          }
        }),
      );
      busy.current = false;
    };
    const id = setInterval(tick, POLL_MS);
    void tick();
    return () => clearInterval(id);
  }, []);

  return null;
}
