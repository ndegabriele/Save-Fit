import { grid } from '@/lib/grid';
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, cn, Dialog } from 'heroui-native';
import { Check, ChevronsRight, Info, Maximize2, Pause, Play, Plus, SkipBack, SkipForward, Trophy, X } from '@/components/ui/icons';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import Animated, { FadeIn, FadeOut, Keyframe, ReduceMotion, ZoomIn } from 'react-native-reanimated';
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
import { RoundsBar } from '@/components/workout/rounds-bar';
import { Sheet } from '@/components/ui/sheet';
import { VideoClip } from '@/components/workout/video-clip';
import { PhaseGlow } from '@/components/workout/phase-glow';
import { BLOCK_LABEL, clock, plural } from '@/lib/format';
import { DURATION, EASE_OUT, EASE_OUT_CSS, SPRING_PLAYFUL } from '@/lib/motion';
import { useStore, useWorkout } from '@/lib/store';
import { usePlayer } from '@/lib/use-player';
import type { Workout } from '@/lib/types';
import { EquipmentTags, exerciseEquipment } from '@/components/workout/equipment-tag';

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
  // 0 = video view, 1 = controls view. Remembered across exercises.
  const [view, setView] = useState(0);
  const [pageH, setPageH] = useState(0);
  const viewRef = useRef(0);
  viewRef.current = view;
  const pager = useRef<ScrollViewInstance>(null);
  const goToView = (i: number) => {
    setView(i);
    pager.current?.scrollTo({ x: i * width, animated: true });
  };

  // Every workout opens with the start countdown.
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

  if (p.phase === 'intro') {
    return <StartCountdown workout={workout} p={p} onExit={() => router.back()} />;
  }

  const step = p.step;
  const exercise = step?.kind === 'work' ? step.exercise : step?.next ?? null;
  const source = step?.block.source ?? workout.source;
  const video = settings.showVideo && source?.videoUrl && exercise?.clip ? source.videoUrl : null;
  // Sized so the whole controls view fits on one screen, no scrolling.
  // Fixed header (128) + gap (24) + action buttons (56) + space above the controls (40) come out of the measured page height.
  // Tablet landscape: one screen, video on the left and the controls column on the right (no swiping).
  const wide = width >= 768 && width > height && height >= 600;
  const paneW = wide && video ? Math.min(560, Math.round(width * 0.45)) : width;
  const ringSize = grid(Math.max(144, Math.min(paneW - 96, wide ? 360 : 280, (pageH || height * 0.5) - 248)));
  const workSteps = p.steps.filter((s) => s.kind === 'work').length;
  const progress = p.steps.length ? p.index / p.steps.length : 0;

  const isRest = step?.kind === 'rest';
  const isReps = step?.kind === 'work' && step.mode === 'reps';
  const isCountdown = p.phase === 'countdown';

  const meta =
    step?.kind === 'work'
      ? [
          step.sets > 1 ? `Set ${step.set} of ${step.sets}` : null,
        ]
          .filter(Boolean)
          .join('  ·  ')
      : '';

  const gear = exercise ? exerciseEquipment(exercise) : [];
  const side = step?.kind === 'work' && step.side ? (step.side === 'left' ? 'Left side' : 'Right side') : null;
  const title = isRest ? `Next: ${exercise?.name ?? 'Finish'}` : (exercise?.name ?? '');
  // Long names drop to a smaller size so the header keeps its fixed height and the timer never moves.
  const longTitle = title.length > 36;
  const hasHowTo = Boolean(exercise && (exercise.steps.length > 0 || exercise.cues.length > 0 || exercise.load));

  // Same timer and buttons in both views, just at different sizes.
  const small = (size: number) => size < 160;
  // Large rings: the side pill sits outside the circle, bottom-aligned, in the corner on its own side.
  // (Outside the pressable, which clips its overflow.)
  const timer = (size: number) => (
    <View style={{ width: size, height: size }}>
      {timerBody(size)}
      {side && !small(size) && !isRest ? (
        <SidePill side={side} className={cn('absolute bottom-0', side.startsWith('Left') ? '-left-2' : '-right-2')} />
      ) : null}
    </View>
  );
  const timerBody = (size: number) =>
    isReps && step?.kind === 'work' ? (
      <Tappable onPress={p.next} feedback="firm" accessibilityLabel="Done, next exercise" scale={0.98}>
        {small(size) ? (
          // Compact: a lighter rounded square, side pill in that top corner.
          <View className="items-center justify-center rounded-3xl bg-default" style={{ width: size, height: size }}>
            {side ? <SidePill side={side} compact className={cn('absolute top-2', side.startsWith('Left') ? 'left-2' : 'right-2')} /> : null}
            <AppText variant="number" className="text-white" style={{ fontSize: grid(size * 0.5), lineHeight: grid(size * 0.56) }}>
              {step.reps}
            </AppText>
            <DiscLabel size={size} text="reps" />
          </View>
        ) : (
          // Large: a ring like the timed moves, with a yellow sweep that goes round once a minute as you work.
          <ProgressRing size={size} stroke={16} progress={(p.repElapsed % 60) / 60} color="accent" stepMs={120}>
            <AppText variant="number" className="text-white" style={{ fontSize: grid(size * 0.5), lineHeight: grid(size * 0.56) }}>
              {step.reps}
            </AppText>
            <DiscLabel size={size} text="reps" />
            <AppText variant="caption" className="mt-2" style={{ fontVariant: ['tabular-nums'] }}>
              {clock(p.repElapsed)}
            </AppText>
          </ProgressRing>
        )}
      </Tappable>
    ) : (
      <Tappable onPress={isCountdown ? p.goNow : p.togglePause} feedback="none" accessibilityLabel={isCountdown ? 'Start now' : p.paused ? 'Resume' : 'Pause'} scale={0.98}>
        <ProgressRing
          size={size}
          stroke={small(size) ? 8 : 16}
          progress={p.phaseTotal ? 1 - p.remaining / p.phaseTotal : 0}
          color={isRest ? 'violet' : isCountdown ? 'muted' : 'accent'}
          stepMs={120}
        >
          <AppText variant="number" className="text-white" style={{ fontSize: grid(size * 0.3), lineHeight: grid(size * 0.36), fontVariant: ['tabular-nums'] }}>
            {isCountdown ? Math.ceil(p.remaining) : clock(p.remaining)}
          </AppText>
          <DiscLabel
            size={size}
            text={p.paused ? 'Paused' : isCountdown ? 'Get ready' : isRest ? 'Breathe' : 'Work'}
            tight={false}
          />
        </ProgressRing>
      </Tappable>
    );

  const mainButton = (size: number, iconSize: number) =>
    isReps ? (
      <Tappable onPress={p.next} feedback="firm" accessibilityLabel="Done, next exercise">
        <View className="items-center justify-center rounded-full bg-accent" style={{ width: size, height: size }}>
          <Animated.View key="check" entering={iconIn}>
            <Icon icon={Check} size={iconSize} color="accent-foreground" strokeWidth={3} />
          </Animated.View>
        </View>
      </Tappable>
    ) : (
      <Tappable onPress={p.togglePause} feedback="firm" accessibilityLabel={p.paused ? 'Resume' : 'Pause'}>
        <View className="items-center justify-center rounded-full bg-accent" style={{ width: size, height: size }}>
          <Animated.View key={p.paused ? 'play' : 'pause'} entering={iconIn}>
            <Icon icon={p.paused ? Play : Pause} size={iconSize} color="accent-foreground" strokeWidth={2.6} />
          </Animated.View>
        </View>
      </Tappable>
    );

  // CONTROLS VIEW: big timer and buttons; the video shrinks to a thumbnail next to the title
  // (on a tablet in landscape the video sits beside it instead).
  const controlsPage = (
        <View style={{ width: paneW }} className="flex-1">
        <View className="flex-1 px-5 pt-4" onLayout={(e) => setPageH(e.nativeEvent.layout.height)}>
          {/* Header: fixed height, so long titles never push the timer down. Thumbnail left, title + details next to it. */}
          <View className="h-32 w-full flex-row items-center gap-4 overflow-hidden">
            {video && !wide ? (
              <Tappable onPress={() => goToView(0)} accessibilityLabel="Show the coach’s video">
                <View>
                  <VideoClip uri={video} clip={exercise?.clip} paused={p.paused || view !== 1} height={112} width={64} className="rounded-[16px] border-2 border-foreground/20" />
                  <View className="absolute bottom-1 right-1 size-6 items-center justify-center rounded-full bg-black/60">
                    <Icon icon={Maximize2} size={12} color="#FFFFFF" />
                  </View>
                </View>
              </Tappable>
            ) : null}
            <Animated.View key={step?.key} entering={FadeIn.duration(DURATION.fast).easing(EASE_OUT)} className="flex-1 gap-2">
              <AppText
                variant="display"
                numberOfLines={longTitle ? 3 : 2}
                className={longTitle ? 'text-[20px] leading-[24px]' : 'text-[24px] leading-[28px]'}
              >
                {title}
              </AppText>
              {meta ? (
                <AppText variant="label" numberOfLines={1} className="text-muted">
                  {meta}
                </AppText>
              ) : null}
              <EquipmentTags items={gear} max={2} />
            </Animated.View>
          </View>

          {/* Timer / reps with its action row as one group, centred in the space between header and controls.
              The row keeps its height even when empty, so the timer never moves. */}
          <View className="flex-1 items-center justify-center gap-6">
          {timer(ringSize)}
          <View className="h-14 flex-row justify-center gap-3">
            {isRest ? (
              <>
                <Pillbutton icon={Plus} label="15 s" onPress={() => p.addTime(15)} />
                <Pillbutton icon={ChevronsRight} label="Skip rest" onPress={p.next} />
                {hasHowTo ? (
                  <Tappable onPress={() => setHowTo(true)} accessibilityLabel="How to do the next exercise">
                    <View className="size-14 items-center justify-center rounded-full bg-default">
                      <Icon icon={Info} size={24} />
                    </View>
                  </Tappable>
                ) : null}
              </>
            ) : hasHowTo ? (
              <Pillbutton icon={Info} label="How to do it" onPress={() => setHowTo(true)} />
            ) : null}
          </View>
          </View>
        </View>

        {/* Big controls: easy to hit mid-set, sweaty hands, from a distance. */}
        <View className="flex-row items-center justify-between px-8 pt-2">
          <RoundButton icon={SkipBack} label="Previous" tone="ghost" size={72} onPress={p.prev} />
          {mainButton(104, 44)}
          <RoundButton icon={SkipForward} label="Next" tone="ghost" size={72} onPress={p.next} />
        </View>

        </View>
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 6, paddingBottom: Math.max(insets.bottom, 16) }}>
      <PhaseGlow tone={isRest ? 'rest' : step?.kind === 'work' && p.phase === 'running' ? 'work' : null} paused={p.paused} />
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
          <AppText variant="label" className="text-accent" style={{ fontVariant: ['tabular-nums'] }}>
            {clock(p.elapsed)}
          </AppText>
        </View>
      </View>

      {/* Rounds of the current part: one segment per round, filling as you go. */}
      <RoundsBar steps={p.steps} index={p.index} />

      {/* Two views of the same exercise, swipe between them. Controls work the same in both. */}

      {wide ? (
        <View className="flex-1 flex-row">
          {video ? (
            <View className="flex-1 py-3 pl-5">
              <View className="flex-1 overflow-hidden rounded-[32px] bg-surface">
                <VideoClip uri={video} clip={exercise?.clip} paused={p.paused} className="flex-1 rounded-[32px]" />
              </View>
            </View>
          ) : null}
          {controlsPage}
        </View>
      ) : (
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        scrollEnabled={Boolean(video)}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setView(Math.round(e.nativeEvent.contentOffset.x / width))}
        onScroll={(e) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / width);
          if (next !== viewRef.current) setView(next);
        }}
        scrollEventThrottle={64}
        className="flex-1"
      >
        {video ? (
          // VIDEO VIEW: the coach's clip fills the screen, compact controls in a tile underneath.
          <View style={{ width }} className="flex-1 gap-3 px-4 pt-3">
            <View className="flex-1 overflow-hidden rounded-[32px] bg-surface">
              <VideoClip uri={video} clip={exercise?.clip} paused={p.paused || view !== 0} className="flex-1 rounded-[32px]" />
            </View>
            <View className="gap-4 rounded-[32px] bg-surface p-4">
              <View className="flex-row items-center gap-4">
                <View className="flex-1 gap-1">
                  <AppText variant="title" numberOfLines={2}>
                    {title}
                  </AppText>
                  {meta ? (
                    <AppText variant="caption" numberOfLines={1}>
                      {meta}
                    </AppText>
                  ) : null}
                  <EquipmentTags items={gear} max={2} className="mt-1" />
                </View>
                {timer(88)}
              </View>
              <View className="flex-row items-center justify-between px-4">
                <RoundButton icon={SkipBack} label="Previous" tone="ghost" size={56} onPress={p.prev} />
                {mainButton(72, 32)}
                <RoundButton icon={SkipForward} label="Next" tone="ghost" size={56} onPress={p.next} />
              </View>
            </View>
          </View>
        ) : null}

        {controlsPage}
      </ScrollView>
      )}
      {/* View switcher, under the play/pause button. Not needed when both views fit side by side. */}
      {video && !wide ? (
        <View className="flex-row justify-center gap-1 pt-1" accessibilityRole="tablist">
          {(['Video', 'Controls'] as const).map((label, i) => (
            <Tappable key={label} onPress={() => goToView(i)} feedback="select" accessibilityLabel={`${label} view`} className="px-1 py-2">
              <Animated.View
                className={cn('h-2 rounded-full', view === i ? 'bg-foreground' : 'bg-foreground/30')}
                style={{ width: view === i ? 32 : 8, transitionProperty: ['width', 'backgroundColor'], transitionDuration: 200, transitionTimingFunction: EASE_OUT_CSS }}
              />
            </Tappable>
          ))}
        </View>
      ) : null}

      <Sheet isOpen={howTo} onClose={() => setHowTo(false)} title={exercise?.name}>
        {exercise ? <ExerciseDetails exercise={exercise} /> : null}
      </Sheet>

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

