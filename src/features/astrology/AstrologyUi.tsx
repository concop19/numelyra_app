import React, { type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import {
  ASTROLOGY_BACKGROUNDS,
  ASTROLOGY_DECORATIONS,
  type AstrologyBackgroundVariant,
} from './astrologyArtwork';

export const ASTRO_COLORS = {
  deep: '#080C43',
  navy: '#0C0B44',
  navyRaised: '#1F175D',
  purple: '#321F74',
  paperLight: '#FDE0CB',
  paper: '#FBD7C0',
  paperDeep: '#F9CCB2',
  paperText: '#21184B',
  text: '#F8F8FF',
  muted: '#E8DFFF',
  gold: '#FFD69B',
  star: '#FFF5CC',
  pink: '#F9B7DD',
  statusPink: '#F87090',
  cyan: '#8AE5EA',
  constellation: '#8FD6FF',
  lavender: '#D6BDFF',
  violetBorder: '#C9A7FF',
  cream: '#FFF5CC',
  border: 'rgba(201,167,255,0.45)',
} as const;

const VEILS: Record<AstrologyBackgroundVariant, readonly [string, string, string]> = {
  today: ['rgba(8,12,67,0.05)', 'rgba(12,11,68,0.28)', 'rgba(8,12,67,0.98)'],
  natal: ['rgba(8,12,67,0.10)', 'rgba(12,11,68,0.34)', 'rgba(8,12,67,0.96)'],
  detail: ['rgba(8,12,67,0.04)', 'rgba(12,11,68,0.22)', 'rgba(8,12,67,0.94)'],
};

export function AstrologyBackground({
  children,
  variant = 'today',
}: {
  children: ReactNode;
  variant?: AstrologyBackgroundVariant;
}) {
  return (
    <View style={styles.root}>
      <Image
        accessibilityElementsHidden
        contentFit="cover"
        priority="high"
        source={ASTROLOGY_BACKGROUNDS[variant]}
        style={StyleSheet.absoluteFill}
      />
      <Image
        accessibilityElementsHidden
        contentFit="contain"
        pointerEvents="none"
        source={ASTROLOGY_DECORATIONS.starDust}
        style={[styles.starDust, variant === 'natal' && styles.starDustNatal]}
      />
      <LinearGradient
        colors={VEILS[variant]}
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack(): void;
  right?: ReactNode;
}

export function AstrologyHeader({ title, subtitle, onBack, right }: HeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        activeOpacity={0.78}
        onPress={onBack}
        style={styles.iconButton}
      >
        <Ionicons name="arrow-back" size={23} color={ASTRO_COLORS.gold} />
      </TouchableOpacity>
      <View style={styles.headerCopy}>
        <Text style={styles.headerTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

export function SectionHeading({
  title,
  eyebrow,
  action,
  onAction,
}: {
  title: string;
  eyebrow?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionCopy}>
        {!!eyebrow && <Text style={styles.sectionEyebrow}>{eyebrow}</Text>}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {!!action && !!onAction && (
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.72}
          onPress={onAction}
          style={styles.sectionAction}
        >
          <Text style={styles.sectionActionText}>{action}</Text>
          <Ionicons name="chevron-forward" size={15} color={ASTRO_COLORS.gold} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export function MysticCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export const astrologyUiStyles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingBottom: 42,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: ASTRO_COLORS.border,
    backgroundColor: 'rgba(13, 20, 63, 0.88)',
    overflow: 'hidden',
  },
  body: {
    color: '#DADAF0',
    fontSize: 14,
    lineHeight: 21,
  },
  emptyText: {
    color: '#B7B8D4',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ASTRO_COLORS.navy },
  starDust: { position: 'absolute', top: 28, right: 8, width: 168, height: 138, opacity: 0.34 },
  starDustNatal: { left: 10, right: undefined, top: 80, opacity: 0.26 },
  header: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,214,124,0.28)',
    backgroundColor: 'rgba(10,13,49,0.72)',
  },
  headerCopy: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitle: { color: ASTRO_COLORS.text, fontSize: 23, fontFamily: 'serif', fontWeight: '800' },
  headerSubtitle: { color: '#D0C8E7', fontSize: 10, letterSpacing: 1.35, marginTop: 3, textTransform: 'uppercase' },
  headerRight: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  sectionCopy: { flex: 1 },
  sectionEyebrow: { color: ASTRO_COLORS.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.55, textTransform: 'uppercase', marginBottom: 5 },
  sectionTitle: { color: ASTRO_COLORS.text, fontSize: 23, lineHeight: 28, fontFamily: 'serif', fontWeight: '800' },
  sectionAction: { minHeight: 38, flexDirection: 'row', alignItems: 'center', paddingLeft: 12 },
  sectionActionText: { color: ASTRO_COLORS.gold, fontSize: 12, fontWeight: '700' },
  card: { borderRadius: 22, borderWidth: 1, borderColor: ASTRO_COLORS.border, backgroundColor: 'rgba(13,20,63,0.88)', overflow: 'hidden' },
});
