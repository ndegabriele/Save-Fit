import Constants from 'expo-constants';
import type { WorkoutDraft } from './normalize';
import { loadAiKey } from './ai-key';
import { useStore } from './store';

export type ImportStage = 'queued' | 'fetching' | 'reading' | 'watching' | 'structuring' | 'done' | 'failed';

export interface ImportJob {
  id: string;
  status: 'pending' | 'done' | 'failed';
  stage: ImportStage;
  workout?: WorkoutDraft;
  error?: string;
}

export function apiUrl(): string {
  const override = useStore.getState().settings.apiUrl.trim();
  const fromBuild = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? '';
  return (override || fromBuild || process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');
}

export function hasServer(): boolean {
  return apiUrl().length > 0;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = process.env.EXPO_PUBLIC_APP_TOKEN;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/** fetch with a time limit: iOS otherwise waits about a minute on an address that never answers. */
async function request(url: string, init: RequestInit = {}, ms = 15_000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (ctrl.signal.aborted) throw new Error('The server took too long to answer.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Server error (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {}
    throw new Error(message);
  }
  try {
    return (await res.json()) as T;
  } catch {
    throw new Error('That address answered, but not like a Save Fit server.');
  }
}

export async function startImport(input: { url?: string | null; text?: string | null }): Promise<ImportJob> {
  const base = apiUrl();
  if (!base) throw new Error('No server configured. Add the server address in Settings.');
  const key = await loadAiKey();
  if (!key) throw new Error('Add your Claude API key in Settings → AI account first.');
  return json<ImportJob>(
    await request(`${base}/v1/imports`, { method: 'POST', headers: { ...headers(), 'X-Anthropic-Key': key }, body: JSON.stringify(input) }, 30_000),
  );
}

/** Asks the server to verify a key with Anthropic. Returns an error message, or null when it works. */
export async function checkAiKey(key: string): Promise<string | null> {
  const base = apiUrl();
  if (!base) return 'Add the server address below first.';
  try {
    const res = await request(`${base}/v1/check-key`, { method: 'POST', headers: { ...headers(), 'X-Anthropic-Key': key } }, 30_000);
    if (res.ok) return null;
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return body.error ?? `Server error (${res.status})`;
  } catch {
    return 'Can’t reach the server.';
  }
}

export async function getImport(jobId: string): Promise<ImportJob> {
  return json<ImportJob>(await request(`${apiUrl()}/v1/imports/${jobId}`, { headers: headers() }));
}

export async function ping(base: string): Promise<boolean> {
  try {
    const res = await request(`${base.replace(/\/+$/, '')}/health`, {}, 6_000);
    return res.ok;
  } catch {
    return false;
  }
}

/** Media paths from the server are relative; make them absolute. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^(https?|data|file):/.test(path)) return path;
  return `${apiUrl()}${path.startsWith('/') ? '' : '/'}${path}`;
}

export const STAGE_COPY: Record<ImportStage, string> = {
  queued: 'Lining things up',
  fetching: 'Grabbing the video',
  reading: 'Reading the caption',
  watching: 'Watching the moves',
  structuring: 'Writing your workout',
  done: 'Ready!',
  failed: 'Something went wrong',
};
