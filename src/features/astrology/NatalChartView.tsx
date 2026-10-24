import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PureAstroFeatureMetadata } from '../../services/astro/astroVectorEngine';
import type { UserProfile } from '../../store/userProfile';
import { ASTROLOGY_BACKGROUNDS, ASTROLOGY_UI_ICONS, PLANET_SVG } from './astrologyArtwork';
import { NatalChartWheel } from './NatalChartWheel';
import {
  ASTRO_COLORS,
  AstrologyBackground,
  AstrologyHeader,
  MysticCard,
  SectionHeading,
  astrologyUiStyles,
} from './AstrologyUi';
import {
  getPrecisionMessage,
  isPlanetId,
  planetDescription,
  planetLabel,
  planetThemes,
  zodiacLabel,
  type AstrologyDetailTarget,
} from './astrologyPresentation';
import { useLocalization } from '../../i18n/LocalizationContext';

interface Props {
  profile: UserProfile | null;
  metadata?: PureAstroFeatureMetadata;
  calculationError: string | null;
  onBack(): void;
  onEditBirthData(): void;
  onOpenDetail(target: AstrologyDetailTarget): void;
}

export function NatalChartView({
  profile,
  metadata,
  calculationError,
  onBack,
  onEditBirthData,
  onOpenDetail,
}: Props) {
  const insets = useSafeAreaInsets();
  const { locale, l } = useLocalization();

  return (
    <AstrologyBackground variant="natal">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[astrologyUiStyles.content, { paddingTop: insets.top + 6, paddingBottom: Math.max(38, insets.bottom + 26) }]}
      >
        <AstrologyHeader
          title="Natal Chart"
          subtitle={l('Bản đồ vũ trụ của riêng bạn', 'Your personal map of the sky')}
          onBack={onBack}
          right={
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={l('Sửa dữ liệu sinh', 'Edit birth data')} onPress={onEditBirthData} style={styles.editButton}>
              <Ionicons name="create-outline" size={20} color={ASTRO_COLORS.gold} />
            </TouchableOpacity>
          }
        />

        <View style={styles.birthChips}>
          <View style={styles.birthChip}><Image contentFit="contain" source={ASTROLOGY_UI_ICONS.calendar} style={styles.birthChipIcon} /><Text style={styles.birthChipText}>{profile?.birthDate ?? l('Chưa có ngày sinh', 'No birth date')}</Text></View>
          <View style={styles.birthChip}><Image contentFit="contain" source={ASTROLOGY_UI_ICONS.clock} style={styles.birthChipIcon} /><Text style={styles.birthChipText}>{profile?.birthTime ?? l('Giờ tạm tính', 'Estimated time')}</Text></View>
          <View style={styles.birthChip}><Image contentFit="contain" source={ASTROLOGY_UI_ICONS.location} style={styles.birthChipIcon} /><Text numberOfLines={1} style={styles.birthChipText}>{profile?.birthLocation?.userLabel ?? l('Chưa có nơi sinh', 'No birth place')}</Text></View>
        </View>

        {!!calculationError && (
          <MysticCard style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={24} color="#FF9EAE" />
            <Text style={styles.errorTitle}>{l('Không thể dựng Natal Chart', 'Unable to build the natal chart')}</Text>
            <Text style={astrologyUiStyles.emptyText}>{calculationError}</Text>
          </MysticCard>
        )}

        {!!metadata && (
          <>
            <View style={styles.precisionBanner}>
              <Ionicons
                name={metadata.birthDataPrecision === 'complete' ? 'checkmark-circle' : 'information-circle'}
                size={20}
                color={metadata.birthDataPrecision === 'complete' ? '#5EEAD4' : ASTRO_COLORS.gold}
              />
              <Text style={styles.precisionText}>{getPrecisionMessage(metadata, locale)}</Text>
              {metadata.birthDataPrecision !== 'complete' && (
                <TouchableOpacity onPress={onEditBirthData} style={styles.completeButton}>
                  <Text style={styles.completeButtonText}>{l('Bổ sung', 'Add details')}</Text>
                </TouchableOpacity>
              )}
            </View>

            <MysticCard style={styles.chartCard}>
              <View style={styles.chartBackdrop}>
                <Image accessibilityElementsHidden contentFit="cover" source={ASTROLOGY_BACKGROUNDS.natal} style={StyleSheet.absoluteFill} />
                <LinearGradient
                  colors={['rgba(8,8,44,0.18)', 'rgba(11,9,56,0.44)', 'rgba(8,8,42,0.78)']}
                  style={StyleSheet.absoluteFill}
                />
                <NatalChartWheel metadata={metadata} onOpenDetail={onOpenDetail} />
                <View style={styles.aspectLegend}>
                  <View style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: '#52E2D0' }]} /><Text style={styles.legendText}>{l('Hỗ trợ', 'Supportive')}</Text></View>
                  <View style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: '#FF7B9C' }]} /><Text style={styles.legendText}>{l('Thử thách', 'Challenging')}</Text></View>
                  <View style={styles.legendItem}><View style={[styles.legendLine, { backgroundColor: '#FFD166' }]} /><Text style={styles.legendText}>{l('Hội tụ', 'Conjunction')}</Text></View>
                </View>
                {!metadata.natalContext && (
                  <Text style={styles.noHouseNote}>{l('Vòng 12 nhà, ASC và MC được ẩn vì dữ liệu sinh chưa đủ chính xác.', 'The 12 houses, ASC and MC are hidden because the birth data is not precise enough.')}</Text>
                )}
              </View>
            </MysticCard>

            <SectionHeading title={l('Năng lượng cốt lõi', 'Core energies')} eyebrow="Core Energies" />
            <View style={styles.coreList}>
              {(['Sun', 'Moon'] as const).map((planetName) => {
                const planet = metadata.natalPlanets.find((item) => item.name === planetName);
                if (!planet) return null;
                const house = metadata.natalContext?.planetHouses[planetName];
                return (
                  <TouchableOpacity
                    key={planetName}
                    activeOpacity={0.8}
                    onPress={() => onOpenDetail({ kind: 'planet', id: planetName })}
                    style={styles.coreCard}
                  >
                    <LinearGradient colors={[ASTRO_COLORS.paperLight, ASTRO_COLORS.paperDeep]} style={StyleSheet.absoluteFill} />
                    <View style={styles.coreSymbol}><Image contentFit="contain" source={PLANET_SVG[planetName]} style={styles.coreSymbolImage} /></View>
                    <View style={styles.coreCopy}>
                      <View style={styles.coreTitleRow}>
                        <Text style={styles.coreTitle}>{planetLabel(planetName, locale)} {l('ở', 'in')} {zodiacLabel(planet.sign, locale)}</Text>
                        {!!house && <Text style={styles.houseBadge}>{l('Nhà', 'House')} {house}</Text>}
                      </View>
                      <Text style={styles.coreMeta}>{planet.degreeInSign.toFixed(1)}° · {planetThemes(planetName, locale).join(' · ')}</Text>
                      <Text style={styles.coreDescription}>{planetDescription(planetName, locale)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={19} color="#AFA2D4" />
                  </TouchableOpacity>
                );
              })}
              <MysticCard style={styles.temperamentCard}>
                <View style={styles.temperamentIcon}><Ionicons name="color-palette-outline" size={22} color={ASTRO_COLORS.gold} /></View>
                <View style={styles.coreCopy}>
                  <Text style={styles.coreTitle}>{l('Khí chất nổi trội', 'Dominant temperament')}</Text>
                  <Text style={styles.temperamentValue}>{metadata.temperament.dominantElement} · {metadata.temperament.dominantModality}</Text>
                  <Text style={styles.coreDescription}>{l('Tổng hợp từ phân bố nguyên tố và tính chất của 10 hành tinh bản mệnh.', 'Synthesized from the element and modality distribution of your 10 natal planets.')}</Text>
                </View>
              </MysticCard>
            </View>

            {metadata.natalContext && (
              <MysticCard style={styles.axisCard}>
                <Text style={styles.axisEyebrow}>{l('TRỤC LÁ SỐ', 'CHART AXIS')} · PORPHYRY</Text>
                <View style={styles.axisRow}>
                  <View style={styles.axisItem}><Text style={styles.axisLabel}>{l('Cung Mọc', 'Ascendant')} · ASC</Text><Text style={styles.axisValue}>{zodiacLabelFromLongitude(metadata.natalContext.angles.ascendant, locale)}</Text></View>
                  <View style={styles.axisDivider} />
                  <View style={styles.axisItem}><Text style={styles.axisLabel}>{l('Thiên Đỉnh', 'Midheaven')} · MC</Text><Text style={styles.axisValue}>{zodiacLabelFromLongitude(metadata.natalContext.angles.midheaven, locale)}</Text></View>
                </View>
              </MysticCard>
            )}

            <SectionHeading title={l('Vị trí hành tinh', 'Planetary placements')} eyebrow="Natal Placements" />
            <MysticCard style={styles.placementsCard}>
              {metadata.natalPlanets.map((planet, index) => {
                if (!isPlanetId(planet.name)) return null;
                const planetId = planet.name;
                return <TouchableOpacity
                  key={planetId}
                  activeOpacity={0.75}
                  onPress={() => onOpenDetail({ kind: 'planet', id: planetId })}
                  style={[styles.placementRow, index > 0 && styles.placementBorder]}
                >
                  <Image contentFit="contain" source={PLANET_SVG[planetId]} style={styles.placementSymbol} />
                  <Text style={styles.placementPlanet}>{planetLabel(planetId, locale)}</Text>
                  <Text style={styles.placementValue}>{zodiacLabel(planet.sign, locale)} · {planet.degreeInSign.toFixed(1)}°</Text>
                  {!!metadata.natalContext?.planetHouses[planet.name] && (
                    <Text style={styles.placementHouse}>H{metadata.natalContext.planetHouses[planet.name]}</Text>
                  )}
                </TouchableOpacity>;
              })}
            </MysticCard>
          </>
        )}
      </ScrollView>
    </AstrologyBackground>
  );
}

