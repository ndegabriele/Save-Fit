import { useEffect, useMemo } from 'react';
import { Dimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const COLORS = ['#C8F25A', '#8B6CF6', '#FF9F6B', '#5CC8FF', '#FFD84D', '#4ADE80'];

/** One-off celebration burst for finishing a workout (the rare moment delight is allowed). */
export function Confetti({ count = 36 }: { count?: number }) {
  const reduce = useReducedMotion();
  const { width, height } = Dimensions.get('window');
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: Math.random() * width,
        drift: (Math.random() - 0.5) * 120,
        delay: Math.random() * 250,
        rotate: Math.random() * 540 - 270,
        color: COLORS[i % COLORS.length] as string,
        w: 6 + Math.random() * 6,
        h: 10 + Math.random() * 8,
        duration: 1400 + Math.random() * 900,
      })),
    [count, width],
  );
  if (reduce) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {pieces.map((p, i) => (
        <Piece key={i} {...p} fall={height * 0.75} />
      ))}
    </View>
  );
}

function Piece({ x, drift, delay, rotate, color, w, h, duration, fall }: { x: number; drift: number; delay: number; rotate: number; color: string; w: number; h: number; duration: number; fall: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.quad) }));
  }, [t, delay, duration]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.8 ? 1 : 1 - (t.value - 0.8) * 5,
    transform: [{ translateX: x + drift * t.value }, { translateY: -40 + fall * t.value }, { rotate: `${rotate * t.value}deg` }],
  }));
  return <Animated.View style={[{ position: 'absolute', width: w, height: h, borderRadius: 2, backgroundColor: color }, style]} />;
}
