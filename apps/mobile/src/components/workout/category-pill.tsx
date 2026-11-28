import { cn } from 'heroui-native';
import { View } from 'react-native';
import { AppText } from '@/components/ui/text';

/** Small frosted label on top of pastel cards ("Strength", "Cardio"). */
export function Pill({ label, className, inverted }: { label: string; className?: string; inverted?: boolean }) {
  return (
    <View className={cn('self-start rounded-full px-3 py-1', inverted ? 'bg-white/15' : 'bg-veil-soft', className)}>
      <AppText variant="label" className={cn('text-[12px]', inverted ? 'text-white' : 'text-foreground/80')}>
        {label}
      </AppText>
    </View>
  );
}
