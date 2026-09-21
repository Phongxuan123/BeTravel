import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function Logo({ compact = false }) {
  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, compact && styles.iconBoxCompact]}>
        <Ionicons name="shield-checkmark-outline" size={compact ? 18 : 20} color="#fff" />
      </View>
      <Text style={[styles.text, compact && styles.textCompact]}>Be.Travel</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: {
    width: 40,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconBoxCompact: { width: 34, height: 27 },
  text: { color: colors.text, fontSize: 19, fontWeight: '800', letterSpacing: 0.2 },
  textCompact: { fontSize: 17 }
});
