import { grid } from '@/lib/grid';
import { cn } from 'heroui-native';
import type { AppIcon } from '@/components/ui/icons';
import { View } from 'react-native';
import { Icon } from './icon';
import { Tappable } from './tappable';

type Tone = 'surface' | 'accent' | 'inverse' | 'ghost' | 'glass';

const TONE: Record<Tone, { bg: string; fg: string }> = {
  surface: { bg: 'bg-surface shadow-surface', fg: 'foreground' },
  accent: { bg: 'bg-accent', fg: 'accent-foreground' },
  inverse: { bg: 'bg-foreground', fg: 'background' },
  ghost: { bg: 'bg-default', fg: 'foreground' },
  glass: { bg: 'bg-black/35', fg: '#FFFFFF' },
};

export interface RoundButtonProps {
  icon: AppIcon;
  onPress?: () => void;
  size?: number;
  tone?: Tone;
  label: string;
  className?: string;
  disabled?: boolean;
  feedback?: 'tap' | 'firm' | 'select' | 'none';
}

/**
 * Circular icon button (the round controls in the reference shots).
 * Hit area is never below 44 pt.
 */
export function RoundButton({ icon, onPress, size = 44, tone = 'surface', label, className, disabled, feedback }: RoundButtonProps) {
  const t = TONE[tone];
  return (
    <Tappable onPress={onPress} accessibilityLabel={label} disabled={disabled} feedback={feedback} className={className}>
      <View
        className={cn('items-center justify-center rounded-full', t.bg, disabled && 'opacity-40')}
        style={{ width: size, height: size }}
      >
        <Icon icon={icon} size={grid(size * 0.42)} color={t.fg} />
      </View>
    </Tappable>
  );
}
