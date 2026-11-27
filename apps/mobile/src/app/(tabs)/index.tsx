import { useRouter } from 'expo-router';
import { cn } from 'heroui-native';
import { Layers, Link2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { EmptyState } from '@/components/ui/empty-state';
import { RoundButton } from '@/components/ui/round-button';
import { Screen } from '@/components/ui/screen';
import { Tappable } from '@/components/ui/tappable';
import { AppText } from '@/components/ui/text';
import { WorkoutCard } from '@/components/workout/workout-card';
import { CATEGORY_LABEL } from '@/lib/format';
import { retryImport } from '@/lib/import-runner';
import { enterItem } from '@/lib/motion';
import { useStore } from '@/lib/store';
import type { Category } from '@/lib/types';

type Filter = 'all' | Category;

export default function Library() {
  const router = useRouter();
  const workouts = useStore((s) => s.workouts);
  const [filter, setFilter] = useState<Filter>('all');

  const categories = useMemo(() => {
    const seen = new Set<Category>();
    workouts.forEach((w) => w.status === 'ready' && seen.add(w.category));
    return [...seen];
  }, [workouts]);

  const visible = useMemo(
    () => workouts.filter((w) => filter === 'all' || w.category === filter || w.status !== 'ready'),
    [workouts, filter],
  );
  const readyCount = workouts.filter((w) => w.status === 'ready').length;

  return (
    <Screen>
      <FlatList
        data={visible}
        keyExtractor={(w) => w.id}
        contentContainerClassName="gap-4 px-5 pb-36"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="gap-5 pb-1 pt-4">
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
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={enterItem(index)}>
            <WorkoutCard
              workout={item}
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
