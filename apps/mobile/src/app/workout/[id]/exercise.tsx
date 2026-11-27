import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Input, Label, ListGroup, Switch, Tabs, TextArea, TextField, Description } from 'heroui-native';
import { ArrowLeftRight, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/icon';
import { RoundButton } from '@/components/ui/round-button';
import { Stepper } from '@/components/ui/stepper';
import { AppText } from '@/components/ui/text';
import { shortDuration } from '@/lib/format';
import { useStore, useWorkout } from '@/lib/store';
import type { Exercise } from '@/lib/types';

const lines = (v: string) => v.split('\n').map((s) => s.trim()).filter(Boolean);

/** Multi-line list editor: keeps the raw text while typing, stores clean lines. */
function LinesField({ value, onChange, rows }: { value: string[]; onChange: (v: string[]) => void; rows: number }) {
  const [text, setText] = useState(value.join('\n'));
  return (
    <TextArea
      value={text}
      numberOfLines={rows}
      onChangeText={(v) => {
        setText(v);
        onChange(lines(v));
      }}
    />
  );
}

export default function EditExercise() {
  const { id, blockId, exId } = useLocalSearchParams<{ id: string; blockId: string; exId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const workout = useWorkout(id);
  const update = useStore((s) => s.update);
  const block = workout?.blocks.find((b) => b.id === blockId);
  const ex = block?.exercises.find((e) => e.id === exId);
  if (!workout || !block || !ex) return <View className="flex-1 bg-background" />;

  const patch = (p: Partial<Exercise>) =>
    update(workout.id, (w) => ({
      ...w,
      updatedAt: Date.now(),
      blocks: w.blocks.map((b) => (b.id !== blockId ? b : { ...b, exercises: b.exercises.map((e) => (e.id === exId ? { ...e, ...p } : e)) })),
    }));

  const remove = () => {
    router.back();
    update(workout.id, (w) => ({
      ...w,
      blocks: w.blocks.map((b) => (b.id !== blockId ? b : { ...b, exercises: b.exercises.filter((e) => e.id !== exId) })),
    }));
  };

  return (
    <View className="flex-1 bg-background pt-4">
      <View className="flex-row items-center justify-between px-5 pb-2">
        <AppText variant="title">Exercise</AppText>
        <RoundButton icon={X} label="Done" tone="ghost" size={40} onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerClassName="gap-5 px-5 pt-2" contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <TextField>
          <Label>Name</Label>
          <Input value={ex.name} onChangeText={(name) => patch({ name })} />
        </TextField>

        <View className="gap-2">
          <AppText variant="label">Type</AppText>
          <Tabs value={ex.mode} onValueChange={(v) => patch({ mode: v as Exercise['mode'] })}>
            <Tabs.List className="w-full">
              <Tabs.Indicator />
              <Tabs.Trigger value="time" className="flex-1">
                <Tabs.Label>Timed</Tabs.Label>
              </Tabs.Trigger>
              <Tabs.Trigger value="reps" className="flex-1">
                <Tabs.Label>Reps</Tabs.Label>
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs>
        </View>

        {ex.mode === 'time' ? (
          <Stepper label="work" value={ex.durationSec} step={5} min={5} max={3600} format={shortDuration} onChange={(durationSec) => patch({ durationSec })} />
        ) : (
          <Stepper label="reps" value={ex.reps} min={1} max={200} onChange={(reps) => patch({ reps })} />
        )}
        <View className="flex-row gap-3">
          <Stepper className="flex-1" label="sets" value={ex.sets} min={1} max={20} onChange={(sets) => patch({ sets })} />
          <Stepper className="flex-1" label="rest" value={ex.restSec} step={5} min={0} max={600} format={shortDuration} onChange={(restSec) => patch({ restSec })} />
        </View>

        <ListGroup>
          <ListGroup.Item onPress={() => patch({ perSide: !ex.perSide })}>
            <ListGroup.ItemPrefix>
              <Icon icon={ArrowLeftRight} size={20} />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Each side</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>Do it on the left, then the right</ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <Switch isSelected={ex.perSide} onSelectedChange={(perSide) => patch({ perSide })} />
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
        </ListGroup>

        <TextField>
          <Label>Weight / load</Label>
          <Input value={ex.load ?? ''} onChangeText={(load) => patch({ load })} placeholder="e.g. 2 × 8 kg dumbbells" />
        </TextField>
        <TextField>
          <Label>Steps</Label>
          <LinesField value={ex.steps} onChange={(steps) => patch({ steps })} rows={6} />
          <Description>One step per line.</Description>
        </TextField>
        <TextField>
          <Label>Form cues</Label>
          <LinesField value={ex.cues} onChange={(cues) => patch({ cues })} rows={3} />
          <Description>Short reminders shown during the workout. One per line.</Description>
        </TextField>
        <TextField>
          <Label>Notes</Label>
          <TextArea value={ex.notes ?? ''} onChangeText={(notes) => patch({ notes })} numberOfLines={3} />
        </TextField>

        <Button variant="danger-soft" onPress={remove}>
          <Icon icon={Trash2} size={18} color="danger" />
          <Button.Label>Remove exercise</Button.Label>
        </Button>
      </ScrollView>
    </View>
  );
}
