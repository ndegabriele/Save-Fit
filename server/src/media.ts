import { spawn } from 'node:child_process';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assertPublicUrl, safeFetch } from './net.ts';

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
const MAX_ITEMS = Number(process.env.MAX_CAROUSEL_ITEMS || 8);
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
  await assertPublicUrl(url);
  await mkdir(dir, { recursive: true });
  const platform = detectPlatform(url);
  onStage('fetching');

  const cookieArgs = process.env.YTDLP_COOKIES ? ['--cookies', process.env.YTDLP_COOKIES] : [];
  // Carousels (several videos in one post) come back as a playlist: keep up to MAX_ITEMS items.
  const dl = await run(YTDLP, [
    ...cookieArgs,
    '--yes-playlist',
    '--playlist-items', `1-${MAX_ITEMS}`,
    '--no-progress',
    '--print-json',
    '-f', 'b[ext=mp4][height<=720]/bv*[height<=720]+ba/b',
    // Prefer H.264: iPhones can't play VP9 and only newer ones play AV1.
    '-S', 'vcodec:h264,res:720,ext:mp4:m4a',
    '--merge-output-format', 'mp4',
    '--max-filesize', '150M',
    '--write-thumbnail', '--convert-thumbnails', 'jpg',
    '--write-subs', '--write-auto-subs', '--sub-langs', 'en.*,en', '--sub-format', 'vtt',
    '-o', path.join(dir, 'item_%(playlist_index)s.%(ext)s'),
    url,
  ], 300_000);

  const infos = dl.stdout
    .trim()
    .split('\n')
    .flatMap((l) => {
      try {
        return [JSON.parse(l) as Record<string, unknown>];
      } catch {
        return [];
      }
    });
  const files = (await readdir(dir)).sort();
  const items = files.filter((f) => f.startsWith('item_') && f.endsWith('.mp4'));

  if (dl.code === 0 || items.length) {
    const info = infos[0] ?? {};
    const thumbs = files.filter((f) => f.startsWith('item_') && f.endsWith('.jpg'));
    const subtitles = (
      await Promise.all(files.filter((f) => f.endsWith('.vtt')).map(async (f) => vttToText(await readFile(path.join(dir, f), 'utf8'))))
    ).join(' ') || null;
    onStage('watching');
    // One continuous video, so exercise clips and frame timestamps work the same for carousels.
    const video = items.length ? await joinVideos(items.map((f) => path.join(dir, f)), dir) : null;
    const duration = video ? await probeDuration(path.join(dir, video)) : sumDurations(infos);
    const frames = video ? await extractFrames(path.join(dir, video), duration, dir) : [];
    // Photo-only carousels: use each item's image as a frame.
    if (!frames.length) for (const t of thumbs.slice(0, MAX_FRAMES)) frames.push({ file: t, t: 0 });
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
    const pick = (k: string) => infos.map((i) => str(i[k])).find(Boolean) ?? null;
    return {
      platform,
      title: pick('title'),
      caption: pick('description'),
      uploader: pick('uploader') ?? pick('channel') ?? pick('creator'),
      // uploader_id is a username on some platforms and a number on others; keep real handles only.
      handle: [info.uploader_id, info.channel, info.uploader].map(str).find((h) => h && isHandle(h)) ?? null,
      duration,
      videoFile: video,
      thumbnailFile: thumbs[0] ?? null,
      subtitles,
      frames,
    };
  }

  console.warn(`[media] yt-dlp failed (${dl.code}): ${dl.stderr.slice(-400)}`);
  return fetchOpenGraph(url, dir, platform);
}

async function fetchOpenGraph(url: string, dir: string, platform: Platform): Promise<Media> {
  const res = await safeFetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
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
      const img = await safeFetch(image, { headers: { 'User-Agent': UA } });
      // Only keep real images, never arbitrary responses.
      if (!img.headers.get('content-type')?.startsWith('image/')) throw new Error('not an image');
      if (img.ok) {
        await writeFile(path.join(dir, 'thumb.jpg'), Buffer.from(await img.arrayBuffer()));
        thumbnailFile = 'thumb.jpg';
      }
    } catch {}
  }
  const caption = decode(meta('og:description')) ?? decode(meta('description'));
  const title = decode(meta('og:title'));
  const byline = title?.match(/^(.*?)\s*\(@([A-Za-z0-9._]+)\)/) ?? caption?.match(/^(?:[\d.,KkMm]+ likes?, [\d.,KkMm]+ comments? - )?([A-Za-z0-9._]+) on /) ?? null;
  if (!caption && !title) throw new Error("Couldn't read this post. It may be private, or the platform blocked the download.");
  return {
    platform,
    title,
    caption,
    uploader: byline?.[2] ? byline[1]?.trim() || null : null,
    handle: byline?.[2] ?? byline?.[1] ?? null,
    duration: null,
    videoFile: null,
    thumbnailFile,
    subtitles: null,
    frames: thumbnailFile ? [{ file: thumbnailFile, t: 0 }] : [],
  };
}