function zodiacLabelFromLongitude(longitude: number, locale: 'vi' | 'en'): string {
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  return zodiacLabel(signs[Math.floor(((longitude % 360) + 360) % 360 / 30)], locale);
}

const styles = StyleSheet.create({
  editButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,214,124,0.28)', backgroundColor: 'rgba(10,13,49,0.72)' },
  birthChips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7, marginTop: 8, marginBottom: 14 },
  birthChip: { maxWidth: '100%', minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderRadius: 17, backgroundColor: 'rgba(22,20,69,0.78)', borderWidth: 1, borderColor: 'rgba(155,140,240,0.24)' },
  birthChipIcon: { width: 16, height: 16 },
  birthChipText: { flexShrink: 1, color: '#DDD9F0', fontSize: 10, fontWeight: '700' },
  precisionBanner: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, borderRadius: 16, backgroundColor: 'rgba(13,31,75,0.86)', borderWidth: 1, borderColor: 'rgba(116,232,255,0.26)', marginBottom: 12 },
  precisionText: { flex: 1, color: '#BDD0E1', fontSize: 10, lineHeight: 15 },
  completeButton: { minHeight: 36, paddingHorizontal: 12, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,214,124,0.14)' },
  completeButtonText: { color: ASTRO_COLORS.gold, fontSize: 10, fontWeight: '900' },
  errorCard: { marginTop: 18, padding: 22, alignItems: 'center', gap: 9, borderColor: 'rgba(255,130,153,0.38)' },
  errorTitle: { color: '#FFE9ED', fontSize: 16, fontWeight: '800' },
  chartCard: { backgroundColor: 'rgba(12,12,55,0.82)', borderColor: 'rgba(255,214,124,0.55)', shadowColor: '#7F5BFF', shadowOpacity: 0.28, shadowRadius: 18, elevation: 7 },
  chartBackdrop: { paddingVertical: 20, paddingHorizontal: 4 },
  aspectLegend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendLine: { width: 18, height: 2, borderRadius: 1 },
  legendText: { color: '#BEBAD4', fontSize: 9, fontWeight: '700' },
  noHouseNote: { color: '#AAA7C1', fontSize: 10, lineHeight: 15, textAlign: 'center', paddingHorizontal: 24, marginTop: 12 },
  coreList: { gap: 10 },
  coreCard: { minHeight: 126, flexDirection: 'row', alignItems: 'center', padding: 17, borderRadius: 24, overflow: 'hidden', backgroundColor: ASTRO_COLORS.paper, borderWidth: 1, borderColor: 'rgba(255,214,155,0.72)', shadowColor: '#13092F', shadowOpacity: 0.18, shadowRadius: 10, elevation: 4 },
  coreSymbol: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: 'rgba(105,73,207,0.18)', borderWidth: 1, borderColor: 'rgba(118,87,226,0.24)' },
  coreSymbolImage: { width: 42, height: 42 },
  coreCopy: { flex: 1 },
  coreTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  coreTitle: { flexShrink: 1, color: '#21184B', fontSize: 17, fontFamily: 'serif', fontWeight: '900' },
  houseBadge: { color: '#7D3E82', fontSize: 9, fontWeight: '900', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 9, backgroundColor: 'rgba(221,150,190,0.25)' },
  coreMeta: { color: '#745E94', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', marginTop: 6 },
  coreDescription: { color: '#5D5271', fontSize: 12, lineHeight: 18, marginTop: 6 },
  temperamentCard: { minHeight: 105, flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: 'rgba(255,239,218,0.96)', borderColor: 'rgba(255,214,124,0.5)' },
  temperamentIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: '#4E347D' },
  temperamentValue: { color: '#714FA0', fontSize: 14, fontWeight: '900', marginTop: 5 },
  axisCard: { marginTop: 16, padding: 16 },
  axisEyebrow: { color: ASTRO_COLORS.cyan, fontSize: 9, fontWeight: '900', letterSpacing: 1.1, textAlign: 'center' },
  axisRow: { flexDirection: 'row', alignItems: 'stretch', marginTop: 14 },
  axisItem: { flex: 1, alignItems: 'center' },
  axisDivider: { width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.16)' },
  axisLabel: { color: '#9EA5C3', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  axisValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', marginTop: 6 },
  placementsCard: { paddingHorizontal: 15 },
  placementRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 9 },
  placementBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(184,171,224,0.18)' },
  placementSymbol: { width: 26, height: 26 },
  placementPlanet: { width: 88, color: '#F2F0FA', fontSize: 12, fontWeight: '800' },
  placementValue: { flex: 1, color: '#C3BFDA', fontSize: 11 },
  placementHouse: { color: ASTRO_COLORS.cyan, fontSize: 10, fontWeight: '900' },
});
