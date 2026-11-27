import { cn } from 'heroui-native';
import { ScrollView, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Dumbbell } from '@/components/ui/icons';
import { Tappable } from '@/components/ui/tappable';
import { AppText } from '@/components/ui/text';
import { dayChip } from '@/lib/plan';

export type HomeView = 'workouts' | string;

/**
 * The top of the home page: a Workouts tab, then the coming days inline in one carousel.
 * Days with something planned get a dot.
 */
export function DayStrip({
  days,
  today,
  value,
  onChange,
  planned,
}: {
  days: string[];
  today: Date;
  value: HomeView;
  onChange: (v: HomeView) => void;
  planned: Set<string>;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
      <Tappable onPress={() => onChange('workouts')} feedback="select" accessibilityLabel="Your workouts" accessibilityState={{ selected: value === 'workouts' }}>
        <View className={cn('h-16 flex-row items-center gap-2 rounded-3xl px-5', value === 'workouts' ? 'bg-foreground' : 'bg-surface shadow-surface')}>
          <Icon icon={Dumbbell} size={20} color={value === 'workouts' ? 'background' : 'foreground'} />
          <AppText variant="headline" className={value === 'workouts' ? 'text-background' : undefined}>
            Workouts
          </AppText>
        </View>
      </Tappable>
      {/* Hairline between the tab and the days. */}
      <View className="my-4 w-px bg-border" />
      {days.map((key) => {
        const chip = dayChip(key, today);
        const on = value === key;
        return (
          <Tappable key={key} onPress={() => onChange(key)} feedback="select" accessibilityLabel={`${chip.top} ${chip.day}`} accessibilityState={{ selected: on }}>
            <View className={cn('h-16 w-14 items-center justify-center rounded-3xl', on ? 'bg-accent' : 'bg-surface shadow-surface')}>
              <AppText variant="caption" className={cn('text-[12px] leading-[16px]', on ? 'text-accent-foreground' : 'text-muted')}>
                {chip.top}
              </AppText>
              <AppText variant="headline" className={on ? 'text-accent-foreground' : undefined}>
                {chip.day}
              </AppText>
              <View className={cn('mt-1 size-1 rounded-full', planned.has(key) ? (on ? 'bg-accent-foreground' : 'bg-accent') : 'bg-transparent')} />
            </View>
          </Tappable>
        );
      })}
    </ScrollView>
  );
}
