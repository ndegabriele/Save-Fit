export type VoiceCommand = 'play' | 'pause' | 'next' | 'previous';

// Words people actually say, mapped to the four commands. The coach voice only says numbers,
// so it can never trigger one of these.
export const COMMAND_WORDS: Record<string, VoiceCommand> = {
  play: 'play', resume: 'play', go: 'play', start: 'play', continue: 'play',
  pause: 'pause', stop: 'pause', wait: 'pause', hold: 'pause',
  next: 'next', skip: 'next', done: 'next',
  previous: 'previous', back: 'previous', prev: 'previous',
};

/** The last command word in what was heard, if any ("okay next" -> next). Exported for tests. */
export function parseCommand(transcript: string): VoiceCommand | null {
  const words = transcript.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
  for (let i = words.length - 1; i >= 0; i--) {
    const c = COMMAND_WORDS[words[i]!];
    if (c) return c;
  }
  return null;
}

