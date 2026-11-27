import { Image } from 'expo-image';
import { cn } from 'heroui-native';
import { View } from 'react-native';
import { AppText } from '@/components/ui/text';
import { mediaUrl } from '@/lib/api';
import type { Creator } from '@/lib/types';

// Pastel fills for initials, picked from the name so a coach keeps the same colour everywhere.
const FILLS = ['bg-cat-strength', 'bg-cat-hiit', 'bg-cat-cardio', 'bg-cat-mobility', 'bg-cat-core', 'bg-cat-mixed'];
const INKS = ['text-cat-strength-ink', 'text-cat-hiit-ink', 'text-cat-cardio-ink', 'text-cat-mobility-ink', 'text-cat-core-ink', 'text-cat-mixed-ink'];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(creator: Creator): string {
  const base = (creator.name || creator.handle || '?').replace(/^@/, '').trim();
  const parts = base.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? (parts[1]?.[0] ?? '') : '')).toUpperCase();
}

/** Round profile picture of a coach; falls back to coloured initials. */
export function CreatorAvatar({ creator, size = 32, className }: { creator: Creator; size?: number; className?: string }) {
  const src = mediaUrl(creator.avatarUrl);
  const i = hash((creator.handle || creator.name || '').toLowerCase()) % FILLS.length;
  return (
    <View
      className={cn('items-center justify-center overflow-hidden rounded-full border-2 border-background', !src && FILLS[i], className)}
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {src ? (
        <Image source={{ uri: src }} style={{ width: size, height: size }} contentFit="cover" transition={160} />
      ) : (
        <AppText className={cn('font-semibold', INKS[i])} style={{ fontSize: Math.round(size * 0.38) }}>
          {initials(creator)}
        </AppText>
      )}
    </View>
  );
}

/**
 * Avatar(s) + name(s). Merged workouts show up to three overlapping avatars.
 * `tone="onColor"` is for pastel cards (dimmed foreground).
 */
export function CreatorRow({ creators, size = 32, className }: { creators: Creator[]; size?: number; className?: string }) {
  if (!creators.length) return null;
  const shown = creators.slice(0, 3);
  const name = creators.length === 1 ? creators[0]!.name || creators[0]!.handle || 'Coach' : creators.map((c) => c.name || c.handle).join(', ');
  const handle = creators.length === 1 ? creators[0]!.handle : null;
  return (
    <View className={cn('flex-row items-center gap-3', className)} accessible accessibilityLabel={`By ${name}`}>
      <View className="flex-row">
        {shown.map((c, i) => (
          <CreatorAvatar key={(c.handle || c.name) + i} creator={c} size={size} className={i > 0 ? '-ml-3' : undefined} />
        ))}
      </View>
      <View className="flex-1">
        <AppText variant="label" numberOfLines={1}>
          {name}
        </AppText>
        {handle && handle !== name ? (
          <AppText variant="caption" numberOfLines={1} className="text-foreground/55 text-[12px] leading-[16px]">
            {handle.startsWith('@') ? handle : `@${handle}`}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}
