import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { View } from 'react-native';
import { mediaUrl } from '@/lib/api';

/**
 * Loops one segment of the coach's video (clip.start → clip.end), muted.
 * Lets people glance at the form while they move.
 */
export function VideoClip({ uri, clip, paused, height }: { uri: string; clip: { start: number; end: number } | null | undefined; paused: boolean; height: number }) {
  const src = mediaUrl(uri);
  const player = useVideoPlayer(src ? { uri: src } : null, (p) => {
    p.muted = true;
    p.loop = !clip;
    p.timeUpdateEventInterval = 0.25;
  });

  useEffect(() => {
    if (!clip) return;
    player.currentTime = clip.start;
    player.loop = false;
  }, [player, clip?.start, clip?.end, clip]);

  useEffect(() => {
    if (paused) player.pause();
    else player.play();
  }, [player, paused]);

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (clip && (currentTime >= clip.end || currentTime < clip.start - 0.5)) player.currentTime = clip.start;
  });

  useEventListener(player, 'playToEnd', () => {
    player.currentTime = clip?.start ?? 0;
    player.play();
  });

  return (
    <View className="overflow-hidden rounded-[28px] bg-surface-secondary" style={{ height }}>
      <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="cover" nativeControls={false} />
    </View>
  );
}
