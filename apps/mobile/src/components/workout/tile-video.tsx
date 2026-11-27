import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { mediaUrl } from '@/lib/api';

/**
 * Muted, looping background video for a workout tile. Only plays while the tile is
 * on screen (`active`), and never when the system asks for reduced motion.
 */
export function TileVideo({ uri, active }: { uri: string; active: boolean }) {
  const reduceMotion = useReducedMotion();
  const src = mediaUrl(uri);
  const player = useVideoPlayer(src ? { uri: src } : null, (p) => {
    p.muted = true;
    p.loop = true;
  });

  useEffect(() => {
    if (active && !reduceMotion) player.play();
    else player.pause();
  }, [player, active, reduceMotion]);

  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} />;
}
