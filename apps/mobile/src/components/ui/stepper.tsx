import { cn } from 'heroui-native';
import { Minus, Plus } from '@/components/ui/icons';
import { View } from 'react-native';
import { AppText } from './text';
import { RoundButton } from './round-button';

export interface StepperProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
  className?: string;
}

/** Number field with big −/+ buttons. Built from HeroUI tokens (no stepper in HeroUI Native yet). */
export function Stepper({ label, value, onChange, step = 1, min = 0, max = 999, format, className }: StepperProps) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <View className={cn('flex-row items-center justify-between rounded-2xl bg-surface-secondary px-2 py-2', className)}>
      <RoundButton icon={Minus} label={`Decrease ${label}`} tone="surface" size={40} feedback="select" disabled={value <= min} onPress={() => onChange(clamp(value - step))} />
      {/* The middle takes the space between the buttons and shrinks long values ("1 min 30s") to fit. */}
      <View className="min-w-0 flex-1 items-center px-1">
        <AppText variant="title" className="text-[20px]" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {format ? format(value) : value}
        </AppText>
        <AppText variant="caption" className="text-[12px]" numberOfLines={1}>
          {label}
        </AppText>
      </View>
      <RoundButton icon={Plus} label={`Increase ${label}`} tone="surface" size={40} feedback="select" disabled={value >= max} onPress={() => onChange(clamp(value + step))} />
    </View>
  );
}
