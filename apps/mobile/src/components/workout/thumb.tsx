import { Image } from 'expo-image';
import { cn } from 'heroui-native';
import { Dumbbell, Flame, Heart, Layers, Sparkles, Zap, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { Icon } from '@/components/ui/icon';
import { mediaUrl } from '@/lib/api';
import type { Category } from '@/lib/types';

const CAT_ICON: Record<Category, LucideIcon> = {
  strength: Dumbbell,
  hiit: Flame,
  cardio: Heart,
  mobility: Sparkles,
  core: Zap,
  mixed: Layers,
};

/** Rounded-square thumbnail; falls back to a category glyph tile when there is no image. */
export function Thumb({ uri, category, size = 96, className }: { uri?: string | null; category: Category; size?: number; className?: string }) {
  const src = mediaUrl(uri);
  return (
    <View className={cn('overflow-hidden rounded-[22px] bg-white/60 dark:bg-white/10', className)} style={{ width: size, height: size }}>
      {src ? (
        <Image source={{ uri: src }} style={{ width: size, height: size }} contentFit="cover" transition={180} />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Icon icon={CAT_ICON[category]} size={Math.round(size * 0.36)} color={`cat-${category}-ink`} />
        </View>
      )}
    </View>
  );
}
