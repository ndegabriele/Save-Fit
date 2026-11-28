import { Button, cn } from 'heroui-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Check, Minus, Play, Plus, Trash2 } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { RoundButton } from '@/components/ui/round-button';
import { Sheet } from '@/components/ui/sheet';
import { Tappable } from '@/components/ui/tappable';
import { AppText } from '@/components/ui/text';
import { CAT_ICON, Thumb } from '@/components/workout/thumb';
import { CATEGORY_LABEL } from '@/lib/format';
import { formatTime, snapTime, TIME_STEP, type Plan } from '@/lib/plan';
import { workoutMinutes } from '@/lib/sequence';
import { CATEGORY_BG } from '@/lib/theme';
import type { Workout } from '@/lib/types';

export type PlanDraft = { mode: 'new'; date: string; minutes: number } | { mode: 'edit'; plan: Plan };

/**
 * Bottom sheet for planning: an editable time and a pick list of saved workouts.
 * New: pick a workout and add it. Edit: change time or workout, start it now, or take it off the day.
 */
export function PlanSheet({
  draft,
  dayLabel,
  workouts,
  onClose,
  onSave,
  onRemove,
  onStart,
}: {
  draft: PlanDraft | null;
  dayLabel: string;
  workouts: Workout[];
  onClose: () => void;
  onSave: (input: { workoutId: string; minutes: number }) => void;
  onRemove: (planId: string) => void;
  onStart: (workoutId: string) => void;
}) {
  const [minutes, setMinutes] = useState(0);
  const [workoutId, setWorkoutId] = useState<string | null>(null);

  // Reset the fields each time the sheet opens on a new row or plan.
  useEffect(() => {
    if (!draft) return;
    setMinutes(draft.mode === 'new' ? draft.minutes : draft.plan.minutes);
    setWorkoutId(draft.mode === 'edit' ? draft.plan.workoutId : null);
  }, [draft]);

  const ready = workouts.filter((w) => w.status === 'ready');
  const editing = draft?.mode === 'edit';
  const nudge = (d: number) => setMinutes((m) => snapTime(m + d));

  const footer = editing ? (
    <View className="gap-3">
      <View className="flex-row gap-3">
        <Button size="lg" variant="secondary" className="h-14 flex-1 rounded-full" onPress={() => workoutId && onSave({ workoutId, minutes })}>
          <Button.Label>Save changes</Button.Label>
        </Button>
        <Button size="lg" className="h-14 flex-1 rounded-full" onPress={() => workoutId && onStart(workoutId)}>
          <Icon icon={Play} size={20} color="accent-foreground" />
          <Button.Label>Start now</Button.Label>
        </Button>
      </View>
      <Tappable onPress={() => draft?.mode === 'edit' && onRemove(draft.plan.id)} accessibilityLabel="Remove from this day">
        <View className="h-12 flex-row items-center justify-center gap-2">
          <Icon icon={Trash2} size={20} color="danger" />
          <AppText variant="label" className="text-danger">
            Remove from {dayLabel}
          </AppText>
        </View>
      </Tappable>
    </View>
  ) : (
    <Button size="lg" className="h-14 rounded-full" isDisabled={!workoutId} onPress={() => workoutId && onSave({ workoutId, minutes })}>
      <Button.Label>{workoutId ? `Add to ${dayLabel} at ${formatTime(minutes)}` : 'Pick a workout'}</Button.Label>
    </Button>
  );

  return (
    <Sheet isOpen={Boolean(draft)} onClose={onClose} title={editing ? 'Planned workout' : `Plan for ${dayLabel}`} footer={footer}>
      <View className="gap-6">
        {/* Time: big and editable in 15-minute steps. */}
        <View className="flex-row items-center justify-between rounded-3xl bg-surface-secondary p-3">
          <RoundButton icon={Minus} label={`${TIME_STEP} minutes earlier`} tone="surface" size={48} feedback="select" onPress={() => nudge(-TIME_STEP)} />
          <View className="items-center">
            <AppText variant="number" className="text-[40px] leading-[48px]" style={{ fontVariant: ['tabular-nums'] }}>
              {formatTime(minutes)}
            </AppText>
            <AppText variant="caption">Start time</AppText>
          </View>
          <RoundButton icon={Plus} label={`${TIME_STEP} minutes later`} tone="surface" size={48} feedback="select" onPress={() => nudge(TIME_STEP)} />
        </View>

        {/* Workouts to choose from */}
        <View className="gap-2">
          <AppText variant="overline">{editing ? 'Workout' : 'Pick a workout'}</AppText>
          {ready.length ? (
            ready.map((w) => {
              const on = w.id === workoutId;
              return (
                <Tappable key={w.id} onPress={() => setWorkoutId(w.id)} feedback="select" accessibilityLabel={w.title} accessibilityState={{ selected: on }}>
                  <View className={cn('flex-row items-center gap-3 rounded-3xl border-2 p-2 pr-4', on ? 'border-accent bg-accent/10' : 'border-transparent bg-surface-secondary')}>
                    {w.source?.thumbnailUrl ? (
                      <Thumb uri={w.source.thumbnailUrl} category={w.category} size={48} className="rounded-2xl" />
                    ) : (
                      <View className={cn('size-12 items-center justify-center rounded-2xl', CATEGORY_BG[w.category])}>
                        <Icon icon={CAT_ICON[w.category]} size={20} color={`cat-${w.category}-ink`} />
                      </View>
                    )}
                    <View className="flex-1">
                      <AppText variant="headline" numberOfLines={1}>
                        {w.title}
                      </AppText>
                      <AppText variant="caption" numberOfLines={1}>
                        {workoutMinutes(w)} min · {CATEGORY_LABEL[w.category]}
                      </AppText>
                    </View>
                    <View className={cn('size-6 items-center justify-center rounded-full', on ? 'bg-accent' : 'border-2 border-border')}>
                      {on ? <Icon icon={Check} size={16} color="accent-foreground" /> : null}
                    </View>
                  </View>
                </Tappable>
              );
            })
          ) : (
            <AppText variant="body" className="text-muted">
              Save a workout first, then you can plan it here.
            </AppText>
          )}
        </View>
      </View>
    </Sheet>
  );
}