// Play/pause/done icon swap: quick fade + settle so the change reads as one button changing state.
const iconIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.9 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: EASE_OUT },
})
  .duration(DURATION.press)
  .reduceMotion(ReduceMotion.System);

// Each number lands with a short fade and settle (never from scale 0).
const countIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.9 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: EASE_OUT },
})
  .duration(DURATION.base)
  .reduceMotion(ReduceMotion.System);

/** The big "get ready" countdown that opens every workout. Tap the number or "Start now" to skip it. */
function StartCountdown({ workout, p, onExit }: { workout: Workout; p: ReturnType<typeof usePlayer>; onExit: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const size = grid(Math.min(width - 96, 280));
  const first = p.steps.find((s) => s.kind === 'work');
  const n = Math.max(1, Math.ceil(p.remaining));
  const firstMeta =
    first?.kind === 'work'
      ? first.mode === 'reps' ? `${first.reps} reps` : clock(first.durationSec)
      : '';

  return (
    <View className="flex-1 bg-background px-5" style={{ paddingTop: insets.top + 6, paddingBottom: Math.max(insets.bottom, 16) }}>
      <View className="flex-row items-center justify-between">
        <RoundButton icon={X} label="Close" tone="ghost" size={48} onPress={onExit} />
        <AppText variant="overline">Get ready</AppText>
        <View className="size-12" />
      </View>

      <View className="flex-1 items-center justify-evenly">
        <AppText variant="display" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} className="text-center text-[32px] leading-[36px]">
          {workout.title}
        </AppText>

        <Tappable onPress={p.goNow} feedback="firm" accessibilityLabel={`Starting in ${n}. Tap to start now`} scale={0.98}>
          <ProgressRing size={size} stroke={16} progress={p.phaseTotal ? 1 - p.remaining / p.phaseTotal : 0} color="accent" stepMs={120}>
            <Animated.View key={n} entering={countIn}>
              <AppText variant="number" className="text-white" style={{ fontSize: grid(size * 0.5), lineHeight: grid(size * 0.56), fontVariant: ['tabular-nums'] }}>
                {n}
              </AppText>
            </Animated.View>
            {p.paused ? (
              <AppText variant="label" className="-mt-4 text-muted">
                Paused
              </AppText>
            ) : null}
          </ProgressRing>
        </Tappable>

        {first?.kind === 'work' ? (
          <View className="w-full gap-1 rounded-[32px] bg-surface p-5">
            <AppText variant="overline" className="text-accent">
              First up
            </AppText>
            <AppText variant="title" numberOfLines={2}>
              {first.exercise.name}
            </AppText>
            {firstMeta ? (
              <AppText variant="label" className="text-muted">
                {firstMeta}
              </AppText>
            ) : null}
            <EquipmentTags items={exerciseEquipment(first.exercise)} className="mt-2" />
          </View>
        ) : null}
      </View>

      <View className="flex-row items-center justify-center gap-4 pt-2">
        <Tappable onPress={p.togglePause} feedback="firm" accessibilityLabel={p.paused ? 'Resume countdown' : 'Pause countdown'}>
          <View className="size-18 items-center justify-center rounded-full bg-default">
            <Icon icon={p.paused ? Play : Pause} size={32} strokeWidth={2.6} />
          </View>
        </Tappable>
        <Tappable onPress={p.goNow} feedback="firm" accessibilityLabel="Start now">
          <View className="h-18 flex-row items-center gap-2 rounded-full bg-accent px-8">
            <Icon icon={ChevronsRight} size={24} color="accent-foreground" />
            <AppText variant="headline" className="text-[18px] leading-[24px] text-accent-foreground">
              Start now
            </AppText>
          </View>
        </Tappable>
      </View>
    </View>
  );
}

