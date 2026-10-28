import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';
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
  danger: 'bg-danger-strong rounded-lg',
  white: 'bg-surface rounded-lg',
  'ghost-link': 'bg-transparent',
};

const textClass: Record<Variant, string> = {
  primary: 'text-white font-body-bold text-base',
  secondary: 'text-ink font-body-semibold text-[15px]',
  soft: 'text-primary-strong font-body-bold text-base',
  danger: 'text-white font-body-bold text-base',
  white: 'text-primary-strong font-body-bold text-base',
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
  // Style tĩnh cho trường hợp mặc định để NativeWind giữ kích thước trên native/web.
  // Không cho flex co nút thành một dòng chữ khi form dài; chữ lớn được phép xuống dòng.
  const baseStyle = { minHeight: heights[variant], flexShrink: 0, paddingVertical: 12 };
  const buttonStyle = [baseStyle, variant === 'primary' ? shadows.ctaPrimary : null];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={isDisabled}
      className={`flex-row items-center justify-center gap-2 px-5 ${containerClass[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${isDisabled ? 'opacity-50' : ''}`}
      style={typeof style === 'function' ? (state) => [...buttonStyle, style(state)] : [...buttonStyle, style]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'white' ? colors.primary : '#fff'} />
      ) : (
        <>
          {iconLeft}
          <Text numberOfLines={1} className={`text-center ${textClass[variant]}`} style={{ flexShrink: 1 }}>{label}</Text>
          {iconRight}
        </>
      )}
    </Pressable>
  );
}

