import { cn } from 'heroui-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function Screen({ children, className, top = true }: { children: ReactNode; className?: string; top?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View className={cn('flex-1 bg-background', className)} style={{ paddingTop: top ? insets.top : 0 }}>
      {children}
    </View>
  );
}
