import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Scale } from 'lucide-react-native';
import { Badge } from '@/components/ui/Badge';
import { colors } from '@/lib/theme';
import type { AuLawSummary } from '@/lib/api/auLaws';

export function LawRow({ law }: { law: AuLawSummary }) {
  return (
    <Pressable
      accessibilityRole="button"
      className="rounded-2xl border border-line bg-surface p-3.5"
      onPress={() => router.push(`/laws/${law.id}` as never)}
    >
      <View className="flex-row items-start" style={{ gap: 10 }}>
        <Scale size={18} color={colors.primary} />
        <View className="flex-1" style={{ gap: 6 }}>
          <Text className="text-sm font-body-bold text-ink" numberOfLines={3}>
            {law.nameVi ?? law.name}
          </Text>
          {law.nameVi ? (
            <Text className="text-xs text-muted" numberOfLines={2}>
              {law.name}
            </Text>
          ) : null}
          <Text className="text-xs text-muted">
            {law.id}
            {law.makingDate ? ` · ${law.makingDate}` : ''}
          </Text>
          <Badge label={law.isInForce ? 'Đang có hiệu lực' : (law.status ?? 'Hết hiệu lực')} tone={law.isInForce ? 'success' : 'neutral'} />
        </View>
      </View>
    </Pressable>
  );
}