export function isHandle(s: string): boolean {
  const h = s.replace(/^@/, '');
  return /^[A-Za-z0-9._]{2,30}$/.test(h) && !/^\d+$/.test(h) && !/^UC[A-Za-z0-9_-]{20,}$/.test(h);
}

const PROFILE_URL: Partial<Record<Platform, (h: string) => string>> = {
  instagram: (h) => `https://www.instagram.com/${h}/`,
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
};

/**
 * Best effort: the coach's profile picture is the og:image of their public profile page.
 * Saved as avatar.jpg next to the job's other media. Returns null when anything fails.
 */
export async function fetchAvatar(platform: Platform, handle: string | null, dir: string): Promise<string | null> {
  const h = handle?.replace(/^@/, '');
  const profile = h && isHandle(h) ? PROFILE_URL[platform]?.(h) : undefined;
  if (!profile) return null;
  try {
    const res = await safeFetch(profile, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
    if (!res.ok) return null;
    const html = await res.text();
    const image =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
    if (!image) return null;
    const img = await safeFetch(image.replace(/&amp;/g, '&'), { headers: { 'User-Agent': UA } });
    if (!img.ok || !img.headers.get('content-type')?.startsWith('image/')) return null;
    await writeFile(path.join(dir, 'avatar.jpg'), Buffer.from(await img.arrayBuffer()));
    return 'avatar.jpg';
  } catch {
    return null;
  }
}

function sumDurations(infos: Record<string, unknown>[]): number | null {
  const total = infos.reduce((a, i) => a + (typeof i.duration === 'number' ? i.duration : 0), 0);
  return total > 0 ? total : null;
}

async function probeDuration(file: string): Promise<number | null> {
  const r = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], 30_000);
  const d = Number(r.stdout.trim());
  return r.code === 0 && d > 0 ? d : null;
}

/**
 * One item: rename to video.mp4. Several (a carousel): scale/pad to one 720x1280 portrait
 * canvas and concatenate. Audio is dropped because items may not all have it.
 */
export async function joinVideos(files: string[], dir: string): Promise<string | null> {
  const out = path.join(dir, 'video.mp4');
  if (files.length === 1) {
    await rename(files[0]!, out);
    await ensurePlayable(out);
    return 'video.mp4';
  }
  const filters = files.map((_, i) => `[${i}:v]scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v${i}]`);
  const concat = `${files.map((_, i) => `[v${i}]`).join('')}concat=n=${files.length}:v=1:a=0[v]`;
  const r = await run('ffmpeg', [
    '-y', '-loglevel', 'error',
    ...files.flatMap((f) => ['-i', f]),
    '-filter_complex', [...filters, concat].join(';'),
    '-map', '[v]', '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-movflags', '+faststart',
    out,
  ], 300_000);
  if (r.code === 0) return 'video.mp4';
  console.warn(`[media] joining carousel failed: ${r.stderr.slice(-300)}`);
  await rename(files[0]!, out);
  return 'video.mp4';
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

/** The first video stream's codec name ("h264", "vp9", "av1", "hevc"), or null. */
export async function videoCodec(file: string): Promise<string | null> {
  const r = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name', '-of', 'default=nw=1:nk=1', file], 30_000);
  return r.code === 0 ? r.stdout.trim() || null : null;
}

/**
 * Re-encodes a video to H.264 + AAC with the index at the front when it isn't already H.264,
 * so it plays in every iPhone and Android video player. Leaves the file alone if that fails.
 */
export async function ensurePlayable(file: string): Promise<boolean> {
  const codec = await videoCodec(file);
  if (!codec || codec === 'h264') return false;
  const tmp = `${file}.h264.mp4`;
  const r = await run('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', file,
    '-map', '0:v:0', '-map', '0:a:0?',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p',
    '-vf', "scale='min(720,iw)':-2",
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
    tmp,
  ], 300_000);
  if (r.code !== 0) {
    console.warn(`[media] re-encoding ${codec} to H.264 failed: ${r.stderr.slice(-300)}`);
    return false;
  }
  await rename(tmp, file);
  console.log(`[media] re-encoded ${codec} video to H.264`);
  return true;
}
