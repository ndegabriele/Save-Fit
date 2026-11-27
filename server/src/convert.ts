import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Media } from './media.ts';
import { z } from 'zod';
import { WorkoutSchema, type ClaudeWorkout } from './schema.ts';

const JSON_INSTRUCTIONS = `

Answer with one JSON object and nothing else (no prose, no code fences). It must match this JSON Schema exactly, using null for unknown nullable fields:
${JSON.stringify(z.toJSONSchema(WorkoutSchema))}`;

/** Pulls the JSON object out of Claude's reply and validates it. */
export function parseWorkout(text: string): { ok: true; workout: ClaudeWorkout } | { ok: false; error: string } {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return { ok: false, error: 'no JSON object found' };
  let data: unknown;
  try {
    data = JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    return { ok: false, error: `invalid JSON (${(e as Error).message})` };
  }
  const parsed = WorkoutSchema.safeParse(data);
  if (parsed.success) return { ok: true, workout: parsed.data };
  return { ok: false, error: z.prettifyError(parsed.error).slice(0, 1500) };
}

/**
 * Each request uses the caller's own key (sent by the app, kept only in memory for the job).
 * ANTHROPIC_API_KEY in .env is an optional fallback for a self-hosted server.
 */
export function claudeClient(apiKey?: string | null): Anthropic {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('No Claude API key. Add yours in the app: Settings → AI account.');
  return new Anthropic({ apiKey: key });
}

/** Cheap check that a key works (no tokens used). */
export async function checkKey(apiKey: string): Promise<void> {
  await claudeClient(apiKey).models.retrieve(MODEL);
}

export const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-5-5';
const EFFORT = (process.env.CLAUDE_EFFORT || 'medium') as 'low' | 'medium' | 'high';

export const SYSTEM_PROMPT = `You are an experienced strength & conditioning coach. You turn social-media workout posts (Instagram reels, TikToks, Shorts) into clear, structured workouts that someone can follow on their phone with a timer.

You receive the post's caption, title and creator, sometimes captions/subtitles of what is said, and frames sampled from the video with their timestamps. Combine all of them: captions often list exercises and numbers, while frames show the movements, equipment and on-screen text (read overlaid text carefully, it often holds sets, reps and timings).

How to structure it:
- Split the routine into blocks in the order performed: warm-up, main/circuit blocks, finisher, cool-down. Only create blocks the post actually contains; a single circuit is fine.
- A circuit done N times is ONE block with rounds = N, each exercise sets = 1. Straight sets ("3 x 10") use sets on the exercise and rounds = 1.
- mode "time" for intervals, holds and anything given in seconds; mode "reps" when the target is a rep count. Unilateral moves get perSide = true with reps/time per side.
- Use the creator's numbers exactly when stated. When something is missing, choose sensible coaching defaults (e.g. 40s work / 20s rest for HIIT, 3 x 10-12 with 60s rest for hypertrophy, 30-45s holds for stretches) and add a short line to "assumptions" saying what you guessed, so the user can check it.
- Name exercises with their standard names. Give each one 3-5 short, imperative steps a beginner can follow, 2-3 tiny cues (max 4 words), 1-3 common mistakes, main muscles, equipment, a regression and a progression.
- Use the frame timestamps to set clipStartSec/clipEndSec to the part of the video that demonstrates each exercise. Leave them null if no frame shows it.
- Write for the user directly, in plain English, without hashtags or emojis. Keep the creator's original intent; don't invent extra exercises.
- Credit the creator (creatorName, creatorHandle) from the metadata or what the video shows.
- If the post isn't a workout at all, set isWorkout = false, explain briefly in notWorkoutReason, and return empty blocks.`;

export async function convertToWorkout(media: Media, dir: string, extraText: string | null, sourceUrl: string | null, apiKey?: string | null): Promise<ClaudeWorkout> {
  const client = claudeClient(apiKey);
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];

  const meta = [
    sourceUrl ? `Link: ${sourceUrl}` : null,
    `Platform: ${media.platform}`,
    media.uploader ? `Creator: ${media.uploader}${media.handle ? ` (@${media.handle.replace(/^@/, '')})` : ''}` : null,
    media.title ? `Title: ${media.title}` : null,
    media.duration ? `Video length: ${Math.round(media.duration)}s` : null,
    media.caption ? `Caption:\n${media.caption}` : null,
    extraText ? `Text the user shared or added:\n${extraText}` : null,
    media.subtitles ? `Spoken/subtitle text:\n${media.subtitles}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');
  content.push({ type: 'text', text: meta || 'No caption available.' });

  for (const frame of media.frames) {
    const data = (await readFile(path.join(dir, frame.file))).toString('base64');
    content.push({ type: 'text', text: `Frame at ${frame.t}s` });
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } });
  }
  content.push({ type: 'text', text: 'Turn this into a structured workout.' });

  // No constrained decoding: the workout schema is too big for a strict JSON grammar
  // ("compiled grammar is too large"). Claude writes JSON against the schema in the
  // system prompt, we validate it with Zod, and ask once for a fix if it doesn't match.
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content }];
  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT + JSON_INSTRUCTIONS,
      output_config: { effort: EFFORT },
      messages,
    });
    if (response.stop_reason === 'refusal') throw new Error('The AI declined to process this post.');
    if (response.stop_reason === 'max_tokens') throw new Error('The workout was too long to process in one go.');
    const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n');
    const result = parseWorkout(text);
    if (result.ok) return result.workout;
    lastError = result.error;
    messages.push({ role: 'assistant', content: response.content as Anthropic.Beta.BetaContentBlockParam[] });
    messages.push({ role: 'user', content: `That JSON doesn't match the schema: ${result.error}\nReply with the complete corrected JSON only.` });
  }
  console.warn(`[convert] invalid JSON after retry: ${lastError.slice(0, 300)}`);
  throw new Error('The AI returned an unreadable answer. Try again.');
}
