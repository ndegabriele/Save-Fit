import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, cn, Input, Label, TextArea, TextField, Description } from 'heroui-native';
import { Check, ClipboardPaste, Link2, Sparkles, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Icon } from '@/components/ui/icon';
import { RoundButton } from '@/components/ui/round-button';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/text';
import { hasServer, STAGE_COPY, type ImportStage } from '@/lib/api';
import { haptic } from '@/lib/feedback';
import { beginImport } from '@/lib/import-runner';
import { EASE_OUT, enterItem } from '@/lib/motion';
import { useStore, useWorkout } from '@/lib/store';

const STAGES: ImportStage[] = ['fetching', 'reading', 'watching', 'structuring', 'done'];

export default function ImportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ url?: string; text?: string; auto?: string }>();
  const [url, setUrl] = useState(params.url ?? extractUrl(params.text) ?? '');
  const [notes, setNotes] = useState(params.text && params.text !== params.url ? params.text : '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const started = useRef(false);

  const submit = async () => {
    if (busy) return;
    const link = url.trim() || null;
    const text = notes.trim() || null;
    if (!link && !text) return setError('Paste a link or the workout text.');
    setBusy(true);
    setError(null);
    try {
      const id = await beginImport({ url: link, text });
      haptic.success();
      setWorkoutId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the import.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (params.auto === '1' && !started.current && (url || notes) && hasServer()) {
      started.current = true;
      void submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paste = async () => {
    const value = await Clipboard.getStringAsync();
    const found = extractUrl(value);
    if (found) setUrl(found);
    else if (value) setNotes(value);
    haptic.select();
  };

  return (
    <Screen top={false} className="pt-4">
      <View className="flex-row items-center justify-between px-5 pb-2">
        <AppText variant="title">Save a workout</AppText>
        <RoundButton icon={X} label="Close" tone="ghost" size={40} onPress={() => router.back()} />
      </View>

      {workoutId ? (
        <Progress workoutId={workoutId} onDone={() => router.replace({ pathname: '/workout/[id]', params: { id: workoutId } })} onLibrary={() => router.back()} />
      ) : (
        <ScrollView contentContainerClassName="gap-5 px-5 pb-10 pt-3" keyboardShouldPersistTaps="handled">
          <View className="gap-3 rounded-[28px] bg-cat-mixed p-5">
            <View className="size-11 items-center justify-center rounded-full bg-foreground">
              <Icon icon={Sparkles} size={20} color="background" />
            </View>
            <AppText variant="display">Drop a reel,{'\n'}get a workout.</AppText>
            <AppText variant="body" className="text-foreground/70">
              Tip: in Instagram or TikTok tap Share → Save Fit and it lands here on its own.
            </AppText>
          </View>

          <TextField isInvalid={Boolean(error)}>
            <Label>Link</Label>
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <Input value={url} onChangeText={setUrl} placeholder="https://www.instagram.com/reel/…" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
              </View>
              <RoundButton icon={ClipboardPaste} label="Paste from clipboard" size={48} tone="ghost" onPress={paste} />
            </View>
            <Description>Instagram, TikTok, YouTube Shorts and most video links work.</Description>
          </TextField>

          <TextField>
            <Label>Caption or notes (optional)</Label>
            <TextArea value={notes} onChangeText={setNotes} placeholder="Paste the caption if the post lists the exercises, or write your own workout." numberOfLines={5} />
          </TextField>

          {error ? (
            <AppText variant="label" className="text-danger">
              {error}
            </AppText>
          ) : null}
          {!hasServer() ? (
            <AppText variant="caption">No server is set up yet. Add its address in Settings first.</AppText>
          ) : null}

          <Button size="lg" onPress={submit} isDisabled={busy || !hasServer()} className="h-16">
            <Icon icon={Link2} size={20} color="accent-foreground" />
            <Button.Label className="text-[16px] leading-[24px]">{busy ? 'Sending…' : 'Save workout'}</Button.Label>
          </Button>
        </ScrollView>
      )}
    </Screen>
  );
}

function Progress({ workoutId, onDone, onLibrary }: { workoutId: string; onDone: () => void; onLibrary: () => void }) {
  const workout = useWorkout(workoutId);
  const stage: ImportStage = workout?.status === 'ready' ? 'done' : workout?.status === 'failed' ? 'failed' : ((workout?.jobStage as ImportStage) ?? 'queued');
  const current = STAGES.indexOf(stage);

  return (
    <View className="flex-1 gap-6 px-5 pt-4">
      <AppText variant="display">{stage === 'done' ? 'Your workout is ready' : stage === 'failed' ? 'That didn’t work' : 'On it!'}</AppText>
      <AppText variant="body" className="text-muted">
        {stage === 'failed'
          ? workout?.error ?? 'Something went wrong.'
          : 'You can close this. The workout appears in your library when it’s done, usually in under a minute.'}
      </AppText>
      <View className="gap-3">
        {STAGES.map((s, i) => {
          const done = current > i || stage === 'done';
          const active = current === i && stage !== 'done';
          return (
            <Animated.View key={s} entering={enterItem(i)} className={cn('flex-row items-center gap-4 rounded-2xl bg-surface px-4 py-4 shadow-surface', !done && !active && 'opacity-50')}>
              <View className={cn('size-9 items-center justify-center rounded-full', done ? 'bg-accent' : 'bg-default')}>
                {done ? (
                  <Animated.View entering={ZoomIn.duration(220).easing(EASE_OUT).withInitialValues({ transform: [{ scale: 0.6 }] })}>
                    <Icon icon={Check} size={20} color="accent-foreground" strokeWidth={3} />
                  </Animated.View>
                ) : (
                  <AppText variant="label">{i + 1}</AppText>
                )}
              </View>
              <AppText variant="headline">{STAGE_COPY[s]}</AppText>
            </Animated.View>
          );
        })}
      </View>
      <View className="mt-auto gap-3 pb-10">
        {stage === 'done' ? (
          <Button size="lg" className="h-16" onPress={onDone}>
            <Button.Label className="text-[16px] leading-[24px]">Open workout</Button.Label>
          </Button>
        ) : null}
        <Button size="lg" variant="secondary" className="h-14" onPress={onLibrary}>
          <Button.Label>Back to library</Button.Label>
        </Button>
      </View>
    </View>
  );
}

function extractUrl(text?: string | null): string | null {
  if (!text) return null;
  return text.match(/https?:\/\/\S+/)?.[0] ?? null;
}
