import React from 'react';

import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import Logo from '../components/Logo';
import PrimaryButton from '../components/PrimaryButton';

import {
  GlobeIllustration,
  DocumentIllustration,
  ChatIllustration,
  SosIllustration,
} from '../components/Illustrations';

const PAGES = [
  {
    title: 'Bảo vệ bạn khi du lịch\nnước ngoài',
    description:
      'Luật pháp, khẩn cấp và hỗ trợ — gói gọn\ntrong một ứng dụng tiếng Việt.',
    illustration: GlobeIllustration,
  },
  {
    badge: 'Cẩm nang pháp luật',
    title: 'Biết luật trước khi đi',
    description:
      'Quy định nhập cảnh, giao thông, nơi công\ncộng… tra cứu theo từng quốc gia.',
    illustration: DocumentIllustration,
  },
  {
    badge: 'AI Legal Assistant',
    title: 'Hỏi luật bằng tiếng Việt',
    description:
      'Trả lời kèm nguồn pháp lý. Không đủ dữ liệu,\nAI sẽ nói rõ thay vì đoán.',
    illustration: ChatIllustration,
  },
  {
    badge: 'SOS & Khẩn cấp',
    title: 'Hỗ trợ khi có sự cố',
    description:
      'Số khẩn cấp, đại sứ quán, dịch câu gấp và\nhướng dẫn xử lý — chỉ một chạm.',
    illustration: SosIllustration,
    emergency: true,
  },
];

export default function OnboardingScreen({
  index,
  onNext,
  onSkip,
  onRegister,
  onLogin,
}) {
  const page = PAGES[index];
  const Illustration = page.illustration;
  const isLast = index === PAGES.length - 1;

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background}
      />

      <View
        style={[
          styles.decor,
          page.emergency && styles.decorEmergency,
        ]}
      />

      <View style={styles.container}>
        <View style={styles.topRow}>
          <Logo compact />

          <Pressable
            onPress={onSkip}
            hitSlop={10}
          >
            <Text style={styles.skip}>Bỏ qua</Text>
          </Pressable>
        </View>

        <View style={styles.illustrationWrap}>
          <Illustration />
        </View>

        <View style={styles.copyArea}>
          {page.badge ? (
            <View
              style={[
                styles.badge,
                page.emergency && styles.badgeEmergency,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  page.emergency && styles.badgeEmergencyText,
                ]}
              >
                {page.badge}
              </Text>
            </View>
          ) : null}

          <Text style={styles.title}>
            {page.title}
          </Text>

          <Text style={styles.description}>
            {page.description}
          </Text>
        </View>

        <View style={styles.bottom}>
          <View style={styles.dots}>
            {PAGES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === index && styles.dotActive,
                ]}
              />
            ))}
          </View>

          {isLast ? (
            <>
              <PrimaryButton
                title="Bắt đầu ngay"
                onPress={onRegister}
                icon={null}
              />

              <Pressable
                style={styles.loginLink}
                onPress={onLogin}
              >
                <Text style={styles.loginLinkText}>
                  Tôi đã có tài khoản
                </Text>
              </Pressable>
            </>
          ) : (
            <PrimaryButton
              title="Tiếp tục"
              onPress={onNext}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  decor: {
    position: 'absolute',
    width: 260,
    height: 180,
    right: -55,
    top: -70,
    borderRadius: 150,
    backgroundColor: '#E6EEF9',
  },

  decorEmergency: {
    backgroundColor: '#FBE7E7',
  },

  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  skip: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },

  illustrationWrap: {
    flex: 1,
    minHeight: 250,
    justifyContent: 'center',
    paddingTop: 10,
  },

  copyArea: {
    minHeight: 160,
    justifyContent: 'flex-end',
  },

  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 9,
  },

  badgeEmergency: {
    backgroundColor: colors.dangerLight,
  },

  badgeText: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 11.5,
  },

  badgeEmergencyText: {
    color: colors.emergency,
  },

  title: {
    color: colors.text,
    fontSize: 29,
    lineHeight: 31,
    fontWeight: '900',
    letterSpacing: -0.3,
  },

  description: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },

  bottom: {
    gap: 12,
    marginTop: 20,
  },

  dots: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    height: 10,
  },

  dot: {
    width: 8,
    height: 4,
    borderRadius: 99,
    backgroundColor: '#CBD8EA',
  },

  dotActive: {
    width: 25,
    backgroundColor: colors.primary,
  },

  loginLink: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loginLinkText: {
    color: colors.textSecondary,
    fontSize: 13.5,
    fontWeight: '700',
  },
});