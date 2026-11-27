import Constants from 'expo-constants';
import { Button, Input, ListGroup, Switch, Tabs, TextField, Label, Description, useToast } from 'heroui-native';
import { Moon, RefreshCw, Server, Timer, Vibrate, Video, Volume2 } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Stepper } from '@/components/ui/stepper';
import { AppText } from '@/components/ui/text';
import { apiUrl, ping } from '@/lib/api';
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

  const toggle = (key: keyof Pick<Settings, 'sound' | 'haptics' | 'showVideo'>, icon: typeof Volume2, title: string, description: string) => (
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
              <Icon icon={Timer} size={18} color="muted" />
              <AppText variant="label" className="text-muted">
                Get-ready countdown before timed moves
              </AppText>
            </View>
            <Stepper label="seconds" value={settings.countdownSec} min={0} max={15} onChange={(v) => setSettings({ countdownSec: v })} />
          </View>
          <ListGroup>
            {toggle('sound', Volume2, 'Sounds', 'Beeps for the last 3 seconds and each new move')}
            {toggle('haptics', Vibrate, 'Haptics', 'Taps you feel on each transition')}
            {toggle('showVideo', Video, 'Coach video', 'Loop the coach’s clip for each move when available')}
          </ListGroup>
        </Section>

        <Section title="Appearance">
          <View className="flex-row items-center gap-2 px-1">
            <Icon icon={Moon} size={18} color="muted" />
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

        <Section title="Server">
          <TextField>
            <Label>Server address</Label>
            <Input value={server} onChangeText={setServer} placeholder="http://192.168.1.20:8787" autoCapitalize="none" autoCorrect={false} keyboardType="url" />
            <Description>The Save Fit server downloads the video and asks Claude to structure it.</Description>
          </TextField>
          <Button variant="secondary" onPress={testServer} isDisabled={testing || !server.trim()}>
            <Icon icon={Server} size={18} />
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
            <Icon icon={RefreshCw} size={18} />
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
