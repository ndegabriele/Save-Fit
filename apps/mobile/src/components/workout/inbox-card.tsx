import { Button } from 'heroui-native';
import { Clapperboard, X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { Icon } from '@/components/ui/icon';
import { RoundButton } from '@/components/ui/round-button';
import { AppText } from '@/components/ui/text';
import { hasServer } from '@/lib/api';
import { beginImport } from '@/lib/import-runner';
import { EASE_OUT } from '@/lib/motion';
import { useStore } from '@/lib/store';

function shortLink(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '').replace(/\.com$/, '');
    const id = u.pathname.split('/').filter(Boolean).pop() ?? '';
    return `${host[0]?.toUpperCase()}${host.slice(1)} · ${id}`;
  } catch {
    return url;
  }
}

/** "Ready to import": saved links the user can convert with one tap. */
export function InboxCard() {
  const inbox = useStore((s) => s.inbox);
  const dismissLink = useStore((s) => s.dismissLink);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const server = hasServer();

  if (!inbox.length) return null;

  const importOne = async (url: string) => {
    setBusy(url);
    setError(null);
    try {
      await beginImport({ url });
      dismissLink(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the server.');
    } finally {
      setBusy(null);
    }
  };
  const importAll = async () => {
    for (const url of [...inbox]) await importOne(url);
  };

  return (
    <View className="gap-3 rounded-[32px] bg-surface p-5 shadow-surface">
      <View className="flex-row items-center justify-between">
        <View>
          <AppText variant="overline">Ready to import</AppText>
          <AppText variant="title">{inbox.length === 1 ? '1 saved reel' : `${inbox.length} saved reels`}</AppText>
        </View>
        <Button size="sm" onPress={importAll} isDisabled={!server || busy !== null}>
          <Button.Label>Import all</Button.Label>
        </Button>
      </View>
      {inbox.map((url) => (
        <Animated.View key={url} exiting={FadeOut.duration(160)} layout={LinearTransition.duration(220).easing(EASE_OUT)} className="flex-row items-center gap-3">
          <View className="size-11 items-center justify-center rounded-2xl bg-default">
            <Icon icon={Clapperboard} size={20} />
          </View>
          <AppText variant="label" className="flex-1" numberOfLines={1}>
            {shortLink(url)}
          </AppText>
          <Button size="sm" variant="secondary" onPress={() => importOne(url)} isDisabled={!server || busy !== null}>
            <Button.Label>{busy === url ? 'Sending…' : 'Import'}</Button.Label>
          </Button>
          <RoundButton icon={X} label="Remove from list" size={36} tone="ghost" onPress={() => dismissLink(url)} />
        </Animated.View>
      ))}
      {!server ? (
        <AppText variant="caption">Add your server address in Settings to import these.</AppText>
      ) : error ? (
        <AppText variant="caption" className="text-danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
