import { useRouter } from 'expo-router';
import { Button, cn, Input, Label, TextField } from 'heroui-native';
import { ArrowRight, Check, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { LinearTransition, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/icon';
import { RoundButton } from '@/components/ui/round-button';
import { Tappable } from '@/components/ui/tappable';
import { AppText } from '@/components/ui/text';
import { Thumb } from '@/components/workout/thumb';
import { CATEGORY_LABEL, creatorLine } from '@/lib/format';
import { haptic } from '@/lib/feedback';
import { DURATION, EASE_IN_OUT, EASE_OUT, enterItem } from '@/lib/motion';
import { workoutMinutes } from '@/lib/sequence';
import { useStore } from '@/lib/store';
import { CATEGORY_BG, CATEGORY_BORDER } from '@/lib/theme';

/**
 * Merge: pick workouts in the order you want to do them
 * (e.g. warm-up from A, main set from B, stretch from C).
 */
export default function MergeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const workouts = useStore((s) => s.workouts).filter((w) => w.status === 'ready');
  const [order, setOrder] = useState<string[]>([]);
  const [title, setTitle] = useState('');

  const picked = useMemo(() => order.map((id) => workouts.find((w) => w.id === id)).filter((w) => w !== undefined), [order, workouts]);
  const total = picked.reduce((sum, w) => sum + workoutMinutes(w), 0);

  const toggle = (id: string) =>
    setOrder((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  const create = () => {
    const id = useStore.getState().merge(order, title);
    haptic.success();
    router.replace({ pathname: '/workout/[id]', params: { id } });
  };

  return (
    <View className="flex-1 bg-background pt-4">
      <View className="flex-row items-center justify-between px-5 pb-2">
        <AppText variant="title">Merge workouts</AppText>
        <RoundButton icon={X} label="Close" tone="ghost" size={40} onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerClassName="gap-3 px-5 pt-2" contentContainerStyle={{ paddingBottom: insets.bottom + 140 }} keyboardShouldPersistTaps="handled">
        <AppText variant="body" className="text-muted">
          Tap workouts in the order you want to do them. A warm-up from one coach, the main set from another, a stretch to finish.
        </AppText>

        {picked.length ? (
          <Animated.View layout={LinearTransition.duration(DURATION.base).easing(EASE_IN_OUT)} className="gap-3 rounded-[28px] bg-surface p-4 shadow-surface">
            <View className="flex-row flex-wrap items-center gap-2">
              {picked.map((w, i) => (
                <View key={w.id} className="flex-row items-center gap-2">
                  {i > 0 ? <Icon icon={ArrowRight} size={16} color="muted" /> : null}
                  <View className="flex-row items-center gap-2 rounded-full bg-default py-2 pl-2 pr-3">
                    <View className="size-6 items-center justify-center rounded-full bg-foreground">
                      <AppText variant="label" className="text-[12px] text-background">
                        {i + 1}
                      </AppText>
                    </View>
                    <AppText variant="label" className="text-[12px] leading-[16px]" numberOfLines={1}>
                      {w.title.length > 22 ? `${w.title.slice(0, 21)}…` : w.title}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
            <TextField>
              <Label>Name</Label>
              <Input value={title} onChangeText={setTitle} placeholder={picked.map((w) => w.title).join(' + ')} />
            </TextField>
          </Animated.View>
        ) : null}

        {workouts.map((w, i) => {
          const pos = order.indexOf(w.id);
          return (
            <Animated.View key={w.id} entering={enterItem(i)}>
              <Tappable onPress={() => toggle(w.id)} feedback="select" accessibilityLabel={`${pos >= 0 ? 'Remove' : 'Add'} ${w.title}`}>
                <View className={cn('flex-row items-center gap-3 rounded-[24px] p-3', CATEGORY_BG[w.category], pos >= 0 && cn('border-2', CATEGORY_BORDER[w.category]))}>
                  <Thumb uri={w.source?.thumbnailUrl} category={w.category} size={64} />
                  <View className="flex-1 gap-1">
                    <AppText variant="headline" numberOfLines={2}>
                      {w.title}
                    </AppText>
                    <AppText variant="caption" className="text-foreground/60" numberOfLines={1}>
                      {CATEGORY_LABEL[w.category]} · {workoutMinutes(w)} min · {creatorLine(w.creators)}
                    </AppText>
                  </View>
                  <View className={cn('size-11 items-center justify-center rounded-full', pos >= 0 ? 'bg-foreground' : cn('border-2 opacity-40', CATEGORY_BORDER[w.category]))}>
                    {pos >= 0 ? (
                      <Animated.View entering={ZoomIn.duration(DURATION.fast).easing(EASE_OUT).withInitialValues({ transform: [{ scale: 0.6 }] })}>
                        <AppText variant="headline" className="text-background">
                          {pos + 1}
                        </AppText>
                      </Animated.View>
                    ) : null}
                  </View>
                </View>
              </Tappable>
            </Animated.View>
          );
        })}
      </ScrollView>

      <View className="absolute inset-x-0 bottom-0 bg-background px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) + 4 }}>
        <Button size="lg" className="h-16 rounded-full" isDisabled={order.length < 2} onPress={create}>
          <Icon icon={Check} size={20} color="accent-foreground" />
          <Button.Label className="text-[16px] leading-[24px]">
            {order.length < 2 ? 'Pick at least 2' : `Merge ${order.length} workouts · ${total} min`}
          </Button.Label>
        </Button>
      </View>
    </View>
  );
}
