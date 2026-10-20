import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import type { DailyInsight } from './dailyInsight';
import { useLocalization } from '../../i18n/LocalizationContext';

interface Props {
  insight: DailyInsight;
  onPress(): void;
}

export default function DailyInsightCard({ insight, onPress }: Props) {
  const { t } = useLocalization();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={t('daily.open')}
      activeOpacity={0.86}
      onPress={onPress}
      style={styles.touch}
    >
      <LinearGradient colors={['rgba(80,44,150,0.98)', 'rgba(35,25,91,0.98)']} style={styles.card}>
        <View style={styles.icon}><Ionicons name="sparkles" size={19} color="#FFE29A" /></View>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{t('daily.cardEyebrow')} · {insight.canChiDay}</Text>
          <Text numberOfLines={1} style={styles.title}>{insight.personality}</Text>
          <Text style={styles.meta}>
            {t('daily.luckyTime')}: {insight.luckyTime?.range ?? t('daily.noLuckyTime')} · {insight.directions.wealth}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#D8C9FF" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touch: { marginHorizontal: 14, marginBottom: 8, borderRadius: 20, overflow: 'hidden' },
  card: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, paddingVertical: 11, borderWidth: 1, borderColor: 'rgba(255,220,148,0.35)', borderRadius: 20 },
  icon: { width: 39, height: 39, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,226,154,0.12)' },
  copy: { flex: 1 },
  eyebrow: { color: '#FFE29A', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  title: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginTop: 3 },
  meta: { color: '#CFC5E9', fontSize: 10, marginTop: 4 },
});