/**
 * The word under the big number ("reps", "Breathe"), sized with the disc and tucked up close to it.
 */
function DiscLabel({ size, text, tight = true }: { size: number; text: string; tight?: boolean }) {
  const compact = size < 160;
  const fontSize = compact ? 12 : grid(size * 0.086);
  return (
    <View
      // Pull the label up into the number's line box (its bottom is empty space under the digits).
      style={{ marginTop: tight ? -grid(size * (compact ? 0.08 : 0.06)) : -grid(size * 0.02) }}
    >
      <AppText variant="headline" className="text-white" style={{ fontSize, lineHeight: grid(fontSize * 1.2) }}>
        {text}
      </AppText>
    </View>
  );
}

function SidePill({ side, compact, className }: { side: string; compact?: boolean; className?: string }) {
  return (
    <View className={cn('items-center justify-center rounded-full bg-accent', compact ? 'h-5 min-w-5 px-1' : 'h-7 px-3', className)}>
      <AppText variant="label" className="font-semibold uppercase text-accent-foreground" style={{ fontSize: compact ? 10 : 12, lineHeight: compact ? 12 : 16 }}>
        {compact ? side[0] : side.replace(' side', '')}
      </AppText>
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
      <Animated.View entering={FadeIn.delay(150).duration(DURATION.base).easing(EASE_OUT)} exiting={FadeOut.duration(150)} className="mt-8 items-center gap-2">
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
        <Button.Label className="text-[18px] leading-[24px]">Done</Button.Label>
      </Button>
    </View>
  );
}
