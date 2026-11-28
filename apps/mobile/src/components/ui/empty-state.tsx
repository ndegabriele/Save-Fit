import type { AppIcon } from '@/components/ui/icons';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Icon } from './icon';
import { AppText } from './text';

export function EmptyState({ icon, title, body, action }: { icon: AppIcon; title: string; body: string; action?: ReactNode }) {
  return (
    <View className="items-center gap-3 px-8 py-12">
      <View className="size-16 items-center justify-center rounded-full bg-accent">
        <Icon icon={icon} size={28} color="accent-foreground" />
      </View>
      <AppText variant="title" className="text-center">
        {title}
      </AppText>
      <AppText variant="body" className="text-center text-muted">
        {body}
      </AppText>
      {action}
    </View>
  );
}
