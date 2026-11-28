import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Input, Label, TextField, useToast } from 'heroui-native';
import { ArrowDown, ArrowUp, Check, ChevronRight, Plus, Trash2, X } from '@/components/ui/icons';
import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/icon';
import { RoundButton } from '@/components/ui/round-button';
import { Stepper } from '@/components/ui/stepper';
import { Tappable } from '@/components/ui/tappable';
import { AppText } from '@/components/ui/text';
import { Choice } from '@/components/ui/choice';
import { BLOCK_LABEL, CATEGORY_LABEL, DIFFICULTY_LABEL, exerciseMeta, shortDuration } from '@/lib/format';
import { uid } from '@/lib/id';
import { DURATION, EASE_IN_OUT } from '@/lib/motion';
import { normalizeExercise } from '@/lib/normalize';
import { useStore, useWorkout } from '@/lib/store';
import type { Block, BlockKind, Category, Creator, Difficulty, Workout } from '@/lib/types';

const reorder = LinearTransition.duration(DURATION.base).easing(EASE_IN_OUT);

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  if (item !== undefined) copy.splice(to, 0, item);
  return copy;
}

export default function EditWorkout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const workout = useWorkout(id);
  const update = useStore((s) => s.update);
  const { toast } = useToast();
  // Edits apply as you go (so the exercise editor sees them); Cancel puts this snapshot back.
  const original = useRef(workout);
  if (!workout) return <View className="flex-1 bg-background" />;

  const cancel = () => {
    const before = original.current;
    if (before) update(workout.id, () => before);
    router.back();
  };
  const save = () => {
    toast.show({ variant: 'success', label: 'Changes saved' });
    router.back();
  };
  // One rest for every exercise in a part: the value shown is the first exercise's.
  const exerciseRest = (b: Block) => b.exercises[0]?.restSec ?? 0;

  const patch = (p: Partial<Workout>) => update(workout.id, (w) => ({ ...w, ...p, updatedAt: Date.now() }));
  const patchBlock = (blockId: string, fn: (b: Block) => Block) =>
    patch({ blocks: workout.blocks.map((b) => (b.id === blockId ? fn(b) : b)) });

  const addExercise = (blockId: string) => {
    const ex = normalizeExercise({ name: 'New exercise', mode: 'time', durationSec: 40, restSec: 20 }, uid);
    patchBlock(blockId, (b) => ({ ...b, exercises: [...b.exercises, ex] }));
    router.push({ pathname: '/workout/[id]/exercise', params: { id: workout.id, blockId, exId: ex.id } });
  };

  const addBlock = () =>
    patch({
      blocks: [...workout.blocks, { id: uid(), title: BLOCK_LABEL.main, kind: 'main', rounds: 1, restBetweenRoundsSec: 0, exercises: [], source: null }],
    });

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center justify-between px-5 pb-4">
        <RoundButton icon={X} label="Cancel changes" tone="ghost" onPress={cancel} />
        <AppText variant="headline">Edit workout</AppText>
        <View className="size-11" />
      </View>

      <ScrollView contentContainerClassName="gap-8 px-5 pt-2" contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} keyboardShouldPersistTaps="handled">
        <View className="gap-5">
          <TextField>
            <Label>Title</Label>
            <Input value={workout.title} onChangeText={(title) => patch({ title })} />
          </TextField>
          <TextField>
            <Label>Coach</Label>
            <CoachInput workout={workout} onChange={(creators) => patch({ creators })} />
          </TextField>
          <Choice<Category>
            label="Type"
            value={workout.category}
            options={Object.keys(CATEGORY_LABEL) as Category[]}
            format={(c) => CATEGORY_LABEL[c]}
            onChange={(category) => patch({ category })}
          />
          <Choice<Difficulty>
            label="Level"
            value={workout.difficulty}
            options={Object.keys(DIFFICULTY_LABEL) as Difficulty[]}
            format={(d) => DIFFICULTY_LABEL[d]}
            onChange={(difficulty) => patch({ difficulty })}
          />
        </View>

        {workout.blocks.map((block, bi) => (
          <Animated.View key={block.id} layout={reorder} className="gap-4 rounded-[28px] bg-surface p-4 shadow-surface">
            <View className="flex-row items-center gap-2">
              <View className="flex-1 pl-1">
                <AppText variant="caption">Part {bi + 1}</AppText>
                <AppText variant="title">{block.title}</AppText>
              </View>
              <RoundButton icon={ArrowUp} label="Move part up" tone="ghost" size={40} disabled={bi === 0} onPress={() => patch({ blocks: move(workout.blocks, bi, bi - 1) })} />
              <RoundButton icon={ArrowDown} label="Move part down" tone="ghost" size={40} disabled={bi === workout.blocks.length - 1} onPress={() => patch({ blocks: move(workout.blocks, bi, bi + 1) })} />
              <RoundButton icon={Trash2} label="Delete part" tone="ghost" size={40} onPress={() => patch({ blocks: workout.blocks.filter((b) => b.id !== block.id) })} />
            </View>
            <Choice<BlockKind>
              value={block.kind}
              options={Object.keys(BLOCK_LABEL) as BlockKind[]}
              format={(k) => BLOCK_LABEL[k]}
              onChange={(kind) => patchBlock(block.id, (b) => ({ ...b, kind, title: BLOCK_LABEL[kind] }))}
            />
            <View className="flex-row gap-3">
              <Stepper className="flex-1" label="rounds" value={block.rounds} min={1} max={20} onChange={(rounds) => patchBlock(block.id, (b) => ({ ...b, rounds }))} />
              <Stepper
                className="flex-1"
                label="round rest"
                value={block.restBetweenRoundsSec}
                step={15}
                min={0}
                max={600}
                format={shortDuration}
                onChange={(restBetweenRoundsSec) => patchBlock(block.id, (b) => ({ ...b, restBetweenRoundsSec }))}
              />
            </View>
            {/* Quick rest between exercises: sets every exercise in this part at once. */}
            {block.exercises.length ? (
              <View className="gap-2">
                <Stepper
                  label="rest between exercises"
                  value={exerciseRest(block)}
                  step={5}
                  min={0}
                  max={300}
                  format={(v) => (v ? shortDuration(v) : 'None')}
                  onChange={(restSec) => patchBlock(block.id, (b) => ({ ...b, exercises: b.exercises.map((e) => ({ ...e, restSec })) }))}
                />
                <View className="flex-row gap-2">
                  {[0, 10, 15, 20, 30, 45].map((sec) => {
                    const on = block.exercises.every((e) => e.restSec === sec);
                    return (
                      <Tappable key={sec} className="flex-1" feedback="select" accessibilityLabel={sec ? `${sec} seconds rest` : 'No rest'} accessibilityState={{ selected: on }} onPress={() => patchBlock(block.id, (b) => ({ ...b, exercises: b.exercises.map((e) => ({ ...e, restSec: sec })) }))}>
                        <View className={on ? 'h-10 items-center justify-center rounded-full bg-foreground' : 'h-10 items-center justify-center rounded-full bg-default'}>
                          <AppText variant="label" className={on ? 'text-[12px] leading-[16px] text-background' : 'text-[12px] leading-[16px]'}>
                            {sec ? `${sec}s` : 'None'}
                          </AppText>
                        </View>
                      </Tappable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {block.exercises.map((ex, i) => (
              <Animated.View key={ex.id} layout={reorder} className="flex-row items-center gap-2 rounded-[22px] bg-surface-secondary p-2 pl-4">
                <Tappable
                  className="flex-1"
                  onPress={() => router.push({ pathname: '/workout/[id]/exercise', params: { id: workout.id, blockId: block.id, exId: ex.id } })}
                  accessibilityLabel={`Edit ${ex.name}`}
                >
                  <View className="flex-row items-center gap-2 py-1">
                    <View className="flex-1">
                      <AppText variant="headline" numberOfLines={1}>
                        {ex.name}
                      </AppText>
                      <AppText variant="caption">{exerciseMeta(ex)}</AppText>
                    </View>
                    <Icon icon={ChevronRight} size={20} color="muted" />
                  </View>
                </Tappable>
                <RoundButton icon={ArrowUp} label="Move up" tone="surface" size={36} disabled={i === 0} onPress={() => patchBlock(block.id, (b) => ({ ...b, exercises: move(b.exercises, i, i - 1) }))} />
                <RoundButton
                  icon={ArrowDown}
                  label="Move down"
                  tone="surface"
                  size={36}
                  disabled={i === block.exercises.length - 1}
                  onPress={() => patchBlock(block.id, (b) => ({ ...b, exercises: move(b.exercises, i, i + 1) }))}
                />
              </Animated.View>
            ))}
            <Button variant="tertiary" onPress={() => addExercise(block.id)}>
              <Icon icon={Plus} size={20} />
              <Button.Label className="text-foreground">Add exercise</Button.Label>
            </Button>
          </Animated.View>
        ))}

        <Button variant="tertiary" size="lg" onPress={addBlock}>
          <Icon icon={Plus} size={20} />
          <Button.Label className="text-foreground">Add a part</Button.Label>
        </Button>
      </ScrollView>

      {/* Save, pinned like Start workout on the workout page. */}
      <View className="absolute inset-x-0 bottom-0 bg-background px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) + 4 }}>
        <Button size="lg" className="h-16 rounded-full" onPress={save} isDisabled={!workout.title.trim()}>
          <Icon icon={Check} size={20} color="accent-foreground" />
          <Button.Label className="text-[16px] leading-[24px]">Save changes</Button.Label>
        </Button>
      </View>
    </View>
  );
}


/** Comma-separated coach names; keeps raw text while typing so spaces and commas work. */
function CoachInput({ workout, onChange }: { workout: Workout; onChange: (c: Creator[]) => void }) {
  const [text, setText] = useState(workout.creators.map((c) => c.name).join(', '));
  return (
    <Input
      value={text}
      placeholder="Coach or influencer name"
      onChangeText={(v) => {
        setText(v);
        const names = v.split(',').map((n) => n.trim()).filter(Boolean);
        onChange(names.map((name) => workout.creators.find((c) => c.name === name) ?? { name }));
      }}
    />
  );
}
