import { Maximize2 } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, Keyframe } from 'react-native-reanimated';
import { Icon } from '@/components/ui/icon';
import { Tappable } from '@/components/ui/tappable';
import { AppText } from '@/components/ui/text';
import { grid } from '@/lib/grid';
import { DURATION, EASE_OUT } from '@/lib/motion';
import { VideoClip } from './video-clip';

type Clip = { start: number; end: number } | null | undefined;

// Grows from 92% (never from 0) so it feels like the thumbnail opening up.
const open = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.92 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: EASE_OUT },
}).duration(DURATION.base);

/**
 * Portrait (9:16) thumbnail that loops the coach's clip for the current move.
 * Tap opens it large; tap anywhere closes it again.
 */
export function ClipViewer({ uri, clip, paused, thumbHeight }: { uri: string; clip: Clip; paused: boolean; thumbHeight: number }) {
  const { width, height } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const thumbH = grid(thumbHeight);
  const thumbW = grid((thumbH * 9) / 16);
  const bigH = grid(Math.min(height * 0.78, ((width - 40) * 16) / 9));
  const bigW = grid((bigH * 9) / 16);

  return (
    <>
      <Tappable onPress={() => setExpanded(true)} accessibilityLabel="Show the coach’s video bigger">
        <View>
          <VideoClip uri={uri} clip={clip} paused={paused || expanded} height={thumbH} width={thumbW} className="rounded-[20px]" />
          <View className="absolute bottom-2 right-2 size-8 items-center justify-center rounded-full bg-black/50">
            <Icon icon={Maximize2} size={16} color="#FFFFFF" />
          </View>
        </View>
      </Tappable>

      <Modal visible={expanded} transparent animationType="none" onRequestClose={() => setExpanded(false)} statusBarTranslucent>
        <Pressable className="flex-1" onPress={() => setExpanded(false)} accessibilityLabel="Close video">
          <Animated.View entering={FadeIn.duration(DURATION.fast)} exiting={FadeOut.duration(150)} className="flex-1 items-center justify-center bg-black/85">
            <Animated.View entering={open}>
              <VideoClip uri={uri} clip={clip} paused={paused} height={bigH} width={bigW} className="rounded-[32px]" />
            </Animated.View>
            <AppText variant="label" className="absolute bottom-12 text-white/70">
              Tap anywhere to close
            </AppText>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}
