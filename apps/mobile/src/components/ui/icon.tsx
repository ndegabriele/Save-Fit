import type { LucideIcon } from 'lucide-react-native';
import { useColor } from '@/lib/theme';

export interface IconProps {
  icon: LucideIcon;
  size?: number;
  /** Design token ("foreground", "muted", "accent-foreground") or a literal "#hex". */
  color?: string;
  strokeWidth?: number;
}

/** Lucide icon colored from the HeroUI token set (2px stroke at 24 matches HeroUI's icons). */
export function Icon({ icon: Glyph, size = 22, color = 'foreground', strokeWidth = 2.2 }: IconProps) {
  const token = useColor(color.startsWith('#') ? 'foreground' : color);
  return <Glyph size={size} color={color.startsWith('#') ? color : token} strokeWidth={strokeWidth} />;
}
