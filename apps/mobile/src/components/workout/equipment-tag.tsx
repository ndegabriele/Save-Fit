import { cn } from 'heroui-native';
import { Dumbbell } from '@/components/ui/icons';
import { View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { AppText } from '@/components/ui/text';
import type { Exercise } from '@/lib/types';

/** What a move needs, as plain equipment ("Kettlebell"). Load and grip details live in "How to do it". */
export function exerciseEquipment(e: Pick<Exercise, 'equipment'>): string[] {
  return e.equipment;
}

/** The one equipment tag used everywhere: a dumbbell, a short label, on a soft lime tint. "md" is for the workout page. */
export function EquipmentTag({ label, size = 'sm' }: { label: string; size?: 'sm' | 'md' }) {
  const md = size === 'md';
  return (
    <View
      className={cn('flex-row items-center self-start rounded-full bg-accent/20', md ? 'h-10 gap-2 px-4' : 'h-7 gap-1 px-3')}
      accessibilityLabel={`Equipment: ${label}`}
    >
      <Icon icon={Dumbbell} size={md ? 16 : 12} color="foreground" />
      <AppText variant="label" numberOfLines={1} className={md ? undefined : 'text-[12px] leading-[16px]'}>
        {label}
      </AppText>
    </View>
  );
}

export function EquipmentTags({ items, className, max, size }: { items: string[]; className?: string; max?: number; size?: 'sm' | 'md' }) {
  if (!items.length) return null;
  const shown = max ? items.slice(0, max) : items;
  return (
    <View className={cn('flex-row flex-wrap gap-2', className)}>
      {shown.map((t) => (
        <EquipmentTag key={t} label={t} size={size} />
      ))}
      {max && items.length > max ? <EquipmentTag label={`+${items.length - max}`} size={size} /> : null}
    </View>
  );
}
