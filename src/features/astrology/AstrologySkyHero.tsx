import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import type { AstroFortuneQuota, AstroFortuneSlip } from '../../services/astro/astroFortuneService';
import type { PureAstroFeatureMetadata } from '../../services/astro/astroVectorEngine';
import type { UserProfile } from '../../store/userProfile';
import {
  ASTROLOGY_BACKGROUNDS,
  ASTROLOGY_DECORATIONS,
  ZODIAC_PNG,
} from './astrologyArtwork';
import { ASTRO_COLORS } from './AstrologyUi';
import { isZodiacId, zodiacLabel } from './astrologyPresentation';
import { useLocalization } from '../../i18n/LocalizationContext';

interface Props {
  profile: UserProfile;
  isPrimaryProfile?: boolean;
  currentDate: Date;
  metadata?: PureAstroFeatureMetadata;
  fortune: AstroFortuneSlip | null;
  loading: boolean;
  fortuneQuota: AstroFortuneQuota | null;
  onBack(): void;
  onProfilePress(): void;
  onInterpretationPress(): void;
}

export function AstrologySkyHero({
  profile,
  isPrimaryProfile = false,
  metadata,
  fortune,
  loading,
  fortuneQuota,
  onBack,
  onProfilePress,
  onInterpretationPress,
}: Props) {
  const { locale, t, l } = useLocalization();
  const zodiacArtwork = metadata && isZodiacId(metadata.natalSunSign)
    ? ZODIAC_PNG[metadata.natalSunSign]
    : undefined;
  const localizedVibe = metadata?.dominantSignal === 'tension'
    ? l('Các góc ma sát đang trội hơn, phù hợp với việc rà soát lại kế hoạch.', 'Friction aspects are more prominent, making this a good time to review your plans.')
    : metadata?.dominantSignal === 'harmony'
      ? l('Các góc hỗ trợ đang chiếm ưu thế, thuận lợi cho việc triển khai dự định.', 'Supportive aspects are prominent, creating favorable conditions for moving plans forward.')
      : metadata?.dominantSignal === 'conjunction'
        ? l('Các nguồn lực đang hội tụ mạnh mẽ, tập trung vào trọng tâm cần đẩy nhanh.', 'Several currents are converging strongly; focus on the priority that needs momentum.')
        : l('Các dòng tác động đan xen khá cân bằng, phù hợp để duy trì nhịp sống và quan sát tín hiệu mới.', 'The influences are fairly balanced, supporting a steady pace and attentive observation.');

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
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
          onPress={onBack}
          style={styles.roundButton}
        >
          <Ionicons name="arrow-back" size={21} color={ASTRO_COLORS.star} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel={`${l('Đổi hồ sơ, hiện tại là', 'Change profile, currently')} ${profile.fullName}`}
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
              {new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${profile.birthDate.split('T', 1)[0]}T12:00:00`))}{metadata ? ` · ${zodiacLabel(metadata.natalSunSign, locale)}` : ''}
            </Text>
          </View>
          {isPrimaryProfile && <Text style={styles.primaryBadge}>{l('Tôi', 'Me')}</Text>}
          <Ionicons name="chevron-down" size={16} color={ASTRO_COLORS.muted} />
        </TouchableOpacity>
        <LinearGradient
          accessibilityLabel={fortuneQuota
            ? l(
                `Còn ${fortuneQuota.remaining} trên ${fortuneQuota.limit} lượt tạo fortune hôm nay`,
                `${fortuneQuota.remaining} of ${fortuneQuota.limit} fortune generations remaining today`,
              )
            : l('Đang tải số lượt tạo fortune', 'Loading fortune allowance')}
          accessible
          colors={['#FFF0A5', '#FF91D9', '#956BFF', '#FFE58B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.quotaFrame}
        >
          <LinearGradient
            colors={['rgba(77,31,91,0.98)', 'rgba(37,22,84,0.98)', 'rgba(14,15,65,0.98)']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quotaInner}
          >
            <LinearGradient
              colors={['#FFE889', '#FF95DB', '#8D65FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.planetFrame}
            >
              <LinearGradient
                colors={['#7F3EB4', '#4A2A9C', '#231968']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.planetCore}
              >
                <Ionicons name="planet" size={17} color="#FFE38A" />
              </LinearGradient>
            </LinearGradient>
            {fortuneQuota ? (
              <View style={styles.quotaAmountRow}>
                <Text style={styles.quotaRemaining}>{fortuneQuota.remaining}</Text>
                <Text style={styles.quotaLimit}>/ {fortuneQuota.limit}</Text>
              </View>
            ) : (
              <ActivityIndicator size={13} color="#FFE38A" style={styles.quotaLoader} />
            )}
          </LinearGradient>
        </LinearGradient>
      </View>

      <TouchableOpacity
        accessibilityLabel={l('Mở luận giải hôm nay', "Open today's reading")}
        accessibilityRole="button"
        activeOpacity={0.9}
        onPress={onInterpretationPress}
        style={styles.quoteArea}
      >
        <Text style={styles.quoteEyebrow}>{l('THÔNG ĐIỆP HÔM NAY', "TODAY'S MESSAGE")}</Text>
        {loading && !fortune ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={ASTRO_COLORS.gold} />
            <Text style={styles.loadingText}>{l('Đang đọc bầu trời của bạn…', 'Reading your sky…')}</Text>
          </View>
        ) : (
          <Text style={styles.quote}>
            {fortune?.verse ?? (metadata ? localizedVibe : null) ?? l('Chạm để xem bức tranh năng lượng hôm nay.', "Tap to view today's energy landscape.")}
          </Text>
        )}
        <View style={styles.interpretRow}>
          <Text style={styles.interpretText}>{l('Xem luận giải', 'View reading')}</Text>
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
  primaryBadge: { color: '#251245', backgroundColor: ASTRO_COLORS.gold, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 3, fontSize: 9, fontWeight: '900', overflow: 'hidden' },
  quotaFrame: {
    width: 82,
    height: 44,
    borderRadius: 22,
    padding: 1.5,
    shadowColor: '#F179FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.72,
    shadowRadius: 7,
    elevation: 6,
  },
  quotaInner: {
    flex: 1,
    borderRadius: 20.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,221,248,0.34)',
  },
  planetFrame: {
    width: 31,
    height: 31,
    borderRadius: 16,
    padding: 1.5,
    marginRight: 5,
    shadowColor: '#FFE486',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.72,
    shadowRadius: 5,
    elevation: 4,
  },
  planetCore: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quotaAmountRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  quotaLoader: {
    flex: 1,
  },
  quotaRemaining: {
    color: '#FFE485',
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '900',
    textShadowColor: 'rgba(255,198,90,0.75)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  quotaLimit: {
    marginLeft: 2,
    color: '#D9CBFF',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '900',
  },
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
