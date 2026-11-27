import { cn, PressableFeedback } from 'heroui-native';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { haptic } from '@/lib/feedback';
import { DURATION, PRESS_SCALE } from '@/lib/motion';

export interface TappableProps {
  onPress?: () => void;
  onLongPress?: () => void;
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  /** Haptic on press. Default "tap". */
  feedback?: 'tap' | 'firm' | 'select' | 'none';
  /** Scale on press (0.95-0.98). */
  scale?: number;
  accessibilityLabel?: string;
  accessibilityState?: { selected?: boolean; disabled?: boolean };
  highlight?: boolean;
}

/**
 * HeroUI PressableFeedback with Save Fit's press rules: scale 0.97 over
 * ~140 ms and a light haptic. Used for cards, rows and custom controls.
 */
export function Tappable({
  onPress,
  onLongPress,
  children,
  className,
  style,
  disabled,
  feedback = 'tap',
  scale = PRESS_SCALE,
  accessibilityLabel,
  accessibilityState,
  highlight = false,
}: TappableProps) {
  return (
    <PressableFeedback
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      isDisabled={disabled}
      onPress={() => {
        if (feedback !== 'none') haptic[feedback]();
        onPress?.();
      }}
      onLongPress={onLongPress}
      animation={{ scale: { value: scale, timingConfig: { duration: DURATION.press }, ignoreScaleCoefficient: true } }}
      className={cn(className)}
      style={style}
    >
      {highlight ? <PressableFeedback.Highlight /> : null}
      {children}
    </PressableFeedback>
  );
}
