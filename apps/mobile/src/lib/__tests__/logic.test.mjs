// Pure-logic tests. Run: npm test (node --test with type stripping).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSequence, workoutSeconds } from '../sequence.ts';
import { mergeWorkouts } from '../merge.ts';
import { normalizeDraft } from '../normalize.ts';

let n = 0;
const id = () => `id${++n}`;

const ex = (over = {}) => ({
  id: id(), name: 'Squat', mode: 'time', durationSec: 30, reps: 10, sets: 1, restSec: 10, perSide: false,
  steps: [], cues: [], commonMistakes: [], muscles: [], equipment: [], ...over,
});
const block = (over = {}) => ({ id: id(), title: 'Main', kind: 'main', rounds: 1, restBetweenRoundsSec: 0, exercises: [ex()], ...over });
const workout = (over = {}) => ({
  id: id(), title: 'W', category: 'strength', difficulty: 'beginner', creators: [{ name: 'A' }], equipment: [], targetMuscles: [],
  blocks: [block()], tips: [], assumptions: [], status: 'ready', createdAt: 0, updatedAt: 0, timesCompleted: 0, ...over,
});

test('timed exercise with sets interleaves rests and drops the trailing rest', () => {
  const steps = buildSequence({ blocks: [block({ exercises: [ex({ sets: 3 })] })] });
  assert.deepEqual(steps.map((s) => s.kind), ['work', 'rest', 'work', 'rest', 'work']);
});

test('per-side exercises produce left and right steps', () => {
  const steps = buildSequence({ blocks: [block({ exercises: [ex({ perSide: true, restSec: 0 })] })] });
  assert.deepEqual(steps.map((s) => s.side), ['left', 'right']);
});

test('rounds add a round rest that replaces a shorter set rest', () => {
  const steps = buildSequence({ blocks: [block({ rounds: 2, restBetweenRoundsSec: 60, exercises: [ex({ restSec: 10 })] })] });
  assert.deepEqual(steps.map((s) => `${s.kind}:${s.durationSec}`), ['work:30', 'rest:60', 'work:30']);
  assert.equal(steps[1].next.name, 'Squat');
});

test('reps steps carry the rep count', () => {
  const steps = buildSequence({ blocks: [block({ exercises: [ex({ mode: 'reps', reps: 12, restSec: 0 })] })] });
  assert.equal(steps[0].mode, 'reps');
  assert.equal(steps[0].reps, 12);
});

test('duration estimate counts work, sides, sets and rests', () => {
  assert.equal(workoutSeconds({ blocks: [block({ exercises: [ex({ sets: 2, perSide: true })] })] }), 2 * (30 * 2 + 10));
});

test('merging keeps order, credits every coach and tags block sources', () => {
  const a = workout({ title: 'Warm-up', category: 'mobility', creators: [{ name: 'Maya' }], source: { url: 'a', videoUrl: '/media/a.mp4' } });
  const b = workout({ title: 'HIIT', category: 'hiit', difficulty: 'advanced', creators: [{ name: 'Theo' }], source: { url: 'b', videoUrl: '/media/b.mp4' } });
  const m = mergeWorkouts([a, b], { id: 'm', now: 1, newId: id });
  assert.equal(m.title, 'Warm-up + HIIT');
  assert.equal(m.category, 'mixed');
  assert.equal(m.difficulty, 'advanced');
  assert.deepEqual(m.creators.map((c) => c.name), ['Maya', 'Theo']);
  assert.deepEqual(m.blocks.map((bl) => bl.source.videoUrl), ['/media/a.mp4', '/media/b.mp4']);
  assert.deepEqual(m.blocks.map((bl) => bl.source.creator.name), ['Maya', 'Theo']);
  assert.notEqual(m.blocks[0].id, a.blocks[0].id);
});

test('merging needs two workouts', () => {
  assert.throws(() => mergeWorkouts([workout()], { id: 'm', now: 1, newId: id }));
});

test('normalizeDraft fills defaults, clamps numbers and drops empty blocks', () => {
  const w = normalizeDraft(
    { title: ' Leg day ', category: 'nope', blocks: [{ exercises: [{ name: 'Lunge', mode: 'reps', reps: 9999, sets: 0 }] }, { exercises: [] }] },
    { id: 'x', createdAt: 0 },
    id,
    5,
  );
  assert.equal(w.title, 'Leg day');
  assert.equal(w.category, 'mixed');
  assert.equal(w.blocks.length, 1);
  assert.equal(w.blocks[0].exercises[0].reps, 500);
  assert.equal(w.blocks[0].exercises[0].sets, 1);
  assert.equal(w.status, 'ready');
});
