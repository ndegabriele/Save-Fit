import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, cn, Dialog } from 'heroui-native';
import { Check, ChevronsRight, Info, Pause, Play, Plus, SkipBack, SkipForward, Trophy, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Uniwind } from 'uniwind';
import { Confetti } from '@/components/ui/confetti';
import { Icon } from '@/components/ui/icon';
import { ProgressRing } from '@/components/ui/progress-ring';
import { RoundButton } from '@/components/ui/round-button';
import { Tappable } from '@/components/ui/tappable';
import { AppText } from '@/components/ui/text';
import { ExerciseDetails } from '@/components/workout/exercise-details';
import { VideoClip } from '@/components/workout/video-clip';
import { BLOCK_LABEL, clock, plural } from '@/lib/format';
import { DURATION, EASE_OUT, SPRING_PLAYFUL } from '@/lib/motion';
import { useStore, useWorkout } from '@/lib/store';
import { usePlayer } from '@/lib/use-player';

export default function PlayScreen() {
  // The player is always dark: high contrast, calm, readable from the floor.
  // It's a full-screen modal, so switching the app theme while it's open is invisible elsewhere.
  useEffect(() => {
    Uniwind.setTheme('dark');
    return () => Uniwind.setTheme(useStore.getState().settings.theme);
  }, []);
  return (
    <>
      <StatusBar style="light" />
      <Player />
    </>
  );
}

