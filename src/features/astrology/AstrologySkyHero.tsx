import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import type { AstroFortuneSlip } from '../../services/astro/astroFortuneService';
import type { PureAstroFeatureMetadata } from '../../services/astro/astroVectorEngine';
import type { UserProfile } from '../../store/userProfile';
import {
  ASTROLOGY_BACKGROUNDS,
  ASTROLOGY_DECORATIONS,
  ASTROLOGY_UI_ICONS,
  ZODIAC_PNG,
} from './astrologyArtwork';
import { ASTRO_COLORS } from './AstrologyUi';
import { isZodiacId, zodiacLabel } from './astrologyPresentation';

interface Props {
  profile: UserProfile;
  currentDate: Date;
  metadata?: PureAstroFeatureMetadata;
  fortune: AstroFortuneSlip | null;
  loading: boolean;
  onBack(): void;
  onProfilePress(): void;
  onInterpretationPress(): void;
  onShare(): void;
}

function formatBirthDate(value: string): string {
  const parts = value.split('T', 1)[0].split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return value;
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(parts[0], parts[1] - 1, parts[2]));
}

export function AstrologySkyHero({
  profile,
  metadata,
  fortune,
  loading,
  onBack,
  onProfilePress,
  onInterpretationPress,
  onShare,
}: Props) {
  const zodiacArtwork = metadata && isZodiacId(metadata.natalSunSign)
    ? ZODIAC_PNG[metadata.natalSunSign]
    : undefined;

  return (
    <View style={styles.hero}>
      <Image
        accessibilityElementsHidden
        contentFit="cover"
        priority="high"
        source={ASTROLOGY_BACKGROUNDS.today}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(8,12,67,0.08)', 'rgba(12,11,68,0.06)', 'rgba(8,12,67,0.46)']}
        locations={[0, 0.58, 1]}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      <Image
        accessibilityElementsHidden
        contentFit="contain"
        pointerEvents="none"
        source={ASTROLOGY_DECORATIONS.shootingStar}
        style={styles.shootingStar}
      />

      <View style={styles.profileRow}>
        <TouchableOpacity
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
          onPress={onBack}
          style={styles.roundButton}
        >
          <Ionicons name="arrow-back" size={21} color={ASTRO_COLORS.star} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel={`Đổi hồ sơ, hiện tại là ${profile.fullName}`}
          accessibilityRole="button"
          activeOpacity={0.82}
          onPress={onProfilePress}
          style={styles.profileButton}
        >
          <View style={styles.avatar}>
            {zodiacArtwork ? (
              <Image contentFit="contain" source={zodiacArtwork} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarFallback}>{profile.fullName.trim().slice(0, 1).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.profileCopy}>
            <Text numberOfLines={1} style={styles.profileName}>{profile.fullName}</Text>
            <Text numberOfLines={1} style={styles.profileMeta}>
              {formatBirthDate(profile.birthDate)}{metadata ? ` · ${zodiacLabel(metadata.natalSunSign)}` : ''}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color={ASTRO_COLORS.muted} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel="Chia sẻ luận giải hôm nay"
          accessibilityRole="button"
          disabled={!fortune || loading}
          onPress={onShare}
          style={[styles.roundButton, (!fortune || loading) && styles.disabled]}
        >
          <Image contentFit="contain" source={ASTROLOGY_UI_ICONS.share} style={styles.actionIcon} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        accessibilityLabel="Mở luận giải hôm nay"
        accessibilityRole="button"
        activeOpacity={0.9}
        onPress={onInterpretationPress}
        style={styles.quoteArea}
      >
        <Text style={styles.quoteEyebrow}>THÔNG ĐIỆP HÔM NAY</Text>
        {loading && !fortune ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={ASTRO_COLORS.gold} />
            <Text style={styles.loadingText}>Đang đọc bầu trời của bạn…</Text>
          </View>
        ) : (
          <Text style={styles.quote}>
            {fortune?.verse ?? metadata?.vibeSummary ?? 'Chạm để xem bức tranh năng lượng hôm nay.'}
          </Text>
        )}
        <View style={styles.interpretRow}>
          <Text style={styles.interpretText}>Xem luận giải</Text>
          <Ionicons name="arrow-forward" size={15} color={ASTRO_COLORS.gold} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 320,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201,167,255,0.56)',
    backgroundColor: ASTRO_COLORS.navy,
    shadowColor: '#12072F',
    shadowOpacity: 0.42,
    shadowRadius: 18,
    elevation: 8,
    paddingBottom: 16,
  },
  shootingStar: { position: 'absolute', right: 18, top: 88, width: 76, height: 76, opacity: 0.58 },
  profileRow: {
    marginTop: 14,
    marginHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 4,
  },
  roundButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(12,11,68,0.72)', borderWidth: 1, borderColor: 'rgba(255,214,155,0.52)' },
  profileButton: { flex: 1, minWidth: 0, minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, borderRadius: 24, backgroundColor: 'rgba(8,12,67,0.58)', borderWidth: 1, borderColor: 'rgba(255,214,155,0.38)' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: 'rgba(50,31,116,0.82)', borderWidth: 1.5, borderColor: ASTRO_COLORS.gold },
  avatarImage: { width: 42, height: 42 },
  avatarFallback: { color: ASTRO_COLORS.star, fontSize: 22, fontWeight: '900' },
  profileCopy: { flex: 1, marginLeft: 8 },
  profileName: { color: ASTRO_COLORS.text, fontSize: 17, fontFamily: 'serif', fontWeight: '800' },
  profileMeta: { color: ASTRO_COLORS.muted, fontSize: 10.5, marginTop: 3 },
  actionIcon: { width: 24, height: 24 },
  disabled: { opacity: 0.46 },
  quoteArea: {
    marginHorizontal: 16,
    marginTop: 14,
    minHeight: 128,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(12,11,68,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(255,214,155,0.22)',
    zIndex: 3,
  },
  quoteEyebrow: { color: ASTRO_COLORS.gold, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  quote: {
    color: ASTRO_COLORS.text,
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontSize: 15.5,
    lineHeight: 23.5,
    marginTop: 8,
    textShadowColor: '#12072F',
    textShadowRadius: 7,
  },
  loadingRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 9 },
  loadingText: { color: ASTRO_COLORS.muted, fontSize: 12 },
  interpretRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  interpretText: { color: ASTRO_COLORS.gold, fontSize: 12, fontWeight: '900' },
});
