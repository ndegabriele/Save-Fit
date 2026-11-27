// Guards the 4px grid: spacing, sizes, radii, line heights and icon sizes must be multiples of 4.
// Font sizes follow the type scale (docs/DESIGN.md) and hairline borders (1-2px) are allowed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const files = [];
const walk = (d) => readdirSync(d).forEach((f) => {
  const p = path.join(d, f);
  if (statSync(p).isDirectory()) { if (f !== '__tests__') walk(p); } else if (/\.tsx?$/.test(f)) files.push(p);
});
walk(root);

const PREFIX = String.raw`(?<![\w-])-?(?:p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y|w|h|size|min-w|min-h|max-w|max-h|top|bottom|left|right|inset|inset-x|inset-y|translate-x|translate-y|rounded(?:-[tblrse]{1,2})?|leading)-`;
const RULES = [
  [new RegExp(PREFIX + String.raw`\d+\.5(?![\w.])`, 'g'), () => true],
  [new RegExp(PREFIX + String.raw`\[(-?\d+(?:\.\d+)?)px\]`, 'g'), (m) => Number(m[1]) % 4 !== 0],
  [/border(?:-[tblrxy])?-\[(\d+)px\]/g, (m) => Number(m[1]) > 2 && Number(m[1]) % 4 !== 0],
  [/\b(?:size|width|height|minHeight|minWidth|maxWidth|maxHeight|padding\w*|margin\w*|gap|rowGap|columnGap|borderRadius|lineHeight)\s*[=:]\s*\{?\s*(\d+(?:\.\d+)?)\b/g, (m) => Number(m[1]) % 4 !== 0],
];

test('every size and spacing value sits on the 4px grid', () => {
  const bad = [];
  for (const f of files) {
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      for (const [re, isBad] of RULES) for (const m of line.matchAll(re)) if (isBad(m)) bad.push(`${path.relative(root, f)}:${i + 1} ${m[0]}`);
    });
  }
  assert.deepEqual(bad, []);
});