function Player() {
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const workout = useWorkout(id);
  const settings = useStore((s) => s.settings);
  const p = usePlayer(workout, settings.countdownSec);
  const [howTo, setHowTo] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  // Start straight away with the get-ready countdown.
  useEffect(() => {
    if (p.phase === 'ready' && p.steps.length) p.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.steps.length]);

  // Record the completion once per session (markPlayed changes `workout`, so guard against re-running).
  const recorded = useRef(false);
  useEffect(() => {
    if (p.phase === 'done' && workout && !recorded.current) {
      recorded.current = true;
      useStore.getState().markPlayed(workout.id, true);
    }
  }, [p.phase, workout]);

  if (!workout) return <View className="flex-1 bg-background" />;

  if (p.phase === 'done') {
    return <Finished title={workout.title} elapsed={p.elapsed} moves={p.workDone} onClose={() => router.back()} />;
  }

  const step = p.step;
  const exercise = step?.kind === 'work' ? step.exercise : step?.next ?? null;
  const source = step?.block.source ?? workout.source;
  const video = settings.showVideo && source?.videoUrl && exercise?.clip ? source.videoUrl : null;
  const ringSize = Math.min(width - 96, video ? height * 0.26 : height * 0.34, 300);
  const workSteps = p.steps.filter((s) => s.kind === 'work').length;
  const progress = p.steps.length ? p.index / p.steps.length : 0;

  const isRest = step?.kind === 'rest';
  const isReps = step?.kind === 'work' && step.mode === 'reps';
  const isCountdown = p.phase === 'countdown';

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 6, paddingBottom: Math.max(insets.bottom, 16) }}>
      {/* Top bar */}
      <View className="flex-row items-center justify-between px-5">
        <RoundButton icon={X} label="End workout" tone="ghost" size={48} onPress={() => setConfirmExit(true)} />
        <View className="items-center">
          <AppText variant="overline">{step ? BLOCK_LABEL[step.block.kind] : ''}</AppText>
          <AppText variant="label">
            {Math.min(p.workDone + 1, workSteps)} / {workSteps}
          </AppText>
        </View>
        <View className="h-12 min-w-12 items-center justify-center rounded-full bg-default px-4">
          <AppText variant="label" style={{ fontVariant: ['tabular-nums'] }}>
            {clock(p.elapsed)}
          </AppText>
        </View>
      </View>

      {/* Progress */}
      <View className="mx-5 mt-4 h-1.5 overflow-hidden rounded-full bg-default">
        <View className="h-full rounded-full bg-accent" style={{ width: `${Math.round(progress * 100)}%` }} />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="flex-grow items-center px-5 pt-5" showsVerticalScrollIndicator={false}>
        {video ? (
          <View className="mb-4 w-full">
            <VideoClip uri={video} clip={exercise?.clip} paused={p.paused} height={height * 0.24} />
          </View>
        ) : null}

        {/* Title */}
        <Animated.View key={step?.key} entering={FadeIn.duration(DURATION.fast).easing(EASE_OUT)} className="w-full items-center gap-1.5">
          <AppText variant="overline" className={cn(isRest ? 'text-violet' : 'text-accent')}>
            {isRest ? (step?.label ?? 'Rest') : isCountdown ? 'Get ready' : 'Now'}
          </AppText>
          <AppText variant="display" className="text-center text-[34px] leading-[38px]">
            {isRest ? `Next: ${exercise?.name ?? 'Finish'}` : exercise?.name}
          </AppText>
          {step?.kind === 'work' ? (
            <AppText variant="body" className="text-center text-muted">
              {[
                step.sets > 1 ? `Set ${step.set} of ${step.sets}` : null,
                step.rounds > 1 ? `Round ${step.round} of ${step.rounds}` : null,
                step.side ? `${step.side === 'left' ? 'Left' : 'Right'} side` : null,
                step.exercise.load,
              ]
                .filter(Boolean)
                .join('  ·  ')}
            </AppText>
          ) : null}
        </Animated.View>

        {/* Timer / reps */}
        <View className="my-6 items-center justify-center">
          {isReps && step?.kind === 'work' ? (
            <Tappable onPress={p.next} feedback="firm" accessibilityLabel="Done, next exercise" scale={0.98}>
              <View className="items-center justify-center rounded-full bg-surface" style={{ width: ringSize, height: ringSize }}>
                <AppText variant="number" style={{ fontSize: ringSize * 0.42, lineHeight: ringSize * 0.46 }}>
                  {step.reps}
                </AppText>
                <AppText variant="headline" className="text-muted">
                  {step.side ? 'reps this side' : 'reps'}
                </AppText>
                <AppText variant="caption" className="mt-2" style={{ fontVariant: ['tabular-nums'] }}>
                  {clock(p.repElapsed)}
                </AppText>
              </View>
            </Tappable>
          ) : (
            <Tappable onPress={isCountdown ? p.goNow : p.togglePause} feedback="none" accessibilityLabel={isCountdown ? 'Start now' : p.paused ? 'Resume' : 'Pause'} scale={0.98}>
              <ProgressRing
                size={ringSize}
                stroke={16}
                progress={p.phaseTotal ? 1 - p.remaining / p.phaseTotal : 0}
                color={isRest ? 'violet' : isCountdown ? 'muted' : 'accent'}
                stepMs={120}
              >
                <AppText variant="number" style={{ fontSize: ringSize * 0.3, lineHeight: ringSize * 0.34, fontVariant: ['tabular-nums'] }}>
                  {isCountdown ? Math.ceil(p.remaining) : clock(p.remaining)}
                </AppText>
                <AppText variant="label" className="text-muted">
                  {p.paused ? 'Paused · tap to resume' : isCountdown ? 'Tap to start now' : isRest ? 'Breathe' : 'Tap to pause'}
                </AppText>
              </ProgressRing>
            </Tappable>
          )}
        </View>

        {/* Cues / rest actions */}
        {isRest ? (
          <View className="flex-row gap-3">
            <Pillbutton icon={Plus} label="15 s" onPress={() => p.addTime(15)} />
            <Pillbutton icon={ChevronsRight} label="Skip rest" onPress={p.next} />
          </View>
        ) : exercise?.cues.length ? (
          <View className="flex-row flex-wrap justify-center gap-2">
            {exercise.cues.slice(0, 3).map((c) => (
              <View key={c} className="rounded-full bg-default px-4 py-2">
                <AppText variant="label">{c}</AppText>
              </View>
            ))}
          </View>
        ) : null}
        {exercise && (exercise.steps.length > 0 || exercise.cues.length > 0) ? (
          <Tappable onPress={() => setHowTo(true)} className="mt-4" accessibilityLabel="How to do this exercise">
            <View className="flex-row items-center gap-2 px-3 py-2">
              <Icon icon={Info} size={18} color="muted" />
              <AppText variant="label" className="text-muted">
                How to do it
              </AppText>
            </View>
          </Tappable>
        ) : null}
      </ScrollView>

      {/* Big controls: easy to hit mid-set, sweaty hands, from a distance. */}
      <View className="flex-row items-center justify-between px-8 pt-2">
        <RoundButton icon={SkipBack} label="Previous" tone="ghost" size={72} onPress={p.prev} />
        {isReps ? (
          <Tappable onPress={p.next} feedback="firm" accessibilityLabel="Done, next exercise">
            <View className="size-[104px] items-center justify-center rounded-full bg-accent">
              <Icon icon={Check} size={44} color="accent-foreground" strokeWidth={3} />
            </View>
          </Tappable>
        ) : (
          <Tappable onPress={p.togglePause} feedback="firm" accessibilityLabel={p.paused ? 'Resume' : 'Pause'}>
            <View className="size-[104px] items-center justify-center rounded-full bg-accent">
              <Icon icon={p.paused ? Play : Pause} size={44} color="accent-foreground" strokeWidth={2.6} />
            </View>
          </Tappable>
        )}
        <RoundButton icon={SkipForward} label="Next" tone="ghost" size={72} onPress={p.next} />
      </View>

      <Dialog isOpen={howTo} onOpenChange={setHowTo}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content className="max-h-[80%]">
            <Dialog.Close />
            <Dialog.Title>{exercise?.name}</Dialog.Title>
            <ScrollView className="mt-3">{exercise ? <ExerciseDetails exercise={exercise} /> : null}</ScrollView>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>

      <Dialog isOpen={confirmExit} onOpenChange={setConfirmExit}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <Dialog.Title>End this workout?</Dialog.Title>
            <Dialog.Description>You’ve done {plural(p.workDone, 'move')} in {clock(p.elapsed)}.</Dialog.Description>
            <View className="mt-5 gap-3">
              <Button
                size="lg"
                variant="danger"
                onPress={() => {
                  setConfirmExit(false);
                  useStore.getState().markPlayed(workout.id, false);
                  router.back();
                }}
              >
                End workout
              </Button>
              <Button size="lg" variant="secondary" onPress={() => setConfirmExit(false)}>
                Keep going
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </View>
  );
}

