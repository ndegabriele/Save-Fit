import type { ReactNode } from 'react';
import { View } from 'react-native';
import { AppText } from './text';

export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between px-5 pb-3 pt-6">
      <AppText variant="title">{title}</AppText>
      {right}
    </View>
  );
}
