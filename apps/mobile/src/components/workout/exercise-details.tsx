import { View } from 'react-native';
import { AppText } from '@/components/ui/text';
import type { Exercise } from '@/lib/types';

/** Numbered steps + cues + mistakes + variations. Used in detail and player "how to". */
export function ExerciseDetails({ exercise }: { exercise: Exercise }) {
  return (
    <View className="gap-4">
      {exercise.steps.length ? (
        <View className="gap-2.5">
          {exercise.steps.map((step, i) => (
            <View key={i} className="flex-row gap-3">
              <View className="mt-0.5 size-6 items-center justify-center rounded-full bg-foreground">
                <AppText variant="label" className="text-[12px] text-background">
                  {i + 1}
                </AppText>
              </View>
              <AppText variant="body" className="flex-1">
                {step}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}

      {exercise.cues.length ? <Tags title="Focus on" items={exercise.cues} tone="accent" /> : null}
      {exercise.commonMistakes.length ? <Bullets title="Avoid" items={exercise.commonMistakes} /> : null}
      {exercise.breathing ? <Line title="Breathing" body={exercise.breathing} /> : null}
      {exercise.tempo ? <Line title="Tempo" body={exercise.tempo} /> : null}
      {exercise.load ? <Line title="Load" body={exercise.load} /> : null}
      {exercise.easier || exercise.harder ? (
        <View className="flex-row gap-3">
          {exercise.easier ? <Variation label="Easier" body={exercise.easier} /> : null}
          {exercise.harder ? <Variation label="Harder" body={exercise.harder} /> : null}
        </View>
      ) : null}
      {exercise.muscles.length ? <Tags title="Muscles" items={exercise.muscles} /> : null}
      {exercise.notes ? <Line title="Notes" body={exercise.notes} /> : null}
    </View>
  );
}

function Tags({ title, items, tone }: { title: string; items: string[]; tone?: 'accent' }) {
  return (
    <View className="gap-2">
      <AppText variant="overline">{title}</AppText>
      <View className="flex-row flex-wrap gap-2">
        {items.map((t) => (
          <View key={t} className={tone === 'accent' ? 'rounded-full bg-accent px-3 py-1.5' : 'rounded-full bg-default px-3 py-1.5'}>
            <AppText variant="label" className={tone === 'accent' ? 'text-[13px] text-accent-foreground' : 'text-[13px]'}>
              {t}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  return (
    <View className="gap-1.5">
      <AppText variant="overline">{title}</AppText>
      {items.map((t) => (
        <AppText key={t} variant="body" className="text-muted">
          ✕  {t}
        </AppText>
      ))}
    </View>
  );
}

function Line({ title, body }: { title: string; body: string }) {
  return (
    <View className="gap-1">
      <AppText variant="overline">{title}</AppText>
      <AppText variant="body">{body}</AppText>
    </View>
  );
}

function Variation({ label, body }: { label: string; body: string }) {
  return (
    <View className="flex-1 gap-1 rounded-2xl bg-surface-secondary p-3">
      <AppText variant="overline">{label}</AppText>
      <AppText variant="label" className="font-normal">
        {body}
      </AppText>
    </View>
  );
}
