import { cn } from 'heroui-native';
import { View } from 'react-native';
import { Tappable } from './tappable';
import { AppText } from './text';

/** Wrapping single-choice pill group (HeroUI has Tabs for 2-3 options; this handles many). */
export function Choice<T extends string>({ label, value, options, format, onChange }: { label?: string; value: T; options: T[]; format: (v: T) => string; onChange: (v: T) => void }) {
  return (
    <View className="gap-2">
      {label ? <AppText variant="label">{label}</AppText> : null}
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => (
          <Tappable key={o} onPress={() => onChange(o)} feedback="select" accessibilityLabel={format(o)}>
            <View className={cn('h-10 justify-center rounded-full px-4', o === value ? 'bg-foreground' : 'bg-default')}>
              <AppText variant="label" className={cn('text-[12px] leading-[16px]', o === value ? 'text-background' : 'text-foreground')}>
                {format(o)}
              </AppText>
            </View>
          </Tappable>
        ))}
      </View>
    </View>
  );
}
