import { View, Text } from 'react-native';

export type StrengthLevel = 'weak' | 'medium' | 'good' | 'strong';

const levelMeta: Record<StrengthLevel, { bars: number; label: string; color: string }> = {
  weak: { bars: 1, label: 'Yếu', color: '#D62828' },
  medium: { bars: 2, label: 'Trung bình', color: '#C2650A' },
  good: { bars: 2, label: 'Khá mạnh', color: '#0F8A5F' },
  strong: { bars: 3, label: 'Mạnh', color: '#0F8A5F' },
};

export function scorePasswordStrength(password: string): StrengthLevel {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;

  if (score <= 1) return 'weak';
  if (score === 2) return 'medium';
  if (score === 3) return 'good';
  return 'strong';
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const level = scorePasswordStrength(password);
  const { bars, label, color } = levelMeta[level];
  return (
    <View className="mt-2 flex-row items-center justify-between">
      <View className="flex-row" style={{ gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            className="h-1 w-10 rounded-full"
            style={{ backgroundColor: i < bars ? color : '#E9F0FA' }}
          />
        ))}
      </View>
      <Text className="text-xs font-body-bold" style={{ color }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
