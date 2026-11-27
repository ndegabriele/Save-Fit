import { X } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RoundButton } from '@/components/ui/round-button';
import { AppText } from '@/components/ui/text';
import { EASE_DRAWER } from '@/lib/motion';

/**
 * Bottom sheet for extra information (how-to steps, details, actions).
 * Rises to 75% of the screen; content scrolls inside. Close by tapping the
 * backdrop, the X, or dragging the handle down.
 * Built on Modal + Reanimated so it works in Expo Go (HeroUI's BottomSheet needs a native module).
 */
export function Sheet({ isOpen, onClose, title, children, heightRatio = 0.75 }: { isOpen: boolean; onClose: () => void; title?: string; children: ReactNode; heightRatio?: number }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const sheetH = Math.round((height * heightRatio) / 4) * 4;
  const [mounted, setMounted] = useState(isOpen);
  const y = useSharedValue(sheetH);
  // Reduced motion: no sliding, the sheet and backdrop just fade.
  const fade = useSharedValue(0);
  const dragStart = useSharedValue(0);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      if (reduceMotion) {
        y.set(0);
        fade.set(withTiming(1, { duration: 200 }));
      } else {
        fade.set(1);
        y.set(sheetH);
        // Enter on the iOS drawer curve; exit a little faster than enter.
        y.set(withTiming(0, { duration: 300, easing: EASE_DRAWER }));
      }
    } else if (mounted) {
      const done = (finished?: boolean) => {
        'worklet';
        if (finished) scheduleOnRN(setMounted, false);
      };
      if (reduceMotion) fade.set(withTiming(0, { duration: 160 }, done));
      else y.set(withTiming(sheetH, { duration: 220, easing: EASE_DRAWER }, done));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sheetH]);

  const drag = Gesture.Pan()
    .onStart(() => {
      dragStart.set(y.get());
    })
    .onUpdate((e) => {
      const raw = dragStart.get() + e.translationY;
      // Tracks the finger 1:1 downwards; dragging up past the top meets growing resistance instead of a wall.
      y.set(raw >= 0 ? raw : -Math.sqrt(-raw) * 3);
    })
    .onEnd((e) => {
      // A flick is enough: velocity or distance closes it.
      if (y.get() > sheetH * 0.25 || e.velocityY > 500) scheduleOnRN(onClose);
      else y.set(withSpring(0, { duration: 300, dampingRatio: 0.8, velocity: e.velocityY }));
    });

  const panel = useAnimatedStyle(() => ({ opacity: fade.get(), transform: [{ translateY: y.get() }] }));
  const backdrop = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, 1 - y.get() / sheetH)) * fade.get() }));

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, backdrop]} className="bg-black/60">
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: sheetH }, panel]} className="rounded-t-[32px] bg-surface">
          <GestureDetector gesture={drag}>
            <View className="items-center pb-2 pt-3">
              <View className="h-1 w-12 rounded-full bg-foreground/20" />
              <View className="w-full flex-row items-center justify-between gap-3 px-5 pt-3">
                <AppText variant="title" numberOfLines={2} className="flex-1">
                  {title}
                </AppText>
                <RoundButton icon={X} label="Close" tone="ghost" size={40} onPress={onClose} />
              </View>
            </View>
          </GestureDetector>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}
