import Animated, { useReducedMotion } from 'react-native-reanimated';
import { EASE_OUT_CSS } from '@/lib/motion';
import { cn } from 'heroui-native';
import { View } from 'react-native';
import { AppText } from '@/components/ui/text';
import type { Step } from '@/lib/sequence';

/** Round of each step; rests take the round of the move before them (or after, at the start of a part). */
export function stepRounds(steps: Step[]): number[] {
  const out: number[] = [];
  steps.forEach((s, i) => {
    if (s.kind === 'work') out.push(s.round);
    else {
      const prev = i > 0 && steps[i - 1]!.blockIndex === s.blockIndex ? out[i - 1] : undefined;
      const next = steps.slice(i + 1).find((n) => n.kind === 'work' && n.blockIndex === s.blockIndex);
      out.push(prev ?? (next?.kind === 'work' ? next.round : 1));
    }
  });
  return out;
}

/**
 * Progress through the current part, split into one segment per round
 * ("R1 | R2 | R3", short so many rounds still fit). Done rounds are solid, the current one fills.
 * A part with a single round shows one segment named after the part.
 */
export function RoundsBar({ steps, index }: { steps: Step[]; index: number }) {
  const reduced = useReducedMotion();
  const step = steps[Math.min(index, steps.length - 1)];
  if (!step) return null;
  const rounds = stepRounds(steps);
  const block = step.blockIndex;
  const total = Math.max(1, ...steps.filter((s) => s.blockIndex === block).map((s) => (s.kind === 'work' ? s.rounds : 1)));
  const current = rounds[Math.min(index, steps.length - 1)] ?? 1;

  return (
    <View className="mx-5 mb-2 mt-6 flex-row gap-1" accessible accessibilityLabel={total > 1 ? `Round ${current} of ${total}` : step.block.title}>
      {Array.from({ length: total }, (_, r) => {
        const round = r + 1;
        const idx = steps.map((s, i) => (s.blockIndex === block && rounds[i] === round ? i : -1)).filter((i) => i >= 0);
        const done = idx.filter((i) => i < index).length;
        const fill = idx.length ? done / idx.length : 0;
        const finished = round < current;
        const active = round === current;
        return (
          <View key={round} className="h-9 flex-1 justify-center overflow-hidden rounded-full bg-default">
            {/* Absolute and childless, so animating its width doesn't re-lay-out anything else. */}
            <Animated.View
              className={cn('absolute bottom-0 left-0 top-0', finished ? 'bg-accent' : 'bg-accent/35')}
              style={{
                width: `${finished ? 100 : active ? Math.round(fill * 100) : 0}%`,
                transitionProperty: 'width',
                transitionDuration: reduced ? 0 : 300,
                transitionTimingFunction: EASE_OUT_CSS,
              }}
            />
            <AppText
              variant="label"
              numberOfLines={1}
              className={cn('text-center text-[14px] leading-[20px]', finished ? 'text-accent-foreground' : active ? 'text-foreground' : 'text-muted')}
            >
              {total > 1 ? `R${round}` : step.block.title}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}
