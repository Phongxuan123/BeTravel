import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';
import Logo from '../components/Logo';
import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import { login } from '../services/api';

export default function LoginScreen({
  onRegister,
  onSuccess,
  initialIdentifier = '',
}) {
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneMode, setPhoneMode] = useState(false);

  const identifierLabel = useMemo(
    () => (phoneMode ? 'Số điện thoại' : 'Email'),
    [phoneMode]
  );

  const submit = async () => {
    setError('');

    if (!identifier.trim() || !password) {
      setError('Vui lòng nhập đầy đủ thông tin đăng nhập.');
      return;
    }

    try {
      setLoading(true);

      const result = await login({
        identifier: identifier.trim(),
        password,
        rememberMe,
      });

      onSuccess(result?.data || {});
    } catch (e) {
      setError(e?.message || 'Không thể đăng nhập. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <View style={styles.decor} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Logo />

          <View style={styles.headingBlock}>
            <Text style={styles.title}>Chào mừng trở lại</Text>
            <Text style={styles.subtitle}>
              Đăng nhập để tiếp tục chuyến đi của bạn.
            </Text>
          </View>

          <View style={styles.form}>
            <FormInput
              label={identifierLabel}
              value={identifier}
              onChangeText={setIdentifier}
              placeholder={phoneMode ? '0912345678' : 'minh.tran@email.com'}
              icon={phoneMode ? 'call-outline' : 'mail-outline'}
              keyboardType={phoneMode ? 'phone-pad' : 'email-address'}
              autoCapitalize="none"
            />

            <FormInput
              label="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••••"
              icon="lock-closed-outline"
              secureTextEntry
              helpText="Tối thiểu 8 ký tự"
            />

            <View style={styles.rowBetween}>
              <Pressable
                style={styles.remember}
                onPress={() => setRememberMe((value) => !value)}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxChecked,
                  ]}
                >
                  {rememberMe ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : null}
                </View>

                <Text style={styles.rememberText}>Ghi nhớ đăng nhập</Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  Alert.alert(
                    'Quên mật khẩu',
                    'Backend đã có API quên mật khẩu. Màn hình này có thể triển khai ở bước tiếp theo.'
                  )
                }
              >
                <Text style={styles.link}>Quên mật khẩu?</Text>
              </Pressable>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton
              title="Đăng nhập"
              onPress={submit}
              loading={loading}
              icon={null}
            />

            <View style={styles.separator}>
              <View style={styles.sepLine} />
              <Text style={styles.or}>hoặc</Text>
              <View style={styles.sepLine} />
            </View>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                setPhoneMode((value) => !value);
                setIdentifier('');
                setError('');
              }}
            >
              <Ionicons
                name={phoneMode ? 'mail-outline' : 'call-outline'}
                size={18}
                color={colors.primaryDark}
              />

              <Text style={styles.secondaryText}>
                {phoneMode
                  ? 'Đăng nhập bằng email'
                  : 'Đăng nhập bằng số điện thoại'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.bottomLink}>
            <Text style={styles.bottomText}>Chưa có tài khoản? </Text>
            <Pressable onPress={onRegister}>
              <Text style={styles.link}>Đăng ký</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  decor: {
    position: 'absolute',
    right: -55,
    top: -75,
    width: 250,
    height: 180,
    borderRadius: 130,
    backgroundColor: '#EEF4FD',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 26,
  },
  headingBlock: {
    marginTop: 26,
    marginBottom: 20,
  },
  title: {
    fontSize: 29,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 13.5,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  form: {
    gap: 14,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  remember: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  checkbox: {
    width: 21,
    height: 21,
    borderWidth: 1.2,
    borderColor: colors.muted,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rememberText: {
    color: colors.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
  },
  link: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  error: {
    color: colors.emergency,
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 17,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  sepLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  or: {
    color: colors.textSecondary,
    fontSize: 12.5,
  },
  secondaryButton: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  bottomLink: {
    marginTop: 'auto',
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomText: {
    color: colors.textSecondary,
    fontSize: 13.5,
  },
});
