import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export function GlobeIllustration() {
  return (
    <View style={styles.stage}>
      <View style={[styles.orbit, { transform: [{ rotate: '-8deg' }] }]} />
      <View style={styles.globe}>
        <View style={styles.globeVertical} />
        <View style={styles.globeHorizontal} />
      </View>
      <View style={[styles.dot, { left: 58, top: 65, backgroundColor: '#DF3B3B' }]} />
      <View style={[styles.dot, { left: 42, top: 138, backgroundColor: '#35A476' }]} />
      <View style={styles.shield}>
        <Ionicons name="checkmark" size={18} color="#fff" />
      </View>
      <View style={styles.arrow}><Ionicons name="paper-plane" size={21} color={colors.primary} /></View>
    </View>
  );
}

export function DocumentIllustration() {
  return (
    <View style={styles.stage}>
      <View style={styles.docCard}>
        <View style={styles.docTitle} />
        <View style={styles.docLineLong} />
        <View style={styles.docLine} />
        <View style={styles.checkRow}><Ionicons name="checkmark-circle" size={18} color={colors.success} /><View style={styles.checkLine} /></View>
        <View style={styles.checkRow}><Ionicons name="checkmark-circle" size={18} color={colors.success} /><View style={[styles.checkLine, { width: 62 }]} /></View>
      </View>
      <View style={styles.countryPill}><Text style={styles.countryDot}>●</Text><Text style={styles.countryText}>JP</Text></View>
    </View>
  );
}

export function ChatIllustration() {
  return (
    <View style={styles.stage}>
      <View style={styles.chatWhite}><View style={styles.chatLine} /><View style={[styles.chatLine, { width: 78 }]} /></View>
      <View style={styles.chatBlue}><View style={styles.chatBlueLine} /></View>
      <View style={styles.dashedBox}><Ionicons name="add" size={20} color={colors.primary} /></View>
      <View style={[styles.dot, { left: 46, top: 108, backgroundColor: '#2AA47D' }]} />
      <Ionicons name="add" size={26} color={colors.primary} style={{ position: 'absolute', right: 56, top: 40 }} />
      <Ionicons name="add" size={16} color="#7EA8E9" style={{ position: 'absolute', right: 35, top: 58 }} />
    </View>
  );
}

export function SosIllustration() {
  return (
    <View style={styles.stage}>
      <View style={styles.sosHalo3} />
      <View style={styles.sosHalo2} />
      <View style={styles.sosCircle}><Text style={styles.sosText}>SOS</Text></View>
      <View style={[styles.floatingPill, { left: 18, top: 70 }]}><Ionicons name="call" size={18} color={colors.primary} /></View>
      <View style={[styles.floatingPill, { right: 18, top: 44 }]}><Ionicons name="medical" size={20} color={colors.emergency} /></View>
      <View style={[styles.floatingPill, { right: 28, bottom: 34 }]}><Ionicons name="location" size={18} color={colors.success} /></View>
      <View style={[styles.dot, { left: 48, bottom: 41, backgroundColor: '#D98B1D' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: 290, height: 190, alignSelf: 'center', position: 'relative', alignItems: 'center', justifyContent: 'center' },
  orbit: { position: 'absolute', width: 235, height: 106, borderRadius: 90, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#A8C4EF' },
  globe: { width: 130, height: 90, borderRadius: 65, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  globeVertical: { position: 'absolute', width: 52, height: 86, borderRadius: 26, borderWidth: 1.5, borderColor: '#74A1E3' },
  globeHorizontal: { width: 126, height: 1.5, backgroundColor: '#74A1E3' },
  dot: { position: 'absolute', width: 12, height: 12, borderRadius: 99 },
  shield: { position: 'absolute', right: 53, bottom: 30, width: 45, height: 38, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  arrow: { position: 'absolute', right: 36, top: 54 },
  docCard: { width: 135, height: 115, backgroundColor: '#fff', borderWidth: 2, borderColor: colors.primary, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  docTitle: { width: 72, height: 8, borderRadius: 99, backgroundColor: colors.primary },
  docLineLong: { width: 94, height: 6, borderRadius: 99, backgroundColor: '#BDD3F4', marginTop: 16 },
  docLine: { width: 68, height: 6, borderRadius: 99, backgroundColor: '#D7E4F7', marginTop: 9 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  checkLine: { width: 72, height: 5, borderRadius: 99, backgroundColor: '#D7E4F7' },
  countryPill: { position: 'absolute', right: 35, bottom: 35, paddingHorizontal: 14, height: 30, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 7 },
  countryDot: { color: '#D62828', fontSize: 13 },
  countryText: { color: colors.textSecondary, fontWeight: '700' },
  chatWhite: { position: 'absolute', top: 45, width: 170, height: 48, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, padding: 13 },
  chatLine: { width: 108, height: 6, borderRadius: 99, backgroundColor: '#D7E4F7', marginBottom: 6 },
  chatBlue: { position: 'absolute', top: 92, right: 35, width: 145, height: 42, borderRadius: 14, backgroundColor: colors.primary, justifyContent: 'center', paddingHorizontal: 18 },
  chatBlueLine: { width: 87, height: 5, borderRadius: 99, backgroundColor: '#fff' },
  dashedBox: { position: 'absolute', bottom: 20, width: 126, height: 34, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sosHalo3: { position: 'absolute', width: 200, height: 120, borderRadius: 100, backgroundColor: '#FCE8E8' },
  sosHalo2: { position: 'absolute', width: 145, height: 92, borderRadius: 80, backgroundColor: '#F7D2D2' },
  sosCircle: { width: 104, height: 104, borderRadius: 60, backgroundColor: colors.emergency, alignItems: 'center', justifyContent: 'center' },
  sosText: { color: '#fff', fontSize: 27, fontWeight: '900', letterSpacing: 1 },
  floatingPill: { position: 'absolute', width: 74, height: 35, borderRadius: 11, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }
});
