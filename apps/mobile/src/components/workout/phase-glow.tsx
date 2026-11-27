import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { EASE_OUT } from '@/lib/motion';

// The player is always dark, so these are the dark-theme accent (lime) and violet as rgb.
const LIME = '200, 242, 75';
const VIOLET = '167, 139, 250';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

/**
 * Very subtle ambient light rising from the bottom of the player.
 *  - work: a faint lime glow; once a second a soft ripple rises out of it and fades.
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
      ripple.value = withRepeat(withTiming(1, { duration: 1000, easing: EASE_OUT }), -1, false);
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

  // Ripple: a soft band that starts at the bottom edge, rises ~40% and fades out.
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: ripple.value < 0.15 ? ripple.value / 0.15 : 1 - (ripple.value - 0.15) / 0.85,
    transform: [{ translateY: -ripple.value * 280 }],
  }));

  // Breathing: the whole glow grows taller and brighter, then settles back.
  const breathStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + breath.value * 0.45,
    transform: [{ scaleY: 0.7 + breath.value * 0.6 }],
  }));

  if (!tone) return null;
  const rgb = tone === 'work' ? LIME : VIOLET;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.glow, tone === 'rest' ? breathStyle : null, { transformOrigin: 'bottom' }]}>
        <LinearGradient colors={[`rgba(${rgb},0)`, `rgba(${rgb},${tone === 'work' ? 0.08 : 0.16})`]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {tone === 'work' ? (
        <AnimatedGradient
          colors={[`rgba(${LIME},0)`, `rgba(${LIME},0.10)`, `rgba(${LIME},0)`]}
          style={[styles.ripple, rippleStyle]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' },
  ripple: { position: 'absolute', left: 0, right: 0, bottom: -80, height: 160 },
});
