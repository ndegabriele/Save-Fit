import { cn } from 'heroui-native';
import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { Icon } from './icon';
import { AppText } from './text';

/** Icon bubble + value, as in the "48 kcal / 102 bpm" pills of the references. */
export function Stat({ icon, value, label, className }: { icon: LucideIcon; value: string; label: string; className?: string }) {
  return (
    <View className={cn('flex-1 gap-3 rounded-3xl bg-surface p-4 shadow-surface', className)}>
      <View className="size-9 items-center justify-center rounded-full bg-accent">
        <Icon icon={icon} size={18} color="accent-foreground" />
      </View>
      <View>
        <AppText variant="title">{value}</AppText>
        <AppText variant="caption">{label}</AppText>
      </View>
    </View>
  );
}
