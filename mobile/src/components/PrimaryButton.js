import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function PrimaryButton({ title, onPress, loading = false, icon = 'arrow-forward', disabled = false }) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [styles.button, pressed && !isDisabled && styles.pressed, isDisabled && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <View style={styles.content}>
          <Text style={styles.text}>{title}</Text>
          {icon ? <Ionicons name={icon} size={19} color="#fff" /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: 15,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    paddingHorizontal: 22,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  text: { color: '#fff', fontSize: 16.5, fontWeight: '800' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.995 }] },
  disabled: { opacity: 0.55 }
});
