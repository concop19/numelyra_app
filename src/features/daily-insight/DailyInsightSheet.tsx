import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import ThreeDButton from '../../components/ThreeDButton';
import type { DailyInsight } from './dailyInsight';
import { useLocalization } from '../../i18n/LocalizationContext';

const DAILY_HERO = require('../../../assets/giao_dien/daily-insight/flame-daily-hero.png');
const DAILY_BACKGROUND = require('../../../assets/giao_dien/daily-insight/flame-daily-background.png');
const FAVORABLE_DECORATION = require('../../../assets/giao_dien/daily-insight/favorable-leaves.png');
const AVOID_DECORATION = require('../../../assets/giao_dien/daily-insight/avoid-mountains.png');

interface Props {
  visible: boolean;
  insight: DailyInsight;
  onClose(): void;
  onAsk(question: string): void;
}

function EvidenceRow({ title, value }: { title: string; value: string }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      activeOpacity={0.78}
      onPress={() => setOpen((current) => !current)}
      style={styles.evidence}
    >
      <View style={styles.row}>
        <View style={styles.evidenceHeading}>
          <View style={styles.evidenceIcon}>
            <Ionicons name="sparkles-outline" size={15} color="#FFD57A" />
          </View>
          <Text style={styles.evidenceTitle}>{title}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={17} color="#D9CAFF" />
      </View>
      {open && <Text style={styles.evidenceText}>{value}</Text>}
    </TouchableOpacity>
  );
}

