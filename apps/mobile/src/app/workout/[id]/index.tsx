import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Accordion, Button, cn, Dialog, useToast } from 'heroui-native';
import { useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  Copy,
  Dumbbell,
  ExternalLink,
  Lightbulb,
  ListOrdered,
  MoreHorizontal,
  Pencil,
  Play,
  Repeat,
  Timer,
  Trash2,
} from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/icon';
import { RoundButton } from '@/components/ui/round-button';
import { Stat } from '@/components/ui/stat';
import { Tappable } from '@/components/ui/tappable';
import { AppText } from '@/components/ui/text';
import { Pill } from '@/components/workout/category-pill';
import { ExerciseDetails } from '@/components/workout/exercise-details';
import { CreatorAvatar, CreatorRow } from '@/components/ui/avatar';
import { Thumb } from '@/components/workout/thumb';
import { BLOCK_LABEL, CATEGORY_LABEL, DIFFICULTY_LABEL, creatorLine, exerciseMeta, plural, shortDuration } from '@/lib/format';
import { exerciseCount, workoutMinutes } from '@/lib/sequence';
import { useStore, useWorkout } from '@/lib/store';
import { CATEGORY_BG } from '@/lib/theme';
import type { Block } from '@/lib/types';

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const workout = useWorkout(id);
  const { toast } = useToast();
  const [actionsOpen, setActionsOpen] = useState(false);

  if (!workout) return <View className="flex-1 bg-background" />;

  const multiSource = new Set(workout.blocks.map((b) => b.source?.creator?.name).filter(Boolean)).size > 1;

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View className={cn('rounded-b-[36px] px-5 pb-6', CATEGORY_BG[workout.category])} style={{ paddingTop: insets.top + 8 }}>
          <View className="flex-row items-center justify-between">
            <RoundButton icon={ChevronLeft} label="Back" onPress={() => router.back()} />
            <RoundButton icon={MoreHorizontal} label="More actions" onPress={() => setActionsOpen(true)} />
          </View>

          <View className="mt-5 flex-row items-end gap-4">
            <View className="flex-1 gap-2">
              <View className="flex-row gap-2">
                <Pill label={CATEGORY_LABEL[workout.category]} />
                <Pill label={DIFFICULTY_LABEL[workout.difficulty]} />
              </View>
              <AppText variant="hero">{workout.title}</AppText>
              <CreatorRow creators={workout.creators} size={36} className="mt-1" />
            </View>
            <Thumb uri={workout.source?.thumbnailUrl} category={workout.category} size={84} />
          </View>
        </View>

        <View className="gap-6 px-5 pt-5">
          <View className="flex-row gap-3">
            <Stat icon={Timer} value={`${workoutMinutes(workout)} min`} label="Duration" />
            <Stat icon={Dumbbell} value={String(exerciseCount(workout))} label="Exercises" />
            <Stat icon={ListOrdered} value={String(workout.blocks.length)} label={workout.blocks.length === 1 ? 'Part' : 'Parts'} />
          </View>

          {workout.summary ? (
            <AppText variant="body" className="text-foreground/80">
              {workout.summary}
            </AppText>
          ) : null}

          {workout.equipment.length ? <ChipRow title="You’ll need" items={workout.equipment} /> : null}
          {workout.targetMuscles.length ? <ChipRow title="Targets" items={workout.targetMuscles} /> : null}

          {workout.assumptions.length ? (
            <View className="gap-2 rounded-3xl bg-warning-soft p-4">
              <View className="flex-row items-center gap-2">
                <Icon icon={AlertTriangle} size={20} color="warning" />
                <AppText variant="headline" className="text-warning-soft-foreground">
                  Worth a quick check
                </AppText>
              </View>
              {workout.assumptions.map((a) => (
                <AppText key={a} variant="body" className="text-foreground/80">
                  • {a}
                </AppText>
              ))}
              <AppText variant="caption">Tap Edit to adjust timings or reps.</AppText>
            </View>
          ) : null}

          {workout.blocks.map((block) => (
            <View key={block.id} className="gap-3">
              <BlockHeader block={block} showSource={multiSource || Boolean(workout.mergedFrom)} />
              <Accordion selectionMode="multiple" variant="surface" className="rounded-3xl">
                {block.exercises.map((ex, i) => (
                  <Accordion.Item key={ex.id} value={ex.id}>
                    <Accordion.Trigger>
                      <View className="flex-1 flex-row items-center gap-3 py-1">
                        <View className="size-10 items-center justify-center rounded-2xl bg-default">
                          <AppText variant="headline">{i + 1}</AppText>
                        </View>
                        <View className="flex-1">
                          <AppText variant="headline">{ex.name}</AppText>
                          <AppText variant="caption">{exerciseMeta(ex)}</AppText>
                        </View>
                      </View>
                      <Accordion.Indicator />
                    </Accordion.Trigger>
                    <Accordion.Content>
                      <ExerciseDetails exercise={ex} />
                    </Accordion.Content>
                  </Accordion.Item>
                ))}
              </Accordion>
            </View>
          ))}

          {workout.tips.length ? (
            <View className="gap-2 rounded-3xl bg-violet-soft p-4">
              <View className="flex-row items-center gap-2">
                <Icon icon={Lightbulb} size={20} color="violet" />
                <AppText variant="headline">Coach tips</AppText>
              </View>
              {workout.tips.map((t) => (
                <AppText key={t} variant="body" className="text-foreground/80">
                  • {t}
                </AppText>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky actions */}
      <View className="absolute inset-x-0 bottom-0 flex-row items-center gap-3 px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) + 4 }}>
        <RoundButton icon={Pencil} label="Edit workout" size={64} onPress={() => router.push({ pathname: '/workout/[id]/edit', params: { id: workout.id } })} />
        <Button
          size="lg"
          className="h-16 flex-1 rounded-full"
          isDisabled={workout.status !== 'ready' || exerciseCount(workout) === 0}
          onPress={() => router.push({ pathname: '/workout/[id]/play', params: { id: workout.id } })}
        >
          <Icon icon={Play} size={24} color="accent-foreground" />
          <Button.Label className="text-[18px] leading-[24px]">Start workout</Button.Label>
        </Button>
      </View>

      <Dialog isOpen={actionsOpen} onOpenChange={setActionsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <Dialog.Title>{workout.title}</Dialog.Title>
            <View className="mt-4 gap-2">
              <ActionRow icon={Pencil} label="Edit" onPress={() => { setActionsOpen(false); router.push({ pathname: '/workout/[id]/edit', params: { id: workout.id } }); }} />
              <ActionRow
                icon={Copy}
                label="Duplicate"
                onPress={() => {
                  setActionsOpen(false);
                  if (useStore.getState().duplicate(workout.id)) toast.show({ variant: 'success', label: 'Copy saved to your library' });
                }}
              />
              {workout.source?.url ? (
                <ActionRow icon={ExternalLink} label="Open original post" onPress={() => { setActionsOpen(false); void Linking.openURL(workout.source?.url as string); }} />
              ) : null}
              <ActionRow
                icon={Trash2}
                label="Delete"
                danger
                onPress={() => {
                  setActionsOpen(false);
                  router.back();
                  useStore.getState().remove(workout.id);
                }}
              />
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </View>
  );
}

function ActionRow({ icon, label, onPress, danger }: { icon: typeof Pencil; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Tappable onPress={onPress} accessibilityLabel={label}>
      <View className={cn('h-14 flex-row items-center gap-3 rounded-2xl px-4', danger ? 'bg-danger-soft' : 'bg-default')}>
        <Icon icon={icon} size={20} color={danger ? 'danger' : 'foreground'} />
        <AppText variant="headline" className={danger ? 'text-danger' : undefined}>
          {label}
        </AppText>
      </View>
    </Tappable>
  );
}

function BlockHeader({ block, showSource }: { block: Block; showSource: boolean }) {
  return (
    <View className="flex-row items-end justify-between px-1">
      <View className="flex-1">
        <AppText variant="overline">{BLOCK_LABEL[block.kind]}</AppText>
        <AppText variant="title">{block.title}</AppText>
        {showSource && block.source?.creator ? (
          <View className="mt-1 flex-row items-center gap-2">
            <CreatorAvatar creator={block.source.creator} size={24} className="border-0" />
            <AppText variant="caption" className="flex-1" numberOfLines={1}>
              from {block.source.creator.name}{block.source.workoutTitle ? ` · ${block.source.workoutTitle}` : ''}
            </AppText>
          </View>
        ) : null}
      </View>
      {block.rounds > 1 ? (
        <View className="flex-row items-center gap-2 rounded-full bg-foreground px-3 py-2">
          <Icon icon={Repeat} size={16} color="background" />
          <AppText variant="label" className="text-[12px] leading-[16px] text-background">
            {plural(block.rounds, 'round')}
            {block.restBetweenRoundsSec ? ` · ${shortDuration(block.restBetweenRoundsSec)} rest` : ''}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

function ChipRow({ title, items }: { title: string; items: string[] }) {
  return (
    <View className="gap-2">
      <AppText variant="overline">{title}</AppText>
      <View className="flex-row flex-wrap gap-2">
        {items.map((t) => (
          <View key={t} className="rounded-full border border-border bg-surface px-4 py-2">
            <AppText variant="label" className="text-[12px] leading-[16px]">
              {t}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}
