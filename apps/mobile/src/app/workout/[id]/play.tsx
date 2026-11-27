import { grid } from '@/lib/grid';
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, cn, Dialog } from 'heroui-native';
import { Check, ChevronsRight, Info, Maximize2, Pause, Play, Plus, SkipBack, SkipForward, Trophy, X } from 'lucide-react-native';
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
import { BLOCK_LABEL, clock, plural } from '@/lib/format';
import { DURATION, EASE_OUT, SPRING_PLAYFUL } from '@/lib/motion';
import { useStore, useWorkout } from '@/lib/store';
import { usePlayer } from '@/lib/use-player';
import type { Workout } from '@/lib/types';

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
  // Header (~112) + cues/rest buttons (56) + "how to" (40) + breathing room (64) come out of the measured page height.
  const ringSize = grid(Math.max(144, Math.min(width - 96, 280, (pageH || height * 0.5) - 272)));
  const workSteps = p.steps.filter((s) => s.kind === 'work').length;
  const progress = p.steps.length ? p.index / p.steps.length : 0;

  const isRest = step?.kind === 'rest';
  const isReps = step?.kind === 'work' && step.mode === 'reps';
  const isCountdown = p.phase === 'countdown';

  const meta =
    step?.kind === 'work'
      ? [
          step.sets > 1 ? `Set ${step.set} of ${step.sets}` : null,
          step.side ? `${step.side === 'left' ? 'Left' : 'Right'} side` : null,
          step.exercise.load,
        ]
          .filter(Boolean)
          .join('  ·  ')
      : '';

  // Same timer and buttons in both views, just at different sizes.
  const small = (size: number) => size < 160;
  const timer = (size: number) =>
    isReps && step?.kind === 'work' ? (
              <Tappable onPress={p.next} feedback="firm" accessibilityLabel="Done, next exercise" scale={0.98}>
                {/* Compact: a lighter rounded square with big white reps. Large: the round dial. */}
                <View
                  className={cn('items-center justify-center', small(size) ? 'rounded-3xl bg-default' : 'rounded-full bg-surface')}
                  style={{ width: size, height: size }}
                >
                  <AppText
                    variant="number"
                    className={small(size) ? 'text-white' : undefined}
                    style={small(size) ? { fontSize: grid(size * 0.5), lineHeight: grid(size * 0.5) } : { fontSize: grid(size * 0.42), lineHeight: grid(size * 0.46) }}
                  >
                    {step.reps}
                  </AppText>
                  <AppText variant={small(size) ? 'label' : 'headline'} className={small(size) ? 'text-white' : 'text-muted'}>
                    {step.side ? (small(size) ? 'each side' : 'reps this side') : 'reps'}
                  </AppText>
                  {small(size) ? null : (
                    <AppText variant="caption" className="mt-2" style={{ fontVariant: ['tabular-nums'] }}>
                      {clock(p.repElapsed)}
                    </AppText>
                  )}
                </View>
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
                  <AppText variant="number" style={{ fontSize: grid(size * 0.3), lineHeight: grid(size * 0.34), fontVariant: ['tabular-nums'] }}>
                    {isCountdown ? Math.ceil(p.remaining) : clock(p.remaining)}
                  </AppText>
                  <AppText variant="label" className={cn('text-muted', small(size) && 'hidden')}>
                    {p.paused ? 'Paused · tap to resume' : isCountdown ? 'Tap to start now' : isRest ? 'Breathe' : 'Tap to pause'}
                  </AppText>
                </ProgressRing>
              </Tappable>
            )
