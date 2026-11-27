import { X } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
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

  useEffect(() => {
    const duration = reduceMotion ? 0 : 300;
    if (isOpen) {
      setMounted(true);
      y.value = sheetH;
      y.value = withTiming(0, { duration, easing: EASE_DRAWER });
    } else if (mounted) {
      y.value = withTiming(sheetH, { duration: reduceMotion ? 0 : 220, easing: EASE_DRAWER }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sheetH]);

  const drag = Gesture.Pan()
    .onChange((e) => {
      y.value = Math.max(0, y.value + e.changeY);
    })
    .onEnd((e) => {
      if (y.value > sheetH * 0.25 || e.velocityY > 800) runOnJS(onClose)();
      else y.value = withTiming(0, { duration: 200, easing: EASE_DRAWER });
    });

  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdrop = useAnimatedStyle(() => ({ opacity: 1 - y.value / sheetH }));

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
