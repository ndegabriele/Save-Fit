import type { BottomTabBarProps } from 'expo-router/tabs';
import { Tabs, useRouter } from 'expo-router';
import { cn } from 'heroui-native';
import { House, Plus, Settings2 } from 'lucide-react-native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/icon';
import { Tappable } from '@/components/ui/tappable';
import { AppText } from '@/components/ui/text';

/**
 * Floating pill navigation (from the reference shots): round Home and
 * Settings buttons with a big "Save workout" action in the middle.
 */
function FloatingBar({ state, navigateToTab }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;

  const tab = (name: string, icon: typeof House, label: string) => {
    const active = current === name;
    const key = state.routes.find((r) => r.name === name)?.key;
    return (
      <Tappable onPress={() => key && navigateToTab(key)} feedback="select" accessibilityLabel={label}>
        <View className={cn('size-14 items-center justify-center rounded-full', active ? 'bg-foreground' : 'bg-surface shadow-surface')}>
          <Icon icon={icon} size={24} color={active ? 'background' : 'foreground'} />
        </View>
      </Tappable>
    );
  };

  return (
    <View pointerEvents="box-none" className="absolute inset-x-0 bottom-0 flex-row items-center justify-between px-6" style={{ paddingBottom: Math.max(insets.bottom, 12) + 6 }}>
      {tab('index', House, 'Workouts')}
      <Tappable onPress={() => router.push('/import')} feedback="firm" accessibilityLabel="Save a workout">
        <View className="h-14 flex-row items-center gap-2 rounded-full bg-accent px-6 shadow-overlay">
          <Icon icon={Plus} size={24} color="accent-foreground" strokeWidth={2.6} />
          <AppText variant="headline" className="text-accent-foreground">
            Save workout
          </AppText>
        </View>
      </Tappable>
      {tab('settings', Settings2, 'Settings')}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <FloatingBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Workouts' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
