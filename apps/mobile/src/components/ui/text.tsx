import { cn } from 'heroui-native';
import { Text as RNText, type TextProps } from 'react-native';

type Variant = 'number' | 'hero' | 'display' | 'title' | 'headline' | 'body' | 'label' | 'caption' | 'overline';

const VARIANTS: Record<Variant, string> = {
  // Big numbers (minutes, timers, reps). Size comes from className / style.
  number: 'font-display tracking-tighter text-foreground',
  // Bricolage Grotesque for big, characterful headings and numbers.
  hero: 'font-display text-[40px] leading-[44px] tracking-tight text-foreground',
  display: 'font-display text-[32px] leading-[36px] tracking-tight text-foreground',
  title: 'font-display text-[24px] leading-[28px] tracking-tight text-foreground',
  // Inter for everything people read.
  headline: 'font-semibold text-[18px] leading-[24px] text-foreground',
  body: 'font-normal text-[16px] leading-[24px] text-foreground',
  label: 'font-medium text-[14px] leading-[20px] text-foreground',
  caption: 'font-normal text-[12px] leading-[16px] text-muted',
  overline: 'font-semibold text-[12px] leading-[16px] uppercase tracking-[1.2px] text-muted',
};

export interface AppTextProps extends TextProps {
  variant?: Variant;
  className?: string;
}

export function AppText({ variant = 'body', className, ...props }: AppTextProps) {
  return <RNText maxFontSizeMultiplier={1.6} {...props} className={cn(VARIANTS[variant], className)} />;
}
