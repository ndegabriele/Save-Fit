import { cn } from 'heroui-native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, type ScrollViewInstance } from 'react-native';
import { Plus } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { Tappable } from '@/components/ui/tappable';
import { AppText } from '@/components/ui/text';
import { CATEGORY_LABEL } from '@/lib/format';
import { DAY_END_HOUR, DAY_START_HOUR, HOUR_H, formatTime, timeToY, type Plan } from '@/lib/plan';
import { workoutMinutes } from '@/lib/sequence';
import { CATEGORY_BG } from '@/lib/theme';
import type { Workout } from '@/lib/types';

const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i);
/** Width of the hour labels column. */
const GUTTER = 56;
/** A planned workout's card never gets shorter than this, however short the workout. */
const MIN_CARD_H = 64;

/**
 * One day as a vertical timeline. Every hour is a row you can tap to plan a workout at that time;
 * planned workouts sit on top at their time, as tall as they last.
 */
export function DayTimeline({
  plans,
  workouts,
  isToday,
  onAddAt,
  onOpenPlan,
  bottomInset,
}: {
  plans: Plan[];
  workouts: Workout[];
  isToday: boolean;
  onAddAt: (minutes: number) => void;
  onOpenPlan: (plan: Plan) => void;
  bottomInset: number;
}) {
  const scroller = useRef<ScrollViewInstance>(null);
  const [now, setNow] = useState(() => new Date());
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Keep the "now" line honest while the page is open.
  useEffect(() => {
    if (!isToday) return;
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, [isToday]);

  // Open on the part of the day that matters: an hour before now today, else the first plan, else 7 am.
  useEffect(() => {
    const first = plans[0]?.minutes;
    const target = isToday ? nowMin - 60 : (first ?? 7 * 60) - 30;
    const y = Math.max(0, timeToY(target));
    const t = setTimeout(() => scroller.current?.scrollTo({ y, animated: false }), 0);
    return () => clearTimeout(t);
    // Only when the day changes, not on every plan edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, plans.length === 0]);

  const height = HOURS.length * HOUR_H;

  return (
    <ScrollView ref={scroller} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 8, paddingBottom: bottomInset }}>
      <View style={{ height }} className="mx-5">
        {/* Hour rows: tap anywhere on a row to plan at that hour. */}
        {HOURS.map((h) => {
          const past = isToday && (h + 1) * 60 <= nowMin;
          return (
            <Tappable key={h} onPress={() => onAddAt(h * 60)} feedback="select" scale={0.99} accessibilityLabel={`Plan a workout at ${formatTime(h * 60)}`}>
              <View className="flex-row" style={{ height: HOUR_H }}>
                <View style={{ width: GUTTER }} />
                <View className={cn('flex-1 border-t border-border', past && 'opacity-60')}>
                  {/* A quiet + on empty rows, so it's clear they're tappable. */}
                  <View className="flex-1 flex-row items-center justify-end pr-2 opacity-40">
                    <Icon icon={Plus} size={16} color="muted" />
                  </View>
                </View>
              </View>
            </Tappable>
          );
        })}

        {/* Hour labels sit centred on their line. A separate layer, because pressables clip what overflows them. */}
        {HOURS.map((h, i) => (
          <View key={h} pointerEvents="none" className="absolute left-0" style={{ top: i * HOUR_H - 8, width: GUTTER }}>
            <AppText
              variant="caption"
              className={cn('text-[12px] leading-[16px]', isToday && (h + 1) * 60 <= nowMin && 'opacity-40')}
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {formatTime(h * 60)}
            </AppText>
          </View>
        ))}

        {/* Now line */}
        {isToday && nowMin >= DAY_START_HOUR * 60 && nowMin <= (DAY_END_HOUR + 1) * 60 ? (
          <View pointerEvents="none" className="absolute right-0 flex-row items-center" style={{ top: timeToY(nowMin) - 4, left: GUTTER - 4 }}>
            <View className="size-2 rounded-full bg-danger" />
            <View className="h-px flex-1 bg-danger" />
          </View>
        ) : null}

        {/* Planned workouts */}
        {plans.map((plan) => {
          const w = workouts.find((x) => x.id === plan.workoutId);
          if (!w) return null;
          const mins = workoutMinutes(w);
          const h = Math.max(MIN_CARD_H, Math.round(((mins / 60) * HOUR_H) / 4) * 4);
          return (
            <View key={plan.id} className="absolute right-0" style={{ top: timeToY(plan.minutes) + 2, left: GUTTER + 4, height: h - 4 }}>
              <Tappable onPress={() => onOpenPlan(plan)} accessibilityLabel={`${w.title} at ${formatTime(plan.minutes)}`} className="flex-1">
                <View className={cn('flex-1 justify-center rounded-2xl px-4 py-2', CATEGORY_BG[w.category])}>
                  <AppText variant="headline" numberOfLines={1}>
                    {w.title}
                  </AppText>
                  <AppText variant="caption" numberOfLines={1} className="text-foreground/70">
                    {formatTime(plan.minutes)} · {mins} min · {CATEGORY_LABEL[w.category]}
                  </AppText>
                </View>
              </Tappable>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
