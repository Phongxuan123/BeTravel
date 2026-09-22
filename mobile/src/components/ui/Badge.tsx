import { View, Text } from 'react-native';

export type BadgeTone = 'success' | 'info' | 'neutral' | 'danger' | 'warning';

const containerClass: Record<BadgeTone, string> = {
  success: 'bg-success-soft',
  info: 'bg-primary-soft',
  neutral: 'bg-[#F0F4F9]',
  danger: 'bg-danger-soft',
  warning: 'bg-amber-soft',
};

const textClass: Record<BadgeTone, string> = {
  success: 'text-success',
  info: 'text-primary-strong',
  neutral: 'text-muted',
  danger: 'text-danger',
  warning: 'text-warning',
};

const dotClass: Record<BadgeTone, string> = {
  success: 'bg-success',
  info: 'bg-primary-strong',
  neutral: 'bg-muted',
  danger: 'bg-danger',
  warning: 'bg-warning',
};

export function Badge({ label, tone, dot = false }: { label: string; tone: BadgeTone; dot?: boolean }) {
  return (
    <View className={`flex-row items-center self-start rounded-full px-[10px] py-[4px] ${containerClass[tone]}`}>
      {dot && <View className={`mr-1.5 h-1.5 w-1.5 rounded-full ${dotClass[tone]}`} />}
      <Text className={`text-xs font-body-bold ${textClass[tone]}`} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
