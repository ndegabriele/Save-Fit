import { cn } from 'heroui-native';
import { AlertTriangle, Play, RotateCcw } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { CreatorRow } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Tappable } from '@/components/ui/tappable';
import { AppText } from '@/components/ui/text';
import { STAGE_COPY, type ImportStage } from '@/lib/api';
import { CATEGORY_LABEL, DIFFICULTY_LABEL, creatorLine, plural } from '@/lib/format';
import { EASE_IN_OUT } from '@/lib/motion';
import { exerciseCount, workoutMinutes } from '@/lib/sequence';
import { CATEGORY_BG, CATEGORY_INK } from '@/lib/theme';
import type { Workout } from '@/lib/types';
import { Pill } from './category-pill';
import { Thumb } from './thumb';

export interface WorkoutCardProps {
  workout: Workout;
  onPress: () => void;
  onPlay?: () => void;
  onRetry?: () => void;
  /** Merge-picker mode: shows the order badge instead of the play button. */
  selectedIndex?: number | null;
}

export function WorkoutCard({ workout, onPress, onPlay, onRetry, selectedIndex }: WorkoutCardProps) {
  if (workout.status === 'processing') return <ProcessingCard workout={workout} onPress={onPress} />;
  if (workout.status === 'failed') return <FailedCard workout={workout} onPress={onPress} onRetry={onRetry} />;

  const minutes = workoutMinutes(workout);
  const selecting = selectedIndex !== undefined;
  const selected = selectedIndex !== null && selectedIndex !== undefined;

  return (
    <View>
    <Tappable onPress={onPress} accessibilityLabel={`${workout.title} by ${creatorLine(workout.creators)}`}>
      <View
        className={cn(
          'overflow-hidden rounded-[32px] p-5',
          CATEGORY_BG[workout.category],
          selected && 'border-4 border-foreground',
          selecting && !selected && 'opacity-80',
        )}
        style={{ minHeight: 236 }}
      >
        <View className="flex-row gap-4">
          <View className="flex-1 gap-2">
            <Pill label={CATEGORY_LABEL[workout.category]} />
            <AppText variant="display" numberOfLines={3}>
              {workout.title}
            </AppText>
            <CreatorRow creators={workout.creators} className="mt-1" />
          </View>
          <Thumb uri={workout.source?.thumbnailUrl} category={workout.category} />
        </View>

        <View className="mt-auto flex-row items-end justify-between pt-2">
          <View>
            <AppText
              variant="number"
              className={cn('text-[84px] leading-[84px]', CATEGORY_INK[workout.category])}
              accessibilityLabel={`${minutes} minutes`}
            >
              {String(minutes).padStart(2, '0')}′
            </AppText>
            <AppText variant="caption" className="text-foreground/55">
              {plural(exerciseCount(workout), 'exercise')} · {DIFFICULTY_LABEL[workout.difficulty]}
            </AppText>
          </View>
          {selecting ? (
            <View className={cn('size-14 items-center justify-center rounded-full', selected ? 'bg-foreground' : 'border-2 border-foreground/25')}>
              {selected ? (
                <AppText variant="title" className="text-background">
                  {selectedIndex + 1}
                </AppText>
              ) : null}
            </View>
          ) : (
            <View className="size-14" />
          )}
        </View>
      </View>
    </Tappable>
    {!selecting ? (
      // Sibling of the card (not nested) so it's its own button for screen readers.
      <Tappable onPress={onPlay} feedback="firm" accessibilityLabel={`Start ${workout.title}`} className="absolute bottom-5 right-5">
        <View className="size-14 items-center justify-center rounded-full bg-white shadow-surface">
          <Icon icon={Play} size={24} color="#17171C" />
        </View>
      </Tappable>
    ) : null}
    </View>
  );
}

function ProcessingCard({ workout, onPress }: { workout: Workout; onPress: () => void }) {
  const pulse = useSharedValue(0.55);
  useEffect(() => {
    // Constant, calm "breathing" while we wait. In-out because it moves on screen.
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 900, easing: EASE_IN_OUT }), withTiming(0.55, { duration: 900, easing: EASE_IN_OUT })), -1);
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const stage = (workout.jobStage ?? 'queued') as ImportStage;

  return (
    <Tappable onPress={onPress} accessibilityLabel="Workout being processed">
      <View className="overflow-hidden rounded-[32px] bg-surface p-5 shadow-surface" style={{ minHeight: 168 }}>
        <Pill label="Saving" />
        <AppText variant="title" className="mt-3">
          {STAGE_COPY[stage] ?? 'Working on it'}…
        </AppText>
        <AppText variant="caption" numberOfLines={1} className="mt-1">
          {workout.source?.url ?? 'Shared text'}
        </AppText>
        <View className="mt-5 gap-2">
          <Animated.View style={style} className="h-3 w-4/5 rounded-full bg-default" />
          <Animated.View style={style} className="h-3 w-3/5 rounded-full bg-default" />
          <Animated.View style={style} className="h-3 w-2/5 rounded-full bg-default" />
        </View>
      </View>
    </Tappable>
  );
}

function FailedCard({ workout, onPress, onRetry }: { workout: Workout; onPress: () => void; onRetry?: () => void }) {
  return (
    <Tappable onPress={onPress} accessibilityLabel="Import failed">
      <View className="rounded-[32px] bg-danger-soft p-5" style={{ minHeight: 152 }}>
        <View className="flex-row items-center gap-2">
          <Icon icon={AlertTriangle} size={20} color="danger" />
          <AppText variant="headline" className="text-danger-soft-foreground">
            Couldn’t read this one
          </AppText>
        </View>
        <AppText variant="caption" className="mt-2" numberOfLines={3}>
          {workout.error ?? 'Unknown error'}
        </AppText>
        {onRetry ? (
          <Tappable onPress={onRetry} className="mt-4 self-start">
            <View className="flex-row items-center gap-2 rounded-full bg-surface px-4 py-3">
              <Icon icon={RotateCcw} size={16} />
              <AppText variant="label">Try again</AppText>
            </View>
          </Tappable>
        ) : null}
      </View>
    </Tappable>
  );
}