;

  const mainButton = (size: number, iconSize: number) =>
    isReps ? (
      <Tappable onPress={p.next} feedback="firm" accessibilityLabel="Done, next exercise">
        <View className="items-center justify-center rounded-full bg-accent" style={{ width: size, height: size }}>
          <Icon icon={Check} size={iconSize} color="accent-foreground" strokeWidth={3} />
        </View>
      </Tappable>
    ) : (
      <Tappable onPress={p.togglePause} feedback="firm" accessibilityLabel={p.paused ? 'Resume' : 'Pause'}>
        <View className="items-center justify-center rounded-full bg-accent" style={{ width: size, height: size }}>
          <Icon icon={p.paused ? Play : Pause} size={iconSize} color="accent-foreground" strokeWidth={2.6} />
        </View>
      </Tappable>
    );

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

      {/* Rounds of the current part: one segment per round, filling as you go. */}
      <RoundsBar steps={p.steps} index={p.index} />

      {/* Two views of the same exercise, swipe between them. Controls work the same in both. */}

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
                  <AppText variant="overline" className={cn(isRest ? 'text-violet' : 'text-accent')}>
                    {isRest ? (step?.label ?? 'Rest') : isCountdown ? 'Get ready' : 'Now'}
                  </AppText>
                  <AppText variant="title" numberOfLines={2}>
                    {isRest ? `Next: ${exercise?.name ?? 'Finish'}` : exercise?.name}
                  </AppText>
                  {meta ? (
                    <AppText variant="caption" numberOfLines={1}>
                      {meta}
                    </AppText>
                  ) : null}
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

        {/* CONTROLS VIEW: big timer and buttons; the video shrinks to a thumbnail next to the title. */}
        <View style={{ width }} className="flex-1">
        <View className="flex-1 items-center justify-evenly px-5 pt-4" onLayout={(e) => setPageH(e.nativeEvent.layout.height)}>
          {/* Header: video thumbnail on the left, eyebrow + title + details aligned next to it. */}
          <View className="w-full flex-row items-center gap-4">
            {video ? (
              <Tappable onPress={() => goToView(0)} accessibilityLabel="Show the coach’s video">
                <View>
                  <VideoClip uri={video} clip={exercise?.clip} paused={p.paused || view !== 1} height={112} width={64} className="rounded-[16px] border-2 border-foreground/20" />
                  <View className="absolute bottom-1 right-1 size-6 items-center justify-center rounded-full bg-black/60">
                    <Icon icon={Maximize2} size={12} color="#FFFFFF" />
                  </View>
                </View>
              </Tappable>
            ) : null}
            <Animated.View key={step?.key} entering={FadeIn.duration(DURATION.fast).easing(EASE_OUT)} className="flex-1 gap-1">
              <AppText variant="overline" className={cn(isRest ? 'text-violet' : 'text-accent')}>
                {isRest ? (step?.label ?? 'Rest') : isCountdown ? 'Get ready' : 'Now'}
              </AppText>
              <AppText variant="display" numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.75} className="text-[24px] leading-[28px]">
                {isRest ? `Next: ${exercise?.name ?? 'Finish'}` : exercise?.name}
              </AppText>
              {meta ? (
                <AppText variant="label" numberOfLines={1} className="text-muted">
                  {meta}
                </AppText>
              ) : null}
            </Animated.View>
          </View>

          {/* Timer / reps */}
          <View className="items-center justify-center">
            {timer(ringSize)}
          </View>

          {/* Cues / rest actions */}
          {isRest ? (
            <View className="flex-row gap-3">
              <Pillbutton icon={Plus} label="15 s" onPress={() => p.addTime(15)} />
              <Pillbutton icon={ChevronsRight} label="Skip rest" onPress={p.next} />
            </View>
          ) : exercise?.cues.length ? (
            <View className="h-10 flex-row justify-center gap-2 overflow-hidden">
              {exercise.cues.slice(0, 2).map((c) => (
                <View key={c} className="rounded-full bg-default px-4 py-2">
                  <AppText variant="label">{c}</AppText>
                </View>
              ))}
            </View>
          ) : null}
          {exercise && (exercise.steps.length > 0 || exercise.cues.length > 0) ? (
            <Tappable onPress={() => setHowTo(true)} accessibilityLabel="How to do this exercise">
              <View className="flex-row items-center gap-2 px-3 py-2">
                <Icon icon={Info} size={20} color="muted" />
                <AppText variant="label" className="text-muted">
                  How to do it
                </AppText>
              </View>
            </Tappable>
          ) : null}
        </View>

        {/* Big controls: easy to hit mid-set, sweaty hands, from a distance. */}
        <View className="flex-row items-center justify-between px-8 pt-2">
          <RoundButton icon={SkipBack} label="Previous" tone="ghost" size={72} onPress={p.prev} />
          {mainButton(104, 44)}
          <RoundButton icon={SkipForward} label="Next" tone="ghost" size={72} onPress={p.next} />
        </View>

        </View>
      </ScrollView>
      {/* View switcher, under the play/pause button. */}
      {video ? (
        <View className="flex-row justify-center gap-1 pt-1" accessibilityRole="tablist">
          {(['Video', 'Controls'] as const).map((label, i) => (
            <Tappable key={label} onPress={() => goToView(i)} feedback="select" accessibilityLabel={`${label} view`} className="px-1 py-2">
              <View className={cn('h-2 rounded-full', view === i ? 'w-8 bg-foreground' : 'w-2 bg-foreground/30')} />
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

// Each number lands with a short fade and settle (never from scale 0).
const countIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.7 }] },
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
      ? [first.mode === 'reps' ? `${first.reps} reps` : clock(first.durationSec), first.exercise.load].filter(Boolean).join('  ·  ')
      : '';

  return (
    <View className="flex-1 bg-background px-5" style={{ paddingTop: insets.top + 6, paddingBottom: Math.max(insets.bottom, 16) }}>
      <View className="flex-row items-center justify-between">
        <RoundButton icon={X} label="Close" tone="ghost" size={48} onPress={onExit} />
        <AppText variant="overline">Get ready</AppText>
        <View className="size-12" />
      </View>

      <View className="flex-1 items-center justify-evenly">
        <AppText variant="display" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} className="text-center text-[24px] leading-[28px]">
          {workout.title}
        </AppText>

        <Tappable onPress={p.goNow} feedback="firm" accessibilityLabel={`Starting in ${n}. Tap to start now`} scale={0.98}>
          <ProgressRing size={size} stroke={16} progress={p.phaseTotal ? 1 - p.remaining / p.phaseTotal : 0} color="accent" stepMs={120}>
            <Animated.View key={n} entering={countIn}>
              <AppText variant="number" className="text-white" style={{ fontSize: grid(size * 0.5), lineHeight: grid(size * 0.56), fontVariant: ['tabular-nums'] }}>
                {n}
              </AppText>
            </Animated.View>
            <AppText variant="label" className="text-muted">
              {p.paused ? 'Paused' : 'Tap to start now'}
            </AppText>
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
        <Button.Label className="text-[18px] leading-[24px]">Done</Button.Label>
      </Button>
    </View>
  );
}
