import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toDraft } from '../src/jobs.ts';
import { detectPlatform, vttToText } from '../src/media.ts';

test('detectPlatform', () => {
  assert.equal(detectPlatform('https://www.instagram.com/reel/abc/'), 'instagram');
  assert.equal(detectPlatform('https://vm.tiktok.com/xyz'), 'tiktok');
  assert.equal(detectPlatform('https://youtu.be/1'), 'youtube');
  assert.equal(detectPlatform('nonsense'), 'other');
});

test('vttToText strips timing and repeated lines', () => {
  const vtt = 'WEBVTT\n\n00:00.000 --> 00:01.000\n<c>Three rounds</c>\n\n00:01.000 --> 00:02.000\nThree rounds\n\n00:02.000 --> 00:03.000\n40 seconds on';
  assert.equal(vttToText(vtt), 'Three rounds 40 seconds on');
});

test('toDraft builds media urls, credits and clips', () => {
  const draft = toDraft(
    {
      isWorkout: true, notWorkoutReason: null, title: 'Legs', summary: 's', category: 'strength', difficulty: 'beginner',
      creatorName: null, creatorHandle: null, equipment: [], targetMuscles: [], tips: [], assumptions: [],
      blocks: [{ title: 'Main', kind: 'main', rounds: 3, restBetweenRoundsSec: 60, exercises: [{
        name: 'Squat', mode: 'reps', durationSec: null, reps: 12, sets: 1, restSec: 0, perSide: false, load: null, tempo: null,
        steps: ['a'], cues: [], commonMistakes: [], muscles: [], equipment: [], easier: null, harder: null, breathing: null,
        clipStartSec: 2, clipEndSec: 6, notes: null }] }],
    },
    { platform: 'instagram', title: null, caption: null, uploader: 'Maya', handle: 'maya.moves', duration: 30, videoFile: 'video.mp4', thumbnailFile: 'video.jpg', subtitles: null, frames: [] },
    { id: 'job1', url: 'https://www.instagram.com/reel/abc/' },
  );
  assert.equal(draft.creators[0]?.name, 'Maya');
  assert.equal(draft.creators[0]?.handle, '@maya.moves');
  assert.equal(draft.source.videoUrl, '/media/job1/video.mp4');
  assert.deepEqual(draft.blocks[0]?.exercises[0]?.clip, { start: 2, end: 6 });
  assert.equal(draft.blocks[0]?.exercises[0]?.durationSec, undefined);
});

test('SSRF guard blocks private and metadata addresses', async () => {
  const { isPrivateIp, assertPublicUrl } = await import('../src/net.ts');
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.5', '169.254.169.254', '100.64.0.1', '::1', 'fd00::1', '::ffff:127.0.0.1']) {
    assert.equal(isPrivateIp(ip), true, ip);
  }
  assert.equal(isPrivateIp('8.8.8.8'), false);
  await assert.rejects(assertPublicUrl('http://169.254.169.254/latest/meta-data'));
  await assert.rejects(assertPublicUrl('http://localhost:8787/'));
  await assert.rejects(assertPublicUrl('file:///etc/passwd'));
});

test('isHandle keeps usernames and drops numeric/channel ids', async () => {
  const { isHandle } = await import('../src/media.ts');
  assert.equal(isHandle('maya.moves'), true);
  assert.equal(isHandle('@coach_laura'), true);
  assert.equal(isHandle('1234567890'), false);
  assert.equal(isHandle('UCabcdefghijklmnopqrstuv'), false);
  assert.equal(isHandle('Has Spaces'), false);
});

test('parseWorkout accepts JSON with prose around it and fills defaults', async () => {
  const { parseWorkout } = await import('../src/convert.ts');
  const json = {
    isWorkout: true, title: 'Legs', summary: 'Quick legs.', category: 'strength', difficulty: 'beginner',
    blocks: [{ title: 'Main', kind: 'main', rounds: 3, restBetweenRoundsSec: 60, exercises: [{ name: 'Squat', mode: 'reps', reps: 10, sets: 1, restSec: 30, perSide: false }] }],
  };
  const ok = parseWorkout(`Here you go:\n${JSON.stringify(json)}\n`);
  assert.equal(ok.ok, true);
  if (ok.ok) assert.deepEqual(ok.workout.blocks[0]!.exercises[0]!.steps, []);
  const bad = parseWorkout('{"isWorkout": true}');
  assert.equal(bad.ok, false);
});
