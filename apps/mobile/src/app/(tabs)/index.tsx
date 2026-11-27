import { useIsFocused, useRouter } from 'expo-router';
import { cn } from 'heroui-native';
import { Layers, Link2 } from 'lucide-react-native';
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
import type { Category } from '@/lib/types';

type Filter = 'all' | Category;

/** Matches gap-4 on the list's content container. */
const LIST_GAP = 16;

export default function Library() {
  const router = useRouter();
  const workouts = useStore((s) => s.workouts);
  const [filter, setFilter] = useState<Filter>('all');
  const focused = useIsFocused();
  // Background videos only play on tiles that are mostly on screen.
  // Background videos only play on tiles that are at least half on screen.
  // Measured by hand (scroll offset + item heights): FlatList viewability is unreliable on web,
  // and an item's own onLayout y is relative to its cell, so positions are summed in list order.
  const heights = useRef(new Map<string, number>());
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
            className="gap-5 pb-1 pt-4"
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
            entering={enterItem(index)}
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
    </Screen>
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
