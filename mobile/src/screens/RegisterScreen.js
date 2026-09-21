import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';
import FormInput from '../components/FormInput';
import PrimaryButton from '../components/PrimaryButton';
import { register } from '../services/api';

function passwordScore(password) {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;

  return score;
}

function normalizePhoneInput(value) {
  return value.replace(/[^0-9+]/g, '');
}

function isValidVietnamPhone(value) {
  return /^(0|\+84)[0-9]{9}$/.test(value.trim());
}

export default function RegisterScreen({
  onBack,
  onLogin,
  onRegistered,
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const score = useMemo(() => passwordScore(password), [password]);

  const strength =
    score === 3
      ? 'Khá mạnh'
      : score === 2
        ? 'Trung bình'
        : score === 1
          ? 'Yếu'
          : '';

  const submit = async () => {
    setError('');

    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    if (normalizedName.length < 2) {
      setError('Vui lòng nhập họ và tên hợp lệ.');
      return;
    }

    if (!normalizedEmail) {
      setError('Vui lòng nhập email.');
      return;
    }

    if (!isValidVietnamPhone(normalizedPhone)) {
      setError('Số điện thoại không hợp lệ. Ví dụ: 0912345678 hoặc +84912345678.');
      return;
    }

    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError('Mật khẩu cần có ít nhất 1 chữ hoa.');
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError('Mật khẩu cần có ít nhất 1 chữ thường.');
      return;
    }

    if (!/\d/.test(password)) {
      setError('Mật khẩu cần có ít nhất 1 chữ số.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (!termsAccepted) {
      setError('Bạn phải đồng ý với Điều khoản và Chính sách bảo mật.');
      return;
    }

    try {
      setLoading(true);

      await register({
        fullName: normalizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        password,
        confirmPassword,
        termsAccepted,
      });

      onRegistered(normalizedEmail);
    } catch (e) {
      setError(e?.message || 'Không thể tạo tài khoản. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.back} onPress={onBack}>
            <Ionicons
              name="chevron-back"
              size={22}
              color={colors.text}
            />
          </Pressable>

          <Text style={styles.title}>Tạo tài khoản</Text>
          <Text style={styles.subtitle}>
            Chỉ mất một phút — sau đó bạn có thể tạo chuyến đi.
          </Text>

          <View style={styles.form}>
            <FormInput
              label="Họ và tên"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Trần Quang Minh"
              icon="person-outline"
              autoCapitalize="words"
            />

            <FormInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="minh.tran@email.com"
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <FormInput
              label="Số điện thoại"
              value={phone}
              onChangeText={(value) => setPhone(normalizePhoneInput(value))}
              placeholder="0912345678"
              icon="call-outline"
              keyboardType="phone-pad"
              autoCapitalize="none"
              helpText="Dùng để đăng nhập và liên hệ khi cần thiết"
            />

            <FormInput
              label="Mật khẩu"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••••"
              icon="lock-closed-outline"
              secureTextEntry
            />

            {password ? (
              <View style={styles.strengthRow}>
                <View style={styles.strengthTrack}>
                  {[0, 1, 2].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthSegment,
                        i < score && styles.strengthActive,
                      ]}
                    />
                  ))}
                </View>

                <Text
                  style={[
                    styles.strengthText,
                    score === 3 && { color: colors.success },
                  ]}
                >
                  {strength}
                </Text>
              </View>
            ) : null}

            <FormInput
              label="Xác nhận mật khẩu"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••••"
              icon="lock-closed-outline"
              secureTextEntry
              error={
                confirmPassword && confirmPassword !== password
                  ? 'Mật khẩu xác nhận không khớp'
                  : ''
              }
            />

            <Pressable
              style={styles.termsRow}
              onPress={() => setTermsAccepted((value) => !value)}
            >
              <View
                style={[
                  styles.checkbox,
                  termsAccepted && styles.checkboxChecked,
                ]}
              >
                {termsAccepted ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : null}
              </View>

              <Text style={styles.termsText}>
                Tôi đồng ý với{' '}
                <Text style={styles.link}>Điều khoản</Text>
                {' '}và{' '}
                <Text style={styles.link}>Chính sách bảo mật</Text>.
              </Text>
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton
              title="Tạo tài khoản"
              onPress={submit}
              loading={loading}
              icon={null}
            />
          </View>

          <View style={styles.bottomLink}>
            <Text style={styles.bottomText}>Đã có tài khoản? </Text>
            <Pressable onPress={onLogin}>
              <Text style={styles.link}>Đăng nhập</Text>
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
  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 30,
  },
  back: {
    width: 45,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 17,
  },
  title: {
    color: colors.text,
    fontSize: 29,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 3,
    marginBottom: 18,
    maxWidth: 330,
  },
  form: {
    gap: 13,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: -5,
  },
  strengthTrack: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  strengthSegment: {
    height: 3,
    flex: 1,
    borderRadius: 99,
    backgroundColor: '#E1E8F1',
  },
  strengthActive: {
    backgroundColor: colors.success,
  },
  strengthText: {
    width: 76,
    color: colors.textSecondary,
    textAlign: 'right',
    fontSize: 11.5,
    fontWeight: '700',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkbox: {
    width: 21,
    height: 21,
    borderWidth: 1.2,
    borderColor: colors.muted,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
  },
  link: {
    color: colors.primary,
    fontWeight: '800',
  },
  error: {
    color: colors.emergency,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '600',
  },
  bottomLink: {
    marginTop: 42,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  bottomText: {
    color: colors.textSecondary,
    fontSize: 13.5,
  },
});
