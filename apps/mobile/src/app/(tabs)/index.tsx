import { useIsFocused, useRouter } from 'expo-router';
import { cn } from 'heroui-native';
import { Layers, Link2, Plus } from '@/components/ui/icons';
import { DayStrip, type HomeView } from '@/components/plan/day-strip';
import { DayTimeline } from '@/components/plan/day-timeline';
import { PlanSheet, type PlanDraft } from '@/components/plan/plan-sheet';
import { dateKey, dayTitle, plansOn, upcomingDays, type Plan } from '@/lib/plan';
import { workoutMinutes } from '@/lib/sequence';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { EmptyState } from '@/components/ui/empty-state';
import { RoundButton } from '@/components/ui/round-button';
import { Screen } from '@/components/ui/screen';
import { Tappable } from '@/components/ui/tappable';
import { AppText } from '@/components/ui/text';
import { InboxCard } from '@/components/workout/inbox-card';
import { WorkoutCard } from '@/components/workout/workout-card';
import { CATEGORY_LABEL } from '@/lib/format';
import { retryImport } from '@/lib/import-runner';
import { enterItem } from '@/lib/motion';
import { useStore } from '@/lib/store';
import type { Category, Workout } from '@/lib/types';

type Filter = 'all' | Category;

/** Matches gap-4 on the list's content container. */
const LIST_GAP = 16;

export default function Library() {
  const router = useRouter();
  const workouts = useStore((s) => s.workouts);
  const [filter, setFilter] = useState<Filter>('all');
  // Home shows the workouts list or one day's plan; today is fixed for the session.
  const [view, setView] = useState<HomeView>('workouts');
  const today = useMemo(() => new Date(), []);
  const days = useMemo(() => upcomingDays(today, 14), [today]);
  const plans = useStore((s) => s.plans);
  const plannedDays = useMemo(() => new Set(plans.map((p) => p.date)), [plans]);
  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const sheetDay = draft ? dayTitle(draft.mode === 'new' ? draft.date : draft.plan.date, today).title : '';
  const focused = useIsFocused();
  // Background videos only play on tiles that are mostly on screen.
  // Background videos only play on tiles that are at least half on screen.
  // Measured by hand (scroll offset + item heights): FlatList viewability is unreliable on web,
  // and an item's own onLayout y is relative to its cell, so positions are summed in list order.
  const heights = useRef(new Map<string, number>());
  // Rows stagger in once, on first open. Rows that mount later while scrolling (or after a filter) just appear:
  // an entrance on every virtualized row would replay on scroll.
  const [introDone, setIntroDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setIntroDone(true), 600);
    return () => clearTimeout(t);
  }, []);
  const headerH = useRef(0);
  const order = useRef<string[]>([]);
  const viewport = useRef({ y: 0, h: 0 });
  const [onScreen, setOnScreen] = useState<Set<string>>(new Set());
  const recompute = useCallback(() => {
    const { y, h } = viewport.current;
    const next = new Set<string>();
    let top = headerH.current + LIST_GAP;
    for (const id of order.current) {
      const ih = heights.current.get(id) ?? 0;
      const overlap = Math.min(y + h, top + ih) - Math.max(y, top);
      if (ih > 0 && overlap >= ih * 0.5) next.add(id);
      top += ih + LIST_GAP;
    }
    setOnScreen((prev) => (prev.size === next.size && [...next].every((id) => prev.has(id)) ? prev : next));
  }, []);

  const categories = useMemo(() => {
    const seen = new Set<Category>();
    workouts.forEach((w) => w.status === 'ready' && seen.add(w.category));
    return [...seen];
  }, [workouts]);

  const visible = useMemo(
    () => workouts.filter((w) => filter === 'all' || w.category === filter || w.status !== 'ready'),
    [workouts, filter],
  );
  order.current = visible.map((w) => w.id);
  useEffect(recompute, [visible, recompute]);
  const readyCount = workouts.filter((w) => w.status === 'ready').length;

  return (
    <Screen>
      {/* Calendar strip: the Workouts tab, then the coming days inline. */}
      <View className="pb-2 pt-3">
        <DayStrip days={days} today={today} value={view} onChange={setView} planned={plannedDays} />
      </View>

      {view !== 'workouts' ? (
        <DayView
          key={view}
          dayKey={view}
          today={today}
          plans={plansOn(plans, view)}
          workouts={workouts}
          onAddAt={(minutes) => setDraft({ mode: 'new', date: view, minutes })}
          onOpenPlan={(plan) => setDraft({ mode: 'edit', plan })}
        />
      ) : (
      <FlatList
        data={visible}
        keyExtractor={(w) => w.id}
        onLayout={(e) => {
          viewport.current.h = e.nativeEvent.layout.height;
          recompute();
        }}
        onScroll={(e) => {
          viewport.current.y = e.nativeEvent.contentOffset.y;
          recompute();
        }}
        scrollEventThrottle={100}
        contentContainerClassName="gap-4 px-5 pb-36"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View
            className="gap-5 pb-1 pt-2"
            onLayout={(e) => {
              headerH.current = e.nativeEvent.layout.height;
              recompute();
            }}
          >
            <View className="flex-row items-start justify-between">
              <View>
                <AppText variant="overline">{readyCount} saved</AppText>
                <AppText variant="hero" className="mt-1">
                  Your{'\n'}workouts
                </AppText>
              </View>
              <RoundButton icon={Layers} label="Merge workouts" size={52} onPress={() => router.push('/merge')} disabled={readyCount < 2} />
            </View>
            {categories.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2" className="-mx-5" contentContainerStyle={{ paddingHorizontal: 20 }}>
                {(['all', ...categories] as Filter[]).map((c) => (
                  <FilterPill key={c} label={c === 'all' ? 'All' : CATEGORY_LABEL[c]} active={filter === c} onPress={() => setFilter(c)} />
                ))}
              </ScrollView>
            ) : null}
            <InboxCard />
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={introDone || index > 5 ? undefined : enterItem(index)}
            onLayout={(e) => {
              heights.current.set(item.id, e.nativeEvent.layout.height);
              recompute();
            }}
          >
            <WorkoutCard
              workout={item}
              active={focused && onScreen.has(item.id)}
              onPress={() => router.push({ pathname: '/workout/[id]', params: { id: item.id } })}
              onPlay={() => router.push({ pathname: '/workout/[id]/play', params: { id: item.id } })}
              onRetry={() => void retryImport(item.id)}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={Link2}
            title="Save your first workout"
            body="Share a reel or TikTok to Save Fit, or paste its link. We’ll turn it into a step-by-step workout with timers."
          />
        }
      />
      )}

      <PlanSheet
        draft={draft}
        dayLabel={sheetDay}
        workouts={workouts}
        onClose={() => setDraft(null)}
        onSave={({ workoutId, minutes }) => {
          if (!draft) return;
          if (draft.mode === 'new') useStore.getState().addPlan({ workoutId, minutes, date: draft.date });
          else useStore.getState().updatePlan(draft.plan.id, { workoutId, minutes });
          setDraft(null);
        }}
        onRemove={(id) => {
          useStore.getState().removePlan(id);
          setDraft(null);
        }}
        onStart={(workoutId) => {
          setDraft(null);
          router.push({ pathname: '/workout/[id]/play', params: { id: workoutId } });
        }}
      />
    </Screen>
  );
}

