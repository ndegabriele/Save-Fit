import { spawn } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type Platform = 'instagram' | 'tiktok' | 'youtube' | 'other';

export interface Media {
  platform: Platform;
  title: string | null;
  caption: string | null;
  uploader: string | null;
  handle: string | null;
  duration: number | null;
  videoFile: string | null;
  thumbnailFile: string | null;
  subtitles: string | null;
  frames: { file: string; t: number }[];
}

const YTDLP = process.env.YTDLP_PATH || 'yt-dlp';
const MAX_FRAMES = Number(process.env.MAX_FRAMES || 24);
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

export function detectPlatform(url: string): Platform {
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  })();
  if (/instagram\.com$/.test(host)) return 'instagram';
  if (/tiktok\.com$/.test(host)) return 'tiktok';
  if (/youtube\.com$|youtu\.be$/.test(host)) return 'youtube';
  return 'other';
}

function run(cmd: string, args: string[], timeoutMs = 120_000): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('error', (e) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: String(e) });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}

/** Downloads the post with yt-dlp; falls back to Open Graph tags (caption + thumbnail) if that fails. */
export async function fetchMedia(url: string, dir: string, onStage: (s: 'fetching' | 'watching') => void): Promise<Media> {
  await mkdir(dir, { recursive: true });
  const platform = detectPlatform(url);
  onStage('fetching');

  const cookieArgs = process.env.YTDLP_COOKIES ? ['--cookies', process.env.YTDLP_COOKIES] : [];
  const dl = await run(YTDLP, [
    ...cookieArgs,
    '--no-playlist',
    '--no-progress',
    '--print-json',
    '-f', 'b[ext=mp4][height<=720]/bv*[height<=720]+ba/b',
    '--merge-output-format', 'mp4',
    '--max-filesize', '150M',
    '--write-thumbnail', '--convert-thumbnails', 'jpg',
    '--write-subs', '--write-auto-subs', '--sub-langs', 'en.*,en', '--sub-format', 'vtt',
    '-o', path.join(dir, 'video.%(ext)s'),
    url,
  ], 180_000);

  if (dl.code === 0) {
    const info = JSON.parse(dl.stdout.trim().split('\n').pop() || '{}') as Record<string, unknown>;
    const files = await readdir(dir);
    const video = files.find((f) => f.startsWith('video.') && f.endsWith('.mp4')) ?? null;
    const thumb = files.find((f) => f.endsWith('.jpg')) ?? null;
    const subFile = files.find((f) => f.endsWith('.vtt'));
    const subtitles = subFile ? vttToText(await readFile(path.join(dir, subFile), 'utf8')) : null;
    const duration = typeof info.duration === 'number' ? info.duration : null;
    onStage('watching');
    const frames = video ? await extractFrames(path.join(dir, video), duration, dir) : [];
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
    return {
      platform,
      title: str(info.title),
      caption: str(info.description),
      uploader: str(info.uploader) ?? str(info.channel) ?? str(info.creator),
      handle: str(info.uploader_id) ?? str(info.channel_id),
      duration,
      videoFile: video,
      thumbnailFile: thumb,
      subtitles,
      frames,
    };
  }

  console.warn(`[media] yt-dlp failed (${dl.code}): ${dl.stderr.slice(-400)}`);
  return fetchOpenGraph(url, dir, platform);
}

async function fetchOpenGraph(url: string, dir: string, platform: Platform): Promise<Media> {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`Couldn't open the link (${res.status}). Is the post public?`);
  const html = await res.text();
  const meta = (prop: string) =>
    html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i'))?.[1] ??
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'))?.[1] ??
    null;
  const decode = (s: string | null) =>
    s?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))) ?? null;

  let thumbnailFile: string | null = null;
  const image = decode(meta('og:image'));
  if (image) {
    try {
      const img = await fetch(image, { headers: { 'User-Agent': UA } });
      if (img.ok) {
        await writeFile(path.join(dir, 'thumb.jpg'), Buffer.from(await img.arrayBuffer()));
        thumbnailFile = 'thumb.jpg';
      }
    } catch {}
  }
  const caption = decode(meta('og:description')) ?? decode(meta('description'));
  const title = decode(meta('og:title'));
  if (!caption && !title) throw new Error("Couldn't read this post. It may be private, or the platform blocked the download.");
  return {
    platform,
    title,
    caption,
    uploader: null,
    handle: null,
    duration: null,
    videoFile: null,
    thumbnailFile,
    subtitles: null,
    frames: thumbnailFile ? [{ file: thumbnailFile, t: 0 }] : [],
  };
}

/** Evenly spaced, downscaled frames with their timestamps, for Claude to "watch" the video. */
export async function extractFrames(video: string, duration: number | null, dir: string): Promise<{ file: string; t: number }[]> {
  const total = duration && duration > 0 ? duration : 60;
  const count = Math.max(4, Math.min(MAX_FRAMES, Math.round(total / 2)));
  const interval = total / count;
  const frames: { file: string; t: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = Math.min(total - 0.1, interval * i + interval / 2);
    const file = `frame_${String(i).padStart(3, '0')}.jpg`;
    const r = await run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', t.toFixed(2), '-i', video, '-frames:v', '1', '-vf', 'scale=512:-2', '-q:v', '5', path.join(dir, file)], 30_000);
    if (r.code === 0) frames.push({ file, t: Math.round(t * 10) / 10 });
  }
  return frames;
}

export function vttToText(vtt: string): string {
  const lines = vtt
    .split('\n')
    .filter((l) => l && !l.startsWith('WEBVTT') && !l.includes('-->') && !/^\d+$/.test(l.trim()) && !/^(Kind|Language):/.test(l))
    .map((l) => l.replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);
  // Auto-captions repeat lines; keep the first of each run.
  return lines.filter((l, i) => l !== lines[i - 1]).join(' ').slice(0, 8000);
}