function Pillbutton({ icon, label, onPress }: { icon: typeof Plus; label: string; onPress: () => void }) {
  return (
    <Tappable onPress={onPress} accessibilityLabel={label}>
      <View className="h-14 flex-row items-center gap-2 rounded-full bg-default px-6">
        <Icon icon={icon} size={20} />
        <AppText variant="headline">{label}</AppText>
      </View>
    </Tappable>
  );
}

function Finished({ title, elapsed, moves, onClose }: { title: string; elapsed: number; moves: number; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 items-center justify-center bg-background px-6" style={{ paddingBottom: insets.bottom + 16 }}>
      <Confetti />
      <Animated.View
        entering={ZoomIn.springify().duration(SPRING_PLAYFUL.duration).dampingRatio(0.6).withInitialValues({ transform: [{ scale: 0.6 }] })}
        className="size-32 items-center justify-center rounded-full bg-accent"
      >
        <Icon icon={Trophy} size={56} color="accent-foreground" strokeWidth={2.2} />
      </Animated.View>
      <Animated.View entering={FadeIn.delay(150).duration(DURATION.base)} exiting={FadeOut} className="mt-8 items-center gap-2">
        <AppText variant="hero" className="text-center">
          Good job!
        </AppText>
        <AppText variant="body" className="text-center text-muted">
          You finished {title}.
        </AppText>
      </Animated.View>
      <View className="mt-8 w-full flex-row gap-3">
        <View className="flex-1 items-center gap-1 rounded-3xl bg-surface py-5">
          <AppText variant="display">{clock(elapsed)}</AppText>
          <AppText variant="caption">Time</AppText>
        </View>
        <View className="flex-1 items-center gap-1 rounded-3xl bg-surface py-5">
          <AppText variant="display">{moves}</AppText>
          <AppText variant="caption">Moves done</AppText>
        </View>
      </View>
      <Button size="lg" className="mt-8 h-16 w-full rounded-full" onPress={onClose}>
        <Button.Label className="text-[18px]">Done</Button.Label>
      </Button>
    </View>
  );
}