/** One day: its name, then the timeline. */
function DayView({
  dayKey,
  today,
  plans,
  workouts,
  onAddAt,
  onOpenPlan,
}: {
  dayKey: string;
  today: Date;
  plans: Plan[];
  workouts: Workout[];
  onAddAt: (minutes: number) => void;
  onOpenPlan: (plan: Plan) => void;
}) {
  const { title, date } = dayTitle(dayKey, today);
  const isToday = dayKey === dateKey(today);
  const total = plans.reduce((sum, p) => {
    const w = workouts.find((x) => x.id === p.workoutId);
    return sum + (w ? workoutMinutes(w) : 0);
  }, 0);
  // The + button plans at the next whole hour today, or 7 am on other days.
  const now = new Date();
  const next = isToday ? Math.min(22 * 60, (now.getHours() + 1) * 60) : 7 * 60;
  return (
    <View className="flex-1">
      <View className="flex-row items-end justify-between px-5 pb-4 pt-3">
        <View>
          <AppText variant="overline">{date}</AppText>
          <AppText variant="hero" className="mt-1">
            {title}
          </AppText>
          <AppText variant="caption" className="mt-1">
            {plans.length ? `${plans.length === 1 ? '1 workout' : `${plans.length} workouts`} · ${total} min` : 'Tap a time to plan a workout'}
          </AppText>
        </View>
        <RoundButton icon={Plus} label="Plan a workout" tone="accent" size={52} onPress={() => onAddAt(next)} />
      </View>
      <DayTimeline plans={plans} workouts={workouts} isToday={isToday} onAddAt={onAddAt} onOpenPlan={onOpenPlan} bottomInset={144} />
    </View>
  );
}

function FilterPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Tappable onPress={onPress} feedback="select" accessibilityLabel={`Show ${label}`}>
      <View className={cn('h-11 justify-center rounded-full px-5', active ? 'bg-accent' : 'border border-border bg-surface')}>
        <AppText variant="label" className={cn(active ? 'text-accent-foreground' : 'text-foreground')}>
          {label}
        </AppText>
      </View>
    </Tappable>
  );
}
