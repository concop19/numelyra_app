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
import type { AstroFortuneSlip } from '../../services/astro/astroFortuneService';
import type { DailyInsight } from './dailyInsight';
import { useLocalization } from '../../i18n/LocalizationContext';

const DAILY_HERO = require('../../../assets/giao_dien/daily-insight/flame-daily-hero.png');
const DAILY_BACKGROUND = require('../../../assets/giao_dien/daily-insight/flame-daily-background.png');
const FAVORABLE_DECORATION = require('../../../assets/giao_dien/daily-insight/favorable-leaves.png');
const AVOID_DECORATION = require('../../../assets/giao_dien/daily-insight/avoid-mountains.png');

interface Props {
  visible: boolean;
  insight: DailyInsight;
  fortune?: AstroFortuneSlip | null;
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

export default function DailyInsightSheet({ visible, insight, fortune, onClose, onAsk }: Props) {
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
              <View style={[styles.mascotStage, compact && styles.mascotStageCompact]}>
                <View style={styles.mascotHalo} />
                <View style={[styles.mascotOrbit, styles.mascotOrbitWide]} />
                <View style={[styles.mascotOrbit, styles.mascotOrbitTall]} />
                <Image
                  accessibilityLabel={`${t('daily.cardTitle')} — Flame`}
                  contentFit="contain"
                  source={DAILY_HERO}
                  style={styles.mascotImage}
                />
              </View>

              <LinearGradient
                colors={['#FFE39A', '#BE68E8', '#6A2FB5', '#FFE39A']}
                end={{ x: 1, y: 1 }}
                start={{ x: 0, y: 0 }}
                style={styles.verseCardFrame}
              >
                <LinearGradient
                  colors={['rgba(42,16,94,0.98)', 'rgba(22,12,73,0.99)', 'rgba(28,15,78,0.99)']}
                  end={{ x: 0.8, y: 1 }}
                  start={{ x: 0.18, y: 0 }}
                  style={styles.verseCard}
                >
                  <View pointerEvents="none" style={[styles.cornerOrnament, styles.cornerOrnamentLeft]} />
                  <View pointerEvents="none" style={[styles.cornerOrnament, styles.cornerOrnamentRight]} />
                  <Ionicons
                    name="sparkles"
                    size={12}
                    color="#FFE39A"
                    style={[styles.verseSparkle, styles.verseSparkleLeft]}
                  />
                  <Ionicons
                    name="sparkles"
                    size={10}
                    color="#FFD56F"
                    style={[styles.verseSparkle, styles.verseSparkleRight]}
                  />

                  <View style={styles.verseHeadingRow}>
                    <LinearGradient colors={['rgba(255,215,113,0)', '#F7C96C']} style={styles.headingRule} />
                    <Text style={styles.sectionEyebrow}>{t('daily.verse')}</Text>
                    <LinearGradient colors={['#F7C96C', 'rgba(255,215,113,0)']} style={styles.headingRule} />
                  </View>
                  <Text style={[styles.verse, compact && styles.verseCompact]}>
                    {fortune?.verse || insight.personality}
                  </Text>
                  <View style={styles.verseFooter}>
                    <LinearGradient colors={['rgba(255,215,113,0)', '#E6B859']} style={styles.footerRule} />
                    <Ionicons name="sparkles" size={18} color="#FFE08A" />
                    <LinearGradient colors={['#E6B859', 'rgba(255,215,113,0)']} style={styles.footerRule} />
                  </View>
                </LinearGradient>
              </LinearGradient>

              {!!fortune?.mirror && (
                <LinearGradient
                  colors={['rgba(196,129,255,0.62)', 'rgba(100,57,174,0.50)', 'rgba(255,213,121,0.38)']}
                  end={{ x: 1, y: 1 }}
                  start={{ x: 0, y: 0 }}
                  style={styles.mirrorCardFrame}
                >
                  <LinearGradient
                    colors={['rgba(50,26,112,0.98)', 'rgba(28,18,78,0.98)']}
                    end={{ x: 0.9, y: 1 }}
                    start={{ x: 0.05, y: 0 }}
                    style={styles.mirrorCard}
                  >
                    <View pointerEvents="none" style={styles.mirrorGlow} />
                    <Ionicons
                      name="sparkles"
                      size={15}
                      color="rgba(255,220,135,0.72)"
                      style={[styles.mirrorDecoration, styles.mirrorDecorationTop]}
                    />
                    <Ionicons
                      name="sparkles"
                      size={12}
                      color="rgba(221,154,255,0.58)"
                      style={[styles.mirrorDecoration, styles.mirrorDecorationBottom]}
                    />
                    <View style={styles.mirrorIcon}>
                      <Ionicons name="sparkles" size={25} color="#FFE08A" />
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.mirrorEyebrow}>{t('daily.mirror')}</Text>
                      <Text style={styles.personality}>{fortune.mirror}</Text>
                    </View>
                  </LinearGradient>
                </LinearGradient>
              )}

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
                    {insight.recommended.map((item) => (
                      <Text key={item} style={styles.guidanceText}>• {item}</Text>
                    ))}
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
                    {insight.avoid.map((item) => (
                      <Text key={item} style={styles.guidanceText}>• {item}</Text>
                    ))}
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
  mascotStage: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginHorizontal: -2,
    marginBottom: -50,
    marginTop: -4,
    zIndex: 2,
  },
  mascotStageCompact: { height: 192, marginBottom: -46 },
  mascotHalo: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(103, 54, 211, 0.22)',
    shadowColor: '#E34BFF',
    shadowOpacity: 0.48,
    shadowRadius: 30,
    elevation: 4,
  },
  mascotOrbit: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(255, 184, 222, 0.28)' },
  mascotOrbitWide: { width: 245, height: 168, borderRadius: 122, transform: [{ rotate: '-18deg' }] },
  mascotOrbitTall: { width: 176, height: 205, borderRadius: 103, transform: [{ rotate: '28deg' }] },
  mascotImage: { width: '100%', height: '100%' },
  verseCardFrame: {
    padding: 1.25,
    borderRadius: 27,
    shadowColor: '#D087FF',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.26,
    shadowRadius: 13,
    elevation: 7,
    zIndex: 1,
  },
  verseCard: {
    position: 'relative',
    minHeight: 260,
    alignItems: 'center',
    overflow: 'hidden',
    paddingHorizontal: 21,
    paddingTop: 54,
    paddingBottom: 17,
    borderRadius: 26,
  },
  cornerOrnament: {
    position: 'absolute',
    top: 17,
    width: 48,
    height: 48,
    borderTopWidth: 1.5,
    borderColor: 'rgba(255,221,137,0.75)',
  },
  cornerOrnamentLeft: { left: 13, borderLeftWidth: 1.5, borderTopLeftRadius: 28 },
  cornerOrnamentRight: { right: 13, borderRightWidth: 1.5, borderTopRightRadius: 28 },
  verseSparkle: { position: 'absolute' },
  verseSparkleLeft: { left: 18, top: 92 },
  verseSparkleRight: { right: 18, top: 123 },
  verseHeadingRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  headingRule: { flex: 1, maxWidth: 54, height: 1 },
  footerRule: { flex: 1, maxWidth: 78, height: 1 },
  verseFooter: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 12 },
  mirrorCardFrame: {
    padding: 1,
    borderRadius: 24,
    shadowColor: '#7544DD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 10,
    elevation: 4,
  },
  mirrorCard: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    minHeight: 126,
    overflow: 'hidden',
    paddingHorizontal: 15,
    paddingVertical: 16,
    paddingRight: 25,
    borderRadius: 23,
  },
  mirrorGlow: {
    position: 'absolute',
    right: -38,
    top: -44,
    width: 135,
    height: 135,
    borderRadius: 68,
    backgroundColor: 'rgba(123,68,204,0.20)',
  },
  mirrorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(132,82,207,0.40)',
    borderWidth: 1,
    borderColor: 'rgba(255,226,153,0.08)',
  },
  mirrorDecoration: { position: 'absolute' },
  mirrorDecorationTop: { right: 12, top: 15 },
  mirrorDecorationBottom: { left: 32, bottom: 7 },
  flex: { flex: 1 },
  sectionEyebrow: { color: '#FFD878', fontSize: 11, fontWeight: '900', letterSpacing: 1.8, textTransform: 'uppercase' },
  mirrorEyebrow: { color: '#FFD878', fontSize: 11, lineHeight: 15, fontWeight: '900', letterSpacing: 0.65, textTransform: 'uppercase' },
  verse: {
    color: '#FFF4D6',
    fontFamily: 'serif',
    fontSize: 18,
    lineHeight: 28,
    fontStyle: 'italic',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 13,
    textShadowColor: 'rgba(255,214,133,0.24)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  verseCompact: { fontSize: 16, lineHeight: 24 },
  personality: { color: '#F8F4FF', fontSize: 15, lineHeight: 23, fontWeight: '600', marginTop: 6 },
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
  guidanceText: { color: '#E1DBED', fontSize: 10.5, lineHeight: 17, marginBottom: 2 },
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
