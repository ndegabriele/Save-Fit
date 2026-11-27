import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { z } from 'zod';
import { checkKey } from './convert.ts';
import { createJob, DATA_DIR, getJob } from './jobs.ts';

const app = new Hono();
const TOKEN = process.env.APP_TOKEN;

app.use('*', cors());

app.get('/health', (c) => c.json({ ok: true }));

// Optional shared-secret auth for the API (media stays public so the video player can stream it).
app.use('/v1/*', async (c, next) => {
  if (TOKEN && c.req.header('Authorization') !== `Bearer ${TOKEN}`) return c.json({ error: 'Unauthorized' }, 401);
  await next();
});

const ImportBody = z.object({
  url: z.string().url().max(2048).nullish(),
  text: z.string().max(10_000).nullish(),
});

app.post('/v1/imports', async (c) => {
  const parsed = ImportBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Send a valid "url" and/or "text".' }, 400);
  const { url, text } = parsed.data;
  if (!url && !text?.trim()) return c.json({ error: 'Send a link or some text.' }, 400);
  if (url && !/^https?:/i.test(url)) return c.json({ error: 'Only http(s) links are supported.' }, 400);
  const apiKey = userKey(c.req.header('X-Anthropic-Key'));
  if (!apiKey && !process.env.ANTHROPIC_API_KEY) return c.json({ error: 'Add your Claude API key in Settings → AI account.' }, 400);
  const job = await createJob(url ?? null, text?.trim() || null, apiKey);
  return c.json(publicJob(job), 202);
});

// Checks a user's key without storing it.
app.post('/v1/check-key', async (c) => {
  const apiKey = userKey(c.req.header('X-Anthropic-Key'));
  if (!apiKey) return c.json({ error: 'No key sent.' }, 400);
  try {
    await checkKey(apiKey);
    return c.json({ ok: true });
  } catch (e) {
    const status = (e as { status?: number }).status;
    return c.json({ error: status === 401 ? 'That key was rejected by Anthropic.' : 'Couldn’t check the key right now.' }, status === 401 ? 401 : 502);
  }
});

app.get('/v1/imports/:id', async (c) => {
  const job = await getJob(c.req.param('id'));
  if (!job) return c.json({ error: 'Import not found' }, 404);
  return c.json(publicJob(job));
});

function userKey(raw: string | undefined): string | null {
  const key = raw?.trim();
  return key && /^sk-ant-[\w-]{20,300}$/.test(key) ? key : null;
}

const TYPES: Record<string, string> = { '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

// Serves downloaded videos and thumbnails, with HTTP range support for video players.
app.get('/media/:id/:file', async (c) => {
  const { id, file } = c.req.param();
  if (!/^[0-9a-f-]{36}$/.test(id) || !/^[\w.-]+$/.test(file) || file.endsWith('.json')) return c.notFound();
  const full = path.join(DATA_DIR, 'jobs', id, file);
  const info = await stat(full).catch(() => null);
  if (!info?.isFile()) return c.notFound();
  const type = TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  const range = c.req.header('Range')?.match(/bytes=(\d*)-(\d*)/);
  const headers: Record<string, string> = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=31536000, immutable' };
  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
    if (start >= info.size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${info.size}` } });
    const stream = Readable.toWeb(createReadStream(full, { start, end })) as ReadableStream;
    return new Response(stream, { status: 206, headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${info.size}`, 'Content-Length': String(end - start + 1) } });
  }
  const stream = Readable.toWeb(createReadStream(full)) as ReadableStream;
  return new Response(stream, { headers: { ...headers, 'Content-Length': String(info.size) } });
});

function publicJob(job: Awaited<ReturnType<typeof getJob>> & object) {
  return { id: job.id, status: job.status, stage: job.stage, workout: job.workout, error: job.error };
}

const port = Number(process.env.PORT || 8787);
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, () => console.log(`Save Fit server on http://0.0.0.0:${port} (model ${process.env.CLAUDE_MODEL || 'claude-opus-5-5'})`));

export default app;
