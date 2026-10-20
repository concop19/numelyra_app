import React, { useState } from 'react';
import {
  Modal, SafeAreaView, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import type { DailyInsight } from './dailyInsight';
import { useLocalization } from '../../i18n/LocalizationContext';

interface Props {
  visible: boolean;
  insight: DailyInsight;
  onClose(): void;
  onAsk(question: string): void;
  onOpenAstrology(): void;
  onOpenCalendar(): void;
}

function EvidenceRow({ title, value }: { title: string; value: string }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity activeOpacity={0.78} onPress={() => setOpen((current) => !current)} style={styles.evidence}>
      <View style={styles.row}>
        <Text style={styles.evidenceTitle}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={17} color="#CDBAFF" />
      </View>
      {open && <Text style={styles.evidenceText}>{value}</Text>}
    </TouchableOpacity>
  );
}

export default function DailyInsightSheet({
  visible, insight, onClose, onAsk, onOpenAstrology, onOpenCalendar,
}: Props) {
  const { t, formatDate, locale } = useLocalization();
  const date = new Date(`${insight.dateKey}T12:00:00`);
  const shareInsight = async () => {
    const message = [
      `✦ ${t('daily.cardTitle')} · ${insight.canChiDay}`,
      insight.personality,
      `${t('daily.luckyTime')}: ${insight.luckyTime?.range ?? t('daily.noLuckyTime')}`,
      `${t('daily.joyDirection')}: ${insight.directions.joy}`,
      `${t('daily.wealthDirection')}: ${insight.directions.wealth}`,
      `${t('daily.avoid')}: ${insight.avoid.join(', ')}`,
      'NUMELYRA',
    ].join('\n');
    await Share.share({ title: t('daily.cardTitle'), message }).catch(() => {});
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <TouchableOpacity accessibilityLabel={t('common.close')} onPress={onClose} style={styles.backdrop} />
        <LinearGradient colors={['#21135A', '#10113B', '#090A28']} style={styles.sheet}>
          <SafeAreaView style={styles.safe}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>{t('daily.cardEyebrow')}</Text>
                <Text style={styles.title}>{t('daily.cardTitle')}</Text>
                <Text style={styles.date}>{formatDate(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {insight.canChiDay}</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} style={styles.close}>
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.personalityCard}>
                <Ionicons name="sparkles" size={21} color="#FFE29A" />
                <View style={styles.flex}>
                  <Text style={styles.sectionEyebrow}>{t('daily.personality')}</Text>
                  <Text style={styles.personality}>{insight.personality}</Text>
                </View>
              </View>

              <View style={styles.stats}>
                {[
                  ['time-outline', t('daily.luckyTime'), insight.luckyTime?.range ?? t('daily.noLuckyTime')],
                  ['heart-outline', t('daily.joyDirection'), insight.directions.joy],
                  ['cash-outline', t('daily.wealthDirection'), insight.directions.wealth],
                ].map(([icon, label, value]) => (
                  <View key={label} style={styles.stat}>
                    <Ionicons name={icon as React.ComponentProps<typeof Ionicons>['name']} size={18} color="#FFD783" />
                    <Text style={styles.statLabel}>{label}</Text>
                    <Text style={styles.statValue}>{value}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.guidanceRow}>
                <View style={[styles.guidance, styles.good]}>
                  <Text style={styles.guidanceTitle}>✓ {t('daily.recommended')}</Text>
                  {insight.recommended.map((item) => <Text key={item} style={styles.guidanceText}>• {item}</Text>)}
                </View>
                <View style={[styles.guidance, styles.avoid]}>
                  <Text style={styles.guidanceTitle}>× {t('daily.avoid')}</Text>
                  {insight.avoid.map((item) => <Text key={item} style={styles.guidanceText}>• {item}</Text>)}
                </View>
              </View>

              {!!insight.warning && locale === 'vi' && <Text style={styles.warning}>{insight.warning}</Text>}
              <EvidenceRow title={t('daily.astroBasis')} value={insight.astroEvidence} />
              <EvidenceRow title={t('daily.canchiBasis')} value={insight.canChiEvidence} />

              <TouchableOpacity activeOpacity={0.84} onPress={() => onAsk(insight.suggestedQuestions[0])} style={styles.askButton}>
                <Ionicons name="chatbubble-ellipses" size={18} color="#211344" />
                <Text style={styles.askText}>{t('daily.ask')}</Text>
              </TouchableOpacity>
              <View style={styles.actions}>
                <TouchableOpacity onPress={onOpenAstrology} style={styles.action}><Text style={styles.actionText}>{t('daily.viewAstrology')}</Text></TouchableOpacity>
                <TouchableOpacity onPress={onOpenCalendar} style={styles.action}><Text style={styles.actionText}>{t('daily.viewCalendar')}</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { void shareInsight(); }} style={styles.action}><Text style={styles.actionText}>{t('daily.share')}</Text></TouchableOpacity>
              </View>
              <Text style={styles.disclaimer}>{t('daily.disclaimer')}</Text>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(3,2,18,0.64)' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  sheet: { maxHeight: '92%', minHeight: '74%', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderColor: 'rgba(218,192,255,0.34)', overflow: 'hidden' },
  safe: { flex: 1 },
  handle: { width: 45, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', alignSelf: 'center', marginTop: 9 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  headerCopy: { flex: 1 },
  eyebrow: { color: '#FFD783', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: '#FFFFFF', fontFamily: 'serif', fontSize: 25, fontWeight: '900', marginTop: 3 },
  date: { color: '#BEB3DE', fontSize: 11, marginTop: 5 },
  close: { width: 39, height: 39, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  content: { paddingHorizontal: 16, paddingBottom: 34, gap: 11 },
  personalityCard: { flexDirection: 'row', gap: 11, padding: 15, borderRadius: 21, backgroundColor: 'rgba(126,82,217,0.25)', borderWidth: 1, borderColor: 'rgba(255,220,148,0.3)' },
  flex: { flex: 1 },
  sectionEyebrow: { color: '#FFD783', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  personality: { color: '#FFFFFF', fontSize: 14, lineHeight: 21, fontWeight: '600', marginTop: 5 },
  stats: { flexDirection: 'row', gap: 7 },
  stat: { flex: 1, minHeight: 100, padding: 10, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  statLabel: { color: '#BEB3DE', fontSize: 9, fontWeight: '700', marginTop: 7 },
  statValue: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', marginTop: 4 },
  guidanceRow: { flexDirection: 'row', gap: 8 },
  guidance: { flex: 1, minHeight: 132, padding: 12, borderRadius: 18, borderWidth: 1 },
  good: { backgroundColor: 'rgba(48,164,127,0.13)', borderColor: 'rgba(91,231,185,0.25)' },
  avoid: { backgroundColor: 'rgba(218,86,122,0.12)', borderColor: 'rgba(255,137,165,0.24)' },
  guidanceTitle: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', marginBottom: 7 },
  guidanceText: { color: '#D9D4E8', fontSize: 10, lineHeight: 16 },
  warning: { color: '#FFD3A1', fontSize: 11, lineHeight: 17, paddingHorizontal: 3 },
  evidence: { padding: 14, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.06)' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  evidenceTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  evidenceText: { color: '#CFC8E0', fontSize: 11, lineHeight: 17, marginTop: 8 },
  askButton: { minHeight: 50, borderRadius: 25, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFD783' },
  askText: { color: '#211344', fontSize: 13, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 7 },
  action: { flex: 1, minHeight: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.09)' },
  actionText: { color: '#EDE8FA', fontSize: 10, fontWeight: '800', textAlign: 'center' },
  disclaimer: { color: '#8F87A8', fontSize: 9, textAlign: 'center', marginTop: 3 },
});
