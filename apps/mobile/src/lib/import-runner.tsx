import { useEffect, useRef } from 'react';
import { getImport, startImport, type ImportStage } from './api';
import { haptic, play } from './feedback';
import { useStore } from './store';

const POLL_MS = 2500;

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
  useStore.getState().update(workoutId, (x) => ({ ...x, status: 'processing', jobId: job.id, jobStage: 'queued', error: null }));
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
          try {
            const job = await getImport(w.jobId as string);
            if (job.status === 'done' && job.workout) {
              completeImport(w.id, job.workout);
              haptic.success();
              play('done');
            } else if (job.status === 'failed') {
              failImport(w.id, job.error ?? 'The server could not read this video.');
            } else {
              setStage(w.id, job.stage as ImportStage);
            }
          } catch (e) {
            // A 404 means the server restarted and lost the job.
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
