import { View, type ViewProps } from 'react-native';

export function Skeleton({ className, style, ...rest }: ViewProps) {
  return <View className={`bg-line ${className ?? ''}`} style={[{ opacity: 0.7 }, style]} {...rest} />;
}
