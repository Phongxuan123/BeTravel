import { ActivityIndicator, Pressable, Text, View, type PressableProps } from 'react-native';
import type { ReactNode } from 'react';
import { colors, shadows } from '@/lib/theme';

type Variant = 'primary' | 'secondary' | 'soft' | 'danger' | 'white' | 'ghost-link';

const heights: Record<Variant, number> = {
  primary: 54,
  secondary: 50,
  soft: 50,
  danger: 54,
  white: 50,
  'ghost-link': 44,
};

const containerClass: Record<Variant, string> = {
  primary: 'bg-primary rounded-lg',
  secondary: 'bg-surface border border-line rounded-lg',
  soft: 'bg-primary-soft rounded-lg',
  danger: 'bg-danger rounded-lg',
  white: 'bg-surface rounded-lg',
  'ghost-link': 'bg-transparent',
};

const textClass: Record<Variant, string> = {
  primary: 'text-white font-body-bold text-base',
  secondary: 'text-ink font-body-semibold text-[15px]',
  soft: 'text-primary-strong font-body-bold text-base',
  danger: 'text-white font-body-bold text-base',
  white: 'text-primary font-body-bold text-base',
  'ghost-link': 'text-muted font-body-semibold text-[15px]',
};

type Props = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: Variant;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  label,
  variant = 'primary',
  iconLeft,
  iconRight,
  loading,
  fullWidth = true,
  disabled,
  style,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={isDisabled}
      className={`flex-row items-center justify-center gap-2 px-5 ${containerClass[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${isDisabled ? 'opacity-50' : ''}`}
      style={(state) => [
        { height: heights[variant] },
        variant === 'primary' ? shadows.ctaPrimary : null,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'white' ? colors.primary : '#fff'} />
      ) : (
        <>
          {iconLeft}
          <Text className={textClass[variant]}>{label}</Text>
          {iconRight}
        </>
      )}
    </Pressable>
  );
}

export function ButtonRow({ children }: { children: ReactNode }) {
  return <View className="flex-row gap-3">{children}</View>;
}
