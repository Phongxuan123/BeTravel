import { View, Text, TextInput, type TextInputProps } from 'react-native';
import type { ReactNode } from 'react';
import { colors } from '@/lib/theme';

type Props = TextInputProps & {
  label?: string;
  iconLeft?: ReactNode;
  slotRight?: ReactNode;
  helperText?: string;
  error?: string;
};

export function TextField({ label, iconLeft, slotRight, helperText, error, style, ...rest }: Props) {
  return (
    <View>
      {label && <Text className="mb-1.5 text-sm font-body-semibold text-[#3B4A63]">{label}</Text>}
      <View
        className={`h-14 flex-row items-center rounded-md border bg-[#F9FBFD] px-4 ${
          error ? 'border-danger' : 'border-line'
        }`}
      >
        {iconLeft && <View className="mr-2.5">{iconLeft}</View>}
        <TextInput
          className="flex-1 text-base text-ink"
          placeholderTextColor={colors.subtle}
          style={style}
          {...rest}
        />
        {slotRight && <View className="ml-2.5">{slotRight}</View>}
      </View>
      {(helperText || error) && (
        <Text className={`mt-1.5 text-xs ${error ? 'text-danger' : 'text-subtle'}`}>{error ?? helperText}</Text>
      )}
    </View>
  );
}