export default function DailyInsightSheet({ visible, insight, onClose, onAsk }: Props) {
  const { t, formatDate, locale } = useLocalization();
  const { height, width } = useWindowDimensions();
  const date = new Date(`${insight.dateKey}T12:00:00`);
  const compact = height < 740 || width < 350;

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <SafeAreaView accessibilityViewIsModal edges={['top', 'right', 'bottom', 'left']} style={styles.overlay}>
        <TouchableOpacity accessibilityLabel={t('common.close')} onPress={onClose} style={styles.backdrop} />

        <View style={styles.sheetFrame}>
          <View style={styles.sheet}>
            <Image
              accessible={false}
              contentFit="cover"
              pointerEvents="none"
              source={DAILY_BACKGROUND}
              style={styles.sheetBackground}
            />
            <LinearGradient
              colors={['rgba(18, 7, 60, 0.18)', 'rgba(13, 7, 46, 0.42)', 'rgba(6, 5, 29, 0.64)']}
              end={{ x: 0.75, y: 1 }}
              pointerEvents="none"
              start={{ x: 0.12, y: 0 }}
              style={styles.sheetScrim}
            />
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>{t('daily.cardEyebrow')}</Text>
                <Text style={styles.title}>{t('daily.cardTitle')}</Text>
                <Text style={styles.date}>
                  {formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {insight.canChiDay}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                activeOpacity={0.8}
                hitSlop={8}
                onPress={onClose}
                style={styles.close}
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.hero, compact && styles.heroCompact]}>
                <View style={styles.heroHalo} />
                <View style={[styles.heroOrbit, styles.heroOrbitOuter]} />
                <View style={[styles.heroOrbit, styles.heroOrbitInner]} />
                <Image
                  accessibilityLabel={`${t('daily.cardTitle')} — Flame`}
                  contentFit="contain"
                  source={DAILY_HERO}
                  style={styles.heroImage}
                />
              </View>

              <View style={styles.personalityCard}>
                <View style={styles.sectionIcon}>
                  <Ionicons name="sparkles" size={20} color="#FFE39A" />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.sectionEyebrow}>{t('daily.personality')}</Text>
                  <Text style={styles.personality}>{insight.personality}</Text>
                </View>
              </View>

              <View style={styles.stats}>
                {[
                  ['time-outline', t('daily.luckyTime'), insight.luckyTime?.range ?? t('daily.noLuckyTime'), '#77C9FF'],
                  ['heart-outline', t('daily.joyDirection'), insight.directions.joy, '#FF70C4'],
                  ['cash-outline', t('daily.wealthDirection'), insight.directions.wealth, '#FFD169'],
                ].map(([icon, label, value, color]) => (
                  <LinearGradient
                    colors={[`${color}22`, 'rgba(255,255,255,0.045)']}
                    key={label}
                    style={styles.stat}
                  >
                    <Ionicons name={icon as React.ComponentProps<typeof Ionicons>['name']} size={19} color={color} />
                    <Text style={styles.statLabel}>{label}</Text>
                    <Text numberOfLines={2} style={styles.statValue}>{value}</Text>
                  </LinearGradient>
                ))}
              </View>

              <View style={styles.guidanceRow}>
                <LinearGradient colors={['rgba(20,128,111,0.30)', 'rgba(15,77,106,0.28)']} style={[styles.guidance, styles.good]}>
                  <Image
                    accessible={false}
                    contentFit="contain"
                    contentPosition="bottom left"
                    pointerEvents="none"
                    source={FAVORABLE_DECORATION}
                    style={[styles.guidanceDecoration, styles.goodDecoration]}
                  />
                  <View style={styles.guidanceCopy}>
                    <Text style={[styles.guidanceTitle, styles.goodTitle]}>✓ {t('daily.recommended')}</Text>
                    {insight.recommended.map((item) => <Text key={item} style={styles.guidanceText}>• {item}</Text>)}
                  </View>
                </LinearGradient>
                <LinearGradient colors={['rgba(136,31,112,0.31)', 'rgba(93,27,101,0.26)']} style={[styles.guidance, styles.avoid]}>
                  <Image
                    accessible={false}
                    contentFit="contain"
                    contentPosition="bottom right"
                    pointerEvents="none"
                    source={AVOID_DECORATION}
                    style={[styles.guidanceDecoration, styles.avoidDecoration]}
                  />
                  <View style={styles.guidanceCopy}>
                    <Text style={[styles.guidanceTitle, styles.avoidTitle]}>× {t('daily.avoid')}</Text>
                    {insight.avoid.map((item) => <Text key={item} style={styles.guidanceText}>• {item}</Text>)}
                  </View>
                </LinearGradient>
              </View>

              {!!insight.warning && locale === 'vi' && (
                <View style={styles.warningCard}>
                  <Ionicons name="information-circle-outline" size={16} color="#FFD39B" />
                  <Text style={styles.warning}>{insight.warning}</Text>
                </View>
              )}

              <EvidenceRow title={t('daily.astroBasis')} value={insight.astroEvidence} />
              <EvidenceRow title={t('daily.canchiBasis')} value={insight.canChiEvidence} />

              <ThreeDButton
                accessibilityLabel={t('daily.ask')}
                fullWidth
                label={t('daily.ask')}
                leadingIcon={<Ionicons name="chatbubble-ellipses" size={18} color="#3B260D" />}
                onPress={() => onAsk(insight.suggestedQuestions[0])}
                shape="pill"
                style={styles.askButton3d}
                variant="gold"
              />

              <Text style={styles.disclaimer}>{t('daily.disclaimer')}</Text>
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(4, 1, 22, 0.82)',
  },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  sheetFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 420,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(186, 111, 255, 0.72)',
    backgroundColor: '#130938',
    shadowColor: '#8F43FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.42,
    shadowRadius: 18,
    elevation: 16,
  },
  sheet: { flex: 1, borderRadius: 29, overflow: 'hidden', backgroundColor: '#0B0628' },
  sheetBackground: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  sheetScrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 6,
  },
  headerCopy: { flex: 1, paddingRight: 10 },
  eyebrow: { color: '#FFD878', fontSize: 10, fontWeight: '900', letterSpacing: 2.1 },
  title: { color: '#FFFFFF', fontFamily: 'serif', fontSize: 25, lineHeight: 31, fontWeight: '900', marginTop: 3 },
  date: { color: '#BFB0DE', fontSize: 11, lineHeight: 16, marginTop: 4, textTransform: 'capitalize' },
  close: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  content: { paddingHorizontal: 12, paddingBottom: 18, gap: 10 },
  hero: {
    height: 242,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginHorizontal: -2,
    marginTop: -2,
  },
  heroCompact: { height: 210 },
  heroHalo: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(92, 45, 196, 0.22)',
    shadowColor: '#E34BFF',
    shadowOpacity: 0.48,
    shadowRadius: 34,
    elevation: 4,
  },
  heroOrbit: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(255, 164, 218, 0.28)' },
  heroOrbitOuter: { width: 250, height: 184, borderRadius: 125, transform: [{ rotate: '-18deg' }] },
  heroOrbitInner: { width: 190, height: 214, borderRadius: 105, transform: [{ rotate: '28deg' }] },
  heroImage: { width: '100%', height: '100%' },
  personalityCard: {
    flexDirection: 'row',
    gap: 11,
    padding: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(111, 60, 207, 0.24)',
    borderWidth: 1,
    borderColor: 'rgba(255, 210, 129, 0.25)',
  },
  sectionIcon: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 220, 145, 0.10)',
  },
  flex: { flex: 1 },
  sectionEyebrow: { color: '#FFD878', fontSize: 10, fontWeight: '900', letterSpacing: 0.4, textTransform: 'uppercase' },
  personality: { color: '#FFFFFF', fontSize: 13, lineHeight: 20, fontWeight: '600', marginTop: 4 },
  stats: { flexDirection: 'row', gap: 7 },
  stat: {
    flex: 1,
    minWidth: 0,
    minHeight: 96,
    paddingHorizontal: 9,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
  },
  statLabel: { color: '#BFB4D7', fontSize: 9, lineHeight: 12, fontWeight: '700', marginTop: 7 },
  statValue: { color: '#FFFFFF', fontSize: 12, lineHeight: 16, fontWeight: '900', marginTop: 3 },
  guidanceRow: { flexDirection: 'row', gap: 8 },
  guidance: {
    position: 'relative',
    flex: 1,
    minWidth: 0,
    minHeight: 128,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  good: { borderColor: 'rgba(91,231,185,0.26)' },
  avoid: { borderColor: 'rgba(255,119,191,0.25)' },
  guidanceDecoration: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 72 },
  goodDecoration: { opacity: 0.76 },
  avoidDecoration: { opacity: 0.82 },
  guidanceCopy: { zIndex: 1 },
  guidanceTitle: { fontSize: 11, fontWeight: '900', marginBottom: 7 },
  goodTitle: { color: '#75F0BD' },
  avoidTitle: { color: '#FF79C5' },
  guidanceText: { color: '#E1DBED', fontSize: 10, lineHeight: 16 },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,190,93,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,204,126,0.16)',
  },
  warning: { flex: 1, color: '#FFD3A1', fontSize: 11, lineHeight: 17 },
  evidence: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  evidenceHeading: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  evidenceIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 214, 122, 0.08)',
  },
  evidenceTitle: { flex: 1, color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  evidenceText: { color: '#CFC8E0', fontSize: 11, lineHeight: 17, marginTop: 9, paddingLeft: 37 },
  askButton3d: { marginTop: 2 },
  disclaimer: { color: '#9288A9', fontSize: 9, lineHeight: 13, textAlign: 'center', marginTop: 1 },
});
