import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDays, dateKey, dayChip, formatTime, fromKey, plansOn, snapTime, timeToY, upcomingDays, HOUR_H } from '../plan.ts';

test('date keys round-trip in local time and cross month ends', () => {
  const d = new Date(2026, 10, 30);
  assert.equal(dateKey(d), '2026-11-30');
  assert.equal(dateKey(addDays(d, 1)), '2026-12-01');
  assert.equal(dateKey(fromKey('2026-12-01')), '2026-12-01');
  assert.deepEqual(upcomingDays(d, 3), ['2026-11-30', '2026-12-01', '2026-12-02']);
});

test('times format as 24 h and snap to 15 minutes inside the day', () => {
  assert.equal(formatTime(7 * 60 + 5), '07:05');
  assert.equal(snapTime(7 * 60 + 8), 7 * 60 + 15);
  assert.equal(snapTime(-30), 0);
  assert.equal(snapTime(2000), 1425);
});

test('chips show the weekday name and flag today', () => {
  const today = new Date(2026, 10, 27); // Friday
  assert.deepEqual(dayChip('2026-11-27', today), { top: 'Fri', day: 27, isToday: true });
  assert.deepEqual(dayChip('2026-11-28', today), { top: 'Sat', day: 28, isToday: false });
});

test('plans for a day come back in time order and sit at the right height', () => {
  const plans = [
    { id: 'a', workoutId: 'w', date: '2026-11-28', minutes: 18 * 60 },
    { id: 'b', workoutId: 'w', date: '2026-11-28', minutes: 7 * 60 },
    { id: 'c', workoutId: 'w', date: '2026-11-29', minutes: 9 * 60 },
  ];
  assert.deepEqual(plansOn(plans, '2026-11-28').map((p) => p.id), ['b', 'a']);
  assert.equal(timeToY(6 * 60), HOUR_H);
});
