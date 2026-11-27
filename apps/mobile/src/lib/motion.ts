import { Easing, FadeIn, FadeInDown, FadeOut, ReduceMotion } from 'react-native-reanimated';

/**
 * Motion rules (after Emil Kowalski's design-engineering skills):
 *  - enter/exit use a strong ease-out, on-screen movement uses ease-in-out;
 *    never ease-in for UI.
 *  - UI animations stay under 300 ms; press feedback 100-160 ms.
 *  - press scale 0.97; nothing ever scales up from 0.
 *  - stagger 30-80 ms and never block interaction.
 *  - reduced motion keeps opacity, drops movement (ReduceMotion.System).
 *  - delight (bounce, confetti) only for rare moments: finishing a workout.
 */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
export const EASE_DRAWER = Easing.bezier(0.32, 0.72, 0, 1);

export const DURATION = {
  press: 140,
  fast: 180,
  base: 240,
  slow: 320,
} as const;

export const PRESS_SCALE = 0.97;

/** Apple-like spring, bounce ~0.2. Use for playful moments only. */
export const SPRING_PLAYFUL = { duration: 500, dampingRatio: 0.8 } as const;
export const SPRING_SNAPPY = { duration: 350, dampingRatio: 1 } as const;

/** List item entrance: 8 px rise + fade, short stagger capped so long lists don't drag. */
export const enterItem = (index: number) =>
  FadeInDown.duration(DURATION.base)
    .easing(EASE_OUT)
    .delay(Math.min(index, 8) * 40)
    .withInitialValues({ transform: [{ translateY: 8 }] })
    .reduceMotion(ReduceMotion.System);

export const fadeIn = FadeIn.duration(DURATION.fast).easing(EASE_OUT);
export const fadeOut = FadeOut.duration(150).easing(EASE_OUT);
