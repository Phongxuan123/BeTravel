import { Pressable, type PressableProps } from 'react-native';
import type { ReactNode } from 'react';

type Variant = 'soft' | 'outline' | 'warning' | 'primary';

const containerClass: Record<Variant, string> = {
  soft: 'bg-primary-soft',
  outline: 'bg-surface border border-line',
  warning: 'bg-warning-soft',
  primary: 'bg-primary',
};

type Props = Omit<PressableProps, 'children'> & {
  icon: ReactNode;
  variant?: Variant;
  accessibilityLabel: string;
  size?: number;
};

export function IconButton({ icon, variant = 'outline', size = 44, className, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`items-center justify-center rounded-md ${containerClass[variant]} ${className ?? ''}`}
      style={{ width: size, height: size }}
      {...rest}
    >
      {icon}
    </Pressable>
  );
}
