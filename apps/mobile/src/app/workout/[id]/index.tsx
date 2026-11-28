import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Accordion, Button, cn, Dialog, useToast } from 'heroui-native';
import { Sheet } from '@/components/ui/sheet';
import { useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
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
} from '@/components/ui/icons';
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
import { EquipmentTags, exerciseEquipment } from '@/components/workout/equipment-tag';
import { BLOCK_LABEL, CATEGORY_LABEL, DIFFICULTY_LABEL, creatorLine, exerciseMeta, plural, shortDuration } from '@/lib/format';
import { exerciseCount, workoutMinutes } from '@/lib/sequence';
import { useStore, useWorkout } from '@/lib/store';
import { CATEGORY_BG, toHex, useColor } from '@/lib/theme';
import { LinearGradient } from 'expo-linear-gradient';
import type { Block } from '@/lib/types';

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const workout = useWorkout(id);
  const { toast } = useToast();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tray, setTray] = useState<'tips' | 'check' | null>(null);
  const bg = toHex(useColor('background'));

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
            {/* Only a real thumbnail earns this spot; the category glyph said nothing the pills don't. */}
            {workout.source?.thumbnailUrl ? <Thumb uri={workout.source.thumbnailUrl} category={workout.category} size={84} /> : null}
          </View>
        </View>

        <View className="gap-6 px-5 pt-5">
          <View className="flex-row gap-3">
            <Stat icon={Timer} value={`${workoutMinutes(workout)} min`} label="Duration" />
            <Stat icon={Dumbbell} value={String(exerciseCount(workout))} label={exerciseCount(workout) === 1 ? 'Exercise' : 'Exercises'} />
            <Stat icon={ListOrdered} value={String(workout.blocks.length)} label={workout.blocks.length === 1 ? 'Part' : 'Parts'} />
          </View>

          {workout.equipment.length ? (
            <View className="gap-3">
              <AppText variant="overline">You’ll need</AppText>
              <EquipmentTags items={workout.equipment} size="md" />
            </View>
          ) : null}

          {workout.summary || workout.targetMuscles.length ? (
            <View className="gap-4">
              {workout.summary ? (
                <AppText variant="body" className="text-foreground/80">
                  {workout.summary}
                </AppText>
              ) : null}
              {workout.targetMuscles.length ? <ChipRow title="Targets" items={workout.targetMuscles} /> : null}
            </View>
          ) : null}

          {workout.blocks.map((block) => (
            <View key={block.id} className="gap-3">
              <BlockHeader block={block} showSource={multiSource || Boolean(workout.mergedFrom)} />
              <Accordion selectionMode="multiple" variant="surface" className="rounded-[22px]" classNames={{ separator: 'bg-separator/40' }}>
                {block.exercises.map((ex, i) => (
                  <Accordion.Item key={ex.id} value={ex.id}>
                    <Accordion.Trigger>
                      <View className="flex-1 flex-row items-center gap-3 py-1">
                        <View className="size-10 items-center justify-center rounded-[12px] bg-default">
                          <AppText variant="headline">{i + 1}</AppText>
                        </View>
                        <View className="flex-1">
                          <AppText variant="headline">{ex.name}</AppText>
                          <AppText variant="caption">{exerciseMeta(ex)}</AppText>
                          <EquipmentTags items={exerciseEquipment(ex)} max={2} className="mt-1" />
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

          {workout.tips.length || workout.assumptions.length ? (
            <View className="gap-3">
              {workout.tips.length ? (
                <InfoButton icon={Lightbulb} tone="violet" label="Coach tips" count={workout.tips.length} onPress={() => setTray('tips')} />
              ) : null}
              {workout.assumptions.length ? (
                <InfoButton icon={AlertTriangle} tone="warning" label="Worth a quick check" count={workout.assumptions.length} onPress={() => setTray('check')} />
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky actions, on a soft fade so the list scrolls away underneath instead of colliding with the buttons. */}
      <View className="absolute inset-x-0 bottom-0 flex-row items-center gap-3 px-5 pt-8" style={{ paddingBottom: Math.max(insets.bottom, 12) + 4 }}>
        <LinearGradient
          pointerEvents="none"
          colors={[`${bg}00`, bg, bg]}
          locations={[0, 0.45, 1]}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
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

      <Sheet isOpen={tray !== null} onClose={() => setTray(null)} title={tray === 'check' ? 'Worth a quick check' : 'Coach tips'} heightRatio={0.56}>
        <View className="gap-3">
          {(tray === 'check' ? workout.assumptions : workout.tips).map((t) => (
            <View key={t} className="flex-row gap-3">
              <View className={cn('mt-2 size-2 rounded-full', tray === 'check' ? 'bg-warning' : 'bg-violet')} />
              <AppText variant="body" className="flex-1">
                {t}
              </AppText>
            </View>
          ))}
          {tray === 'check' ? (
            <AppText variant="caption" className="mt-1">
              Tap Edit to adjust timings or reps.
            </AppText>
          ) : null}
        </View>
      </Sheet>

      <Sheet isOpen={actionsOpen} onClose={() => setActionsOpen(false)} title={workout.title} heightRatio={0.48}>
            <View className="gap-2">
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
                  setConfirmDelete(true);
                }}
              />
            </View>
      </Sheet>

      {/* Deleting can't be undone, so it asks first (HIG: confirm destructive actions). */}
      <Dialog isOpen={confirmDelete} onOpenChange={setConfirmDelete}>
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content>
            <Dialog.Title>Delete this workout?</Dialog.Title>
            <Dialog.Description>It’s also taken off your calendar. This can’t be undone.</Dialog.Description>
            <View className="mt-5 gap-3">
              <Button
                size="lg"
                variant="danger"
                onPress={() => {
                  setConfirmDelete(false);
                  router.back();
                  useStore.getState().remove(workout.id);
                }}
              >
                Delete workout
              </Button>
              <Button size="lg" variant="secondary" onPress={() => setConfirmDelete(false)}>
                Cancel
              </Button>
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
        {/* Skip the overline when the title already says it ("CIRCUIT / Circuit"). */}
        {block.title.trim().toLowerCase() !== BLOCK_LABEL[block.kind].toLowerCase() ? <AppText variant="overline">{BLOCK_LABEL[block.kind]}</AppText> : null}
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

/** A full-width row that opens a tray (coach tips, things to check). */
function InfoButton({ icon, tone, label, count, onPress }: { icon: typeof Timer; tone: 'violet' | 'warning'; label: string; count: number; onPress: () => void }) {
  return (
    <Tappable onPress={onPress} accessibilityLabel={label}>
      <View className={cn('h-16 flex-row items-center gap-3 rounded-[22px] px-4', tone === 'violet' ? 'bg-violet-soft' : 'bg-warning-soft')}>
        <Icon icon={icon} size={20} color={tone} />
        <AppText variant="headline" className="flex-1">
          {label}
        </AppText>
        <AppText variant="label" className="text-muted">
          {count}
        </AppText>
        <Icon icon={ChevronRight} size={20} color="muted" />
      </View>
    </Tappable>
  );
}

function ChipRow({ title, items }: { title: string; items: string[] }) {
  return (
    <View className="gap-2">
      <AppText variant="overline">{title}</AppText>
      <View className="flex-row flex-wrap gap-2">
        {items.map((t) => (
          <View key={t} className="h-10 justify-center rounded-full border border-border bg-surface px-4">
            <AppText variant="label">{t}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}
