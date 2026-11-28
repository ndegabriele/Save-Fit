import Constants from 'expo-constants';
import { Button, Input, ListGroup, Slider, Switch, Tabs, TextField, Label, Description, useToast } from 'heroui-native';
import { KeyRound, Moon, RefreshCw, Server, ShieldCheck, Timer, Trash2, UserSound, Vibrate, Video, Volume2 } from '@/components/ui/icons';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Stepper } from '@/components/ui/stepper';
import { AppText } from '@/components/ui/text';
import { maskKey, setAiKey, useAiKey } from '@/lib/ai-key';
import { apiUrl, checkAiKey, ping } from '@/lib/api';
import { play, preloadAudio, say } from '@/lib/feedback';
import { IS_EXPO_GO } from '@/lib/share-intent';
import { useStore, type Settings } from '@/lib/store';

export default function SettingsScreen() {
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const { toast } = useToast();
  const [server, setServer] = useState(settings.apiUrl || apiUrl());
  const [testing, setTesting] = useState(false);

  const testServer = async () => {
    setTesting(true);
    const ok = await ping(server);
    setTesting(false);
    if (ok) setSettings({ apiUrl: server.trim() });
    toast.show({
      variant: ok ? 'success' : 'danger',
      label: ok ? 'Connected' : 'Can’t reach the server',
      description: ok ? 'New links will be processed by this server.' : 'Check the address and that your phone is on the same network.',
    });
  };

  const toggle = (key: keyof Pick<Settings, 'haptics' | 'showVideo'>, icon: typeof Volume2, title: string, description: string) => (
    <ListGroup.Item onPress={() => setSettings({ [key]: !settings[key] })}>
      <ListGroup.ItemPrefix>
        <Icon icon={icon} size={20} />
      </ListGroup.ItemPrefix>
      <ListGroup.ItemContent>
        <ListGroup.ItemTitle>{title}</ListGroup.ItemTitle>
        <ListGroup.ItemDescription>{description}</ListGroup.ItemDescription>
      </ListGroup.ItemContent>
      <ListGroup.ItemSuffix>
        <Switch isSelected={settings[key]} onSelectedChange={(v) => setSettings({ [key]: v })} />
      </ListGroup.ItemSuffix>
    </ListGroup.Item>
  );

  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-6 px-5 pb-36 pt-4" keyboardShouldPersistTaps="handled">
        <AppText variant="hero">Settings</AppText>

        <Section title="During workouts">
          <View className="gap-3">
            <View className="flex-row items-center gap-2 px-1">
              <Icon icon={Timer} size={20} color="muted" />
              <AppText variant="label" className="text-muted">
                Get-ready countdown before timed moves
              </AppText>
            </View>
            <Stepper label="seconds" value={settings.countdownSec} min={0} max={15} onChange={(v) => setSettings({ countdownSec: v })} />
          </View>
          <AudioControl
            icon={Volume2}
            title="Sound effects"
            description="Soft beeps for the last 5 seconds, a chime on each move"
            enabled={settings.sfx}
            volume={settings.sfxVolume}
            onEnabled={(sfx) => {
              setSettings({ sfx });
              if (sfx) play('go');
            }}
            onVolume={(sfxVolume) => setSettings({ sfxVolume })}
            preview={() => play('tick')}
          />
          <AudioControl
            icon={UserSound}
            title="Coach voice"
            description="A calm 5 to 1 on the last seconds. Beeps soften under it."
            enabled={settings.voice}
            volume={settings.voiceVolume}
            onEnabled={(voice) => {
              setSettings({ voice });
              if (voice) say(3);
            }}
            onVolume={(voiceVolume) => setSettings({ voiceVolume })}
            preview={() => say(3)}
          />
          <ListGroup>
            {toggle('haptics', Vibrate, 'Haptics', 'Taps you feel on each transition')}
            {toggle('showVideo', Video, 'Coach video', 'Loop the coach’s clip for each move when available')}
          </ListGroup>
        </Section>

        <Section title="Appearance">
          <View className="flex-row items-center gap-2 px-1">
            <Icon icon={Moon} size={20} color="muted" />
            <AppText variant="label" className="text-muted">
              Theme
            </AppText>
          </View>
          <Tabs value={settings.theme} onValueChange={(v) => setSettings({ theme: v as Settings['theme'] })}>
            <Tabs.List className="w-full">
              <Tabs.Indicator />
              {(['system', 'light', 'dark'] as const).map((t) => (
                <Tabs.Trigger key={t} value={t} className="flex-1">
                  <Tabs.Label className="capitalize">{t}</Tabs.Label>
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Tabs>
        </Section>

        <AiAccount />

        <Section title="Server">
          <TextField>
            <Label>Server address</Label>
            <Input value={server} onChangeText={setServer} placeholder="http://192.168.1.20:8787" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
            <Description>The Save Fit server downloads the video and asks Claude to structure it.</Description>
          </TextField>
          <Button variant="secondary" onPress={testServer} isDisabled={testing || !server.trim()}>
            <Icon icon={Server} size={20} />
            <Button.Label>{testing ? 'Testing…' : 'Test & save'}</Button.Label>
          </Button>
        </Section>

        <Section title="Library">
          <Button
            variant="tertiary"
            onPress={() => {
              useStore.setState({ seeded: false });
              useStore.getState().seedSamples();
              toast.show({ variant: 'success', label: 'Sample workouts added' });
            }}
          >
            <Icon icon={RefreshCw} size={20} />
            <Button.Label>Add sample workouts</Button.Label>
          </Button>
        </Section>

        <AppText variant="caption" className="text-center">
          Save Fit {Constants.expoConfig?.version}
          {IS_EXPO_GO ? ' · Expo Go (share sheet needs a dev build)' : ''}
        </AppText>
      </ScrollView>
    </Screen>
  );
}

/**
 * TEMPORARY: bring-your-own Claude key until Save Fit has real accounts.
 * The key stays in the phone's secure storage and is sent only to your Save Fit server with each import.
 */
function AiAccount() {
  const key = useAiKey();
  const { toast } = useToast();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const save = async () => {
    const value = draft.trim();
    if (!/^sk-ant-/.test(value)) return setError('Claude API keys start with “sk-ant-”.');
    setChecking(true);
    setError(null);
    const problem = await checkAiKey(value);
    setChecking(false);
    // Unreachable server: keep the key anyway, it will be checked on the first import.
    if (problem && !/reach|server address/i.test(problem)) return setError(problem);
    await setAiKey(value);
    setDraft('');
    toast.show({ variant: 'success', label: 'Claude key saved', description: problem ? 'Saved, but not checked yet: ' + problem : 'Imports will use your own Claude account.' });
  };

  return (
    <Section title="AI account">
      <View className="gap-3 rounded-[24px] border border-dashed border-warning/60 bg-warning-soft p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Icon icon={KeyRound} size={20} />
            <AppText variant="headline">Your Claude key</AppText>
          </View>
          <View className="rounded-full bg-warning px-3 py-1">
            <AppText variant="label" className="text-[12px] leading-[16px] uppercase tracking-wider text-warning-foreground">
              Temporary
            </AppText>
          </View>
        </View>
        <AppText variant="caption" className="text-foreground/70">
          Until Save Fit has its own accounts, imports run on your personal Claude API key. Create one at console.anthropic.com → API keys. It is stored only in this phone’s secure storage, sent to your server with each import, and never saved there.
        </AppText>
        {key ? (
          <View className="flex-row items-center gap-3 rounded-2xl bg-surface p-3">
            <Icon icon={ShieldCheck} size={20} color="success" />
            <AppText variant="label" className="flex-1" numberOfLines={1}>
              {maskKey(key)}
            </AppText>
            <Button
              size="sm"
              variant="danger-soft"
              onPress={async () => {
                await setAiKey(null);
                toast.show({ variant: 'default', label: 'Key removed from this phone' });
              }}
            >
              <Icon icon={Trash2} size={16} color="danger" />
              <Button.Label>Remove</Button.Label>
            </Button>
          </View>
        ) : (
          <>
            <TextField isInvalid={Boolean(error)}>
              <Input
                value={draft}
                onChangeText={(t) => {
                  setDraft(t);
                  setError(null);
                }}
                placeholder="sk-ant-…"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                textContentType="password"
              />
              {error ? <Description className="text-danger">{error}</Description> : null}
            </TextField>
            <Button onPress={save} isDisabled={checking || !draft.trim()}>
              <Button.Label>{checking ? 'Checking…' : 'Check & save key'}</Button.Label>
            </Button>
          </>
        )}
      </View>
    </Section>
  );
}

/** One audio layer: on/off plus a volume slider that previews the level when released. */
function AudioControl({
  icon,
  title,
  description,
  enabled,
  volume,
  onEnabled,
  onVolume,
  preview,
}: {
  icon: typeof Volume2;
  title: string;
  description: string;
  enabled: boolean;
  volume: number;
  onEnabled: (v: boolean) => void;
  onVolume: (v: number) => void;
  preview: () => void;
}) {
  const [draft, setDraft] = useState(Math.round(volume * 100));
  useEffect(() => setDraft(Math.round(volume * 100)), [volume]);
  useEffect(() => preloadAudio(), []);

  return (
    <ListGroup>
      <ListGroup.Item onPress={() => onEnabled(!enabled)}>
        <ListGroup.ItemPrefix>
          <Icon icon={icon} size={20} />
        </ListGroup.ItemPrefix>
        <ListGroup.ItemContent>
          <ListGroup.ItemTitle>{title}</ListGroup.ItemTitle>
          <ListGroup.ItemDescription>{description}</ListGroup.ItemDescription>
        </ListGroup.ItemContent>
        <ListGroup.ItemSuffix>
          <Switch isSelected={enabled} onSelectedChange={onEnabled} />
        </ListGroup.ItemSuffix>
      </ListGroup.Item>
      {enabled ? (
        <View className="flex-row items-center gap-3 pb-4 pl-12 pr-4">
          <Slider
            className="flex-1"
            value={draft}
            minValue={0}
            maxValue={100}
            step={5}
            onChange={(v) => setDraft(v as number)}
            onChangeEnd={(v) => {
              onVolume((v as number) / 100);
              preview();
            }}
            accessibilityLabel={`${title} volume`}
          >
            <Slider.Track>
              <Slider.Fill />
              <Slider.Thumb />
            </Slider.Track>
          </Slider>
          <AppText variant="label" className="w-12 text-right text-muted">
            {draft}%
          </AppText>
        </View>
      ) : null}
    </ListGroup>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <AppText variant="overline" className="px-1">
        {title}
      </AppText>
      {children}
    </View>
  );
}
