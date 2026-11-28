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


/** Every command word in what was heard, in order ("next ... next" -> [next, next]). */
export function commandsIn(transcript: string): VoiceCommand[] {
  return transcript
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .flatMap((w) => (COMMAND_WORDS[w] ? [COMMAND_WORDS[w]!] : []));
}

/** Ignore a second command this soon after one fired (a word heard twice, or the speaker's echo). */
export const COMMAND_GAP_MS = 900;

/**
 * Turns the recogniser's stream of results into commands, each spoken word firing once.
 * Recognisers resend the whole utterance as it grows ("next" -> "next" -> "Next."), and iOS can
 * send the final version seconds later, so a word is only new when the utterance holds more
 * command words than we've already acted on. A final result closes the utterance.
 */
export function createCommandTracker() {
  let handled = 0;
  let lastAt = -Infinity;
  return {
    feed(transcript: string, isFinal: boolean, now: number): VoiceCommand | null {
      const cmds = commandsIn(transcript);
      let fire: VoiceCommand | null = null;
      if (cmds.length > handled && now - lastAt >= COMMAND_GAP_MS) {
        fire = cmds[cmds.length - 1]!;
        lastAt = now;
      }
      // Words skipped by the gap count as handled too. Never count down: a revision can drop a
      // word and add it back ("next" -> "text" -> "next"), and that mustn't fire twice.
      handled = isFinal ? 0 : Math.max(handled, cmds.length);
      return fire;
    },
    /** A new recognition session starts a fresh utterance. */
    reset() {
      handled = 0;
    },
  };
}
