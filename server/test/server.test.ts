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
