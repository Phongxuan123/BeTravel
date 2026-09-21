import React from 'react';

import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';

export default function HomePlaceholderScreen({
  session,
  onLogout,
}) {
  const user = session?.user;

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View style={styles.card}>
        <Text style={styles.title}>
          Đăng nhập thành công
        </Text>

        <Text style={styles.welcome}>
          Xin chào {user?.fullName || 'bạn'}!
        </Text>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>
              Họ và tên
            </Text>

            <Text style={styles.value}>
              {user?.fullName || 'Chưa có'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>
              Email
            </Text>

            <Text style={styles.value}>
              {user?.email || 'Chưa có'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>
              Số điện thoại
            </Text>

            <Text style={styles.value}>
              {user?.phone || 'Chưa có'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>
              Vai trò
            </Text>

            <Text style={styles.value}>
              {user?.role || 'user'}
            </Text>
          </View>
        </View>

        <Text style={styles.description}>
          Frontend React Native đã kết nối thành công
          với backend Node.js và MongoDB Atlas.
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={onLogout}
        >
          <Text style={styles.buttonText}>
            Đăng xuất
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },

  title: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
  },

  welcome: {
    marginTop: 8,
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },

  infoBox: {
    marginTop: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },

  value: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  description: {
    marginTop: 22,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },

  button: {
    marginTop: 24,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonPressed: {
    opacity: 0.85,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});