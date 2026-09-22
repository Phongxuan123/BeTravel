import { View, type ViewProps } from 'react-native';

type Variant = 'default' | 'highlight-red' | 'selected';

const variantClass: Record<Variant, string> = {
  default: 'bg-surface border border-line',
  'highlight-red': 'bg-danger-tint border border-danger-line',
  selected: 'bg-[#F4F8FF] border-[1.5px] border-primary',
};

export function Card({ variant = 'default', className, ...rest }: ViewProps & { variant?: Variant }) {
  return <View className={`rounded-lg p-4 ${variantClass[variant]} ${className ?? ''}`} {...rest} />;
}
