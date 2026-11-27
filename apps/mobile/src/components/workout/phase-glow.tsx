import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeOut,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// The player is always dark, so these are the dark-theme accent (lime) and violet as rgb.
const LIME = '200, 242, 75';
const VIOLET = '167, 139, 250';


/**
 * Very subtle ambient light rising from the bottom of the player.
 *  - work: a faint lime glow that softly pulses (swells and fades) every 2 s. No hard band, no sharp edge.
 *  - rest: a violet glow that slowly swells and settles, like deep breathing.
 * Never takes touches. Reduced motion keeps the glow and drops the movement.
 */
export function PhaseGlow({ tone, paused }: { tone: 'work' | 'rest' | null; paused: boolean }) {
  const reduced = useReducedMotion();
  const ripple = useSharedValue(0);
  const breath = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(ripple);
    cancelAnimation(breath);
    ripple.value = 0;
    breath.value = 0;
    if (reduced || paused || !tone) return;
    if (tone === 'work') {
      // A slow, soft heartbeat: 1 s up, 1 s down on a sine curve so there's no sharp start or stop.
      const ease = Easing.inOut(Easing.sin);
      ripple.value = withRepeat(
        withSequence(withTiming(1, { duration: 1000, easing: ease }), withTiming(0, { duration: 1000, easing: ease })),
        -1,
        false,
      );
    } else {
      // ~4 s in, ~4 s out.
      const ease = Easing.inOut(Easing.sin);
      breath.value = withRepeat(
        withSequence(withTiming(1, { duration: 4000, easing: ease }), withTiming(0, { duration: 4000, easing: ease })),
        -1,
        false,
      );
    }
  }, [tone, paused, reduced, ripple, breath]);

  // Pulse: the glow brightens and reaches a little higher, then settles back.
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + ripple.value * 0.55,
    transform: [{ scaleY: 0.9 + ripple.value * 0.15 }],
  }));

  // Breathing: the whole glow grows taller and brighter, then settles back.
  const breathStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + breath.value * 0.45,
    transform: [{ scaleY: 0.7 + breath.value * 0.6 }],
  }));

  if (!tone) return null;
  const rgb = tone === 'work' ? LIME : VIOLET;
  const peak = tone === 'work' ? 0.12 : 0.16;

  return (
    // Keyed by tone so work -> rest crossfades instead of popping.
    <Animated.View key={tone} entering={FadeIn.duration(600)} exiting={FadeOut.duration(400)} pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.glow, tone === 'rest' ? breathStyle : rippleStyle, { transformOrigin: 'bottom' }]}>
        {/* Many soft stops so the glow fades out with no visible edge. */}
        <LinearGradient
          colors={[`rgba(${rgb},0)`, `rgba(${rgb},${peak * 0.25})`, `rgba(${rgb},${peak * 0.6})`, `rgba(${rgb},${peak})`]}
          locations={[0, 0.45, 0.78, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' },
});
