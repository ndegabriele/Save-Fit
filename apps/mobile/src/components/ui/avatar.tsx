import { grid } from '@/lib/grid';
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

/**
 * Compact coach badge for the top-right of a workout tile: avatar(s) + first name.
 * `onMedia` switches to a frosted dark style for tiles with a photo/video background.
 */
export function CreatorChip({ creators, onMedia, className }: { creators: Creator[]; onMedia?: boolean; className?: string }) {
  if (!creators.length) return null;
  const first = creators[0]!;
  const name = first.name || first.handle?.replace(/^@/, '') || 'Coach';
  const extra = creators.length - 1;
  return (
    <View
      className={cn('max-w-[176px] flex-row items-center gap-2 rounded-full py-1 pl-1 pr-3', onMedia ? 'bg-black/35' : 'bg-white/70 dark:bg-white/10', className)}
      accessible
      accessibilityLabel={`By ${creators.map((c) => c.name || c.handle).join(', ')}`}
    >
      <View className="flex-row">
        {creators.slice(0, 3).map((c, i) => (
          <CreatorAvatar key={(c.handle || c.name) + i} creator={c} size={32} className={cn(onMedia && 'border-black/20', i > 0 && '-ml-3')} />
        ))}
      </View>
      <AppText variant="label" numberOfLines={1} className={cn('shrink', onMedia ? 'text-white' : 'text-foreground')}>
        {name}
        {extra > 0 ? ` +${extra}` : ''}
      </AppText>
    </View>
  );
}

/**
 * Coach column at the top-right of a workout tile (same 96px footprint as the old icon tile):
 * a large rounded-square photo, or big initials, with the name underneath.
 */
export function CoachTile({ creators, onMedia, inkClass, size = 96 }: { creators: Creator[]; onMedia?: boolean; inkClass?: string; size?: number }) {
  const first = creators[0];
  if (!first) return null;
  const src = mediaUrl(first.avatarUrl);
  const i = hash((first.handle || first.name || '').toLowerCase()) % FILLS.length;
  const name = first.name || first.handle?.replace(/^@/, '') || 'Coach';
  const extra = creators.length - 1;
  return (
    <View className="items-center gap-2" style={{ width: size }} accessible accessibilityLabel={`By ${creators.map((c) => c.name || c.handle).join(', ')}`}>
      <View
        className={cn('items-center justify-center overflow-hidden rounded-[24px]', onMedia ? 'border-2 border-white/30' : 'bg-white/60 dark:bg-white/10', !src && onMedia && 'bg-black/35')}
        style={{ width: size, height: size }}
      >
        {src ? (
          <Image source={{ uri: src }} style={{ width: size, height: size }} contentFit="cover" transition={160} />
        ) : (
          <AppText variant="number" className={onMedia ? 'text-white' : (inkClass ?? INKS[i])} style={{ fontSize: grid(size * 0.36), lineHeight: grid(size * 0.44) }}>
            {initials(first)}
          </AppText>
        )}
        {extra > 0 ? (
          <View className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-1">
            <AppText variant="label" className="text-[12px] text-white">
              +{extra}
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText variant="label" numberOfLines={1} className={cn('text-center text-[12px]', onMedia ? 'text-white' : 'text-foreground/70')}>
        {name}
      </AppText>
    </View>
  );
}
