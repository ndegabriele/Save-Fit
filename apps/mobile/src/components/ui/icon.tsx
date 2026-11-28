import { LINE_ICONS, type AppIcon } from '@/components/ui/icons';
import { useColor } from '@/lib/theme';

export interface IconProps {
  icon: AppIcon;
  size?: number;
  /** Design token ("foreground", "muted", "accent-foreground") or a literal "#hex". */
  color?: string;
  /** Kept for call sites written for stroke icons; filled icons ignore it. */
  strokeWidth?: number;
  /** Defaults to "fill" (solid, chunky); line glyphs like X, arrows and + default to "bold". */
  weight?: 'fill' | 'bold';
}

/** Filled Phosphor icon colored from the HeroUI token set. */
export function Icon({ icon: Glyph, size = 24, color = 'foreground', weight }: IconProps) {
  const token = useColor(color.startsWith('#') ? 'foreground' : color);
  return <Glyph size={size} color={color.startsWith('#') ? color : token} weight={weight ?? (LINE_ICONS.has(Glyph) ? 'bold' : 'fill')} />;
}
