import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useColor } from '@/lib/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ProgressRingProps {
  /** 0..1 */
  progress: number;
  size: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
  /** Duration of each progress step; use the timer tick for smooth linear motion. */
  stepMs?: number;
}

/** Circular timer ring. Progress animates linearly (constant motion = linear). */
export function ProgressRing({ progress, size, stroke = 14, color = 'accent', track = 'default', children, stepMs = 250 }: ProgressRingProps) {
  const c = useColor(color);
  const t = useColor(track);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const p = useSharedValue(progress);

  useEffect(() => {
    // Jumps back (new step) happen instantly, forward motion is linear.
    if (progress < p.value - 0.02) p.value = progress;
    else p.value = withTiming(progress, { duration: stepMs, easing: Easing.linear });
  }, [progress, stepMs, p]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - Math.min(1, Math.max(0, p.value))),
  }));

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={t} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={c}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
        />
      </Svg>
      {children}
    </View>
  );
}
