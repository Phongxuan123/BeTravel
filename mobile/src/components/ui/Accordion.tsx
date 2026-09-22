import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors } from '@/lib/theme';

export function Accordion({
  items,
  defaultOpenIndex = 0,
}: {
  items: { title: string; content: string[] }[];
  defaultOpenIndex?: number | null;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(defaultOpenIndex);
  return (
    <View className="overflow-hidden rounded-lg border border-line bg-surface">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <View key={item.title} className={i > 0 ? 'border-t border-line' : ''}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => setOpenIndex(open ? null : i)}
              className="flex-row items-center justify-between px-4 py-4"
            >
              <Text className="flex-1 text-[15px] font-body-bold text-ink">{item.title}</Text>
              {open ? <ChevronUp size={20} color={colors.primary} /> : <ChevronDown size={20} color={colors.primary} />}
            </Pressable>
            {open && (
              <View className="gap-2 px-4 pb-4">
                {item.content.map((line, li) => (
                  <View key={li} className="flex-row items-start gap-2">
                    <View className="mt-2 h-1.5 w-1.5 rounded-full bg-[#9DBBEE]" />
                    <Text className="flex-1 text-sm leading-5 text-ink">{line}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
