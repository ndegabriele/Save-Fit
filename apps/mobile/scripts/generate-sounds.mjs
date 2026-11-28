// Generates the player's short UI sounds as 16-bit mono WAV files.
// Run: node scripts/generate-sounds.mjs
import { writeFileSync } from 'node:fs';

const RATE = 44100;

function tone(notes) {
  // notes: [{ f: Hz, ms: duration, gain }]
  const samples = [];
  for (const { f, ms, gain = 0.5 } of notes) {
    const n = Math.round((RATE * ms) / 1000);
    for (let i = 0; i < n; i++) {
      const t = i / RATE;
      // fast attack, exponential decay: a soft "blip" rather than a harsh beep
      const env = Math.min(1, i / (RATE * 0.004)) * Math.exp((-4 * i) / n);
      const s = Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t);
      samples.push(s * env * gain * 0.8);
    }
  }
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.max(-1, Math.min(1, s)) * 32767, i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const out = new URL('../assets/sounds/', import.meta.url);
writeFileSync(new URL('tick.wav', out), tone([{ f: 880, ms: 110 }]));
writeFileSync(new URL('go.wav', out), tone([{ f: 1320, ms: 320, gain: 0.6 }]));
writeFileSync(new URL('done.wav', out), tone([{ f: 784, ms: 140 }, { f: 988, ms: 140 }, { f: 1319, ms: 380, gain: 0.6 }]));
console.log('sounds written');
