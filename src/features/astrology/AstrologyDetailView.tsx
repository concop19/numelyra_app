import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { PureAstroFeatureMetadata } from '../../services/astro/astroVectorEngine';
import {
  ASTROLOGY_BACKGROUNDS,
  CONSTELLATION_SVG,
  PLANET_PNG,
  PLANET_SVG,
  ZODIAC_PNG,
} from './astrologyArtwork';
import { EnergyScoreRing } from './EnergyScoreRing';
import {
  ASTRO_COLORS,
  AstrologyBackground,
  AstrologyHeader,
  MysticCard,
  SectionHeading,
  astrologyUiStyles,
} from './AstrologyUi';
import {
  buildTodayInterpretation,
  formatAspect,
  getActiveInfluences,
  getCelestialInfo,
  getEnergyFocus,
  planetLabel,
  resolveDetailConstellation,
  zodiacLabel,
  type AstrologyDetailTarget,
} from './astrologyPresentation';

interface Props {
  target: AstrologyDetailTarget;
  metadata?: PureAstroFeatureMetadata;
  onBack(): void;
}

export function AstrologyDetailView({ target, metadata, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const info = getCelestialInfo(target);
  const influences = metadata ? getActiveInfluences(metadata, target) : [];
  const focus = metadata ? getEnergyFocus(metadata) : [];
  const natalPlanet = target.kind === 'planet'
    ? metadata?.natalPlanets.find((planet) => planet.name === target.id)
    : undefined;
  const transitPlanet = target.kind === 'planet'
    ? metadata?.transitPlanets.find((planet) => planet.name === target.id)
    : undefined;
  const house = target.kind === 'planet' ? metadata?.natalContext?.planetHouses[target.id] : undefined;
  const constellationSign = resolveDetailConstellation(target, metadata);
  const emblem = target.kind === 'sign' ? ZODIAC_PNG[target.id] : PLANET_PNG[target.id];
  const smallSymbol = target.kind === 'sign' ? ZODIAC_PNG[target.id] : PLANET_SVG[target.id];
  const isPlanetDetail = target.kind === 'planet';

  return (
    <AstrologyBackground variant="detail">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[astrologyUiStyles.content, { paddingTop: insets.top + 6, paddingBottom: Math.max(38, insets.bottom + 26) }]}
      >
        <AstrologyHeader title="Chi tiết năng lượng" subtitle={target.kind === 'planet' ? 'Hành tinh' : 'Cung hoàng đạo'} onBack={onBack} />

        <View style={[styles.hero, isPlanetDetail && styles.planetHero]}>
          <Image
            accessibilityElementsHidden
            contentFit="cover"
            priority="high"
            source={isPlanetDetail ? ASTROLOGY_BACKGROUNDS.planetDetail : ASTROLOGY_BACKGROUNDS.detail}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={isPlanetDetail
              ? ['rgba(8,12,47,0.02)', 'rgba(8,12,55,0.18)', 'rgba(8,10,48,0.78)']
              : ['rgba(8,12,67,0.04)', 'rgba(12,11,68,0.08)', 'rgba(8,12,67,0.52)']}
            locations={isPlanetDetail ? [0, 0.5, 1] : [0, 0.6, 1]}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          />
          {isPlanetDetail ? (
            <View style={styles.planetHeroRow}>
              <View style={styles.planetArtStage}>
                <View pointerEvents="none" style={styles.planetAura} />
                <View style={styles.planetEmblemWrap}>
                  <Image
                    accessibilityLabel={`Hành tinh ${info.nameVi}`}
                    contentFit="contain"
                    source={emblem}
                    style={styles.planetEmblem}
                  />
                </View>
              </View>
              <View style={styles.planetCopy}>
                <Image
                  accessibilityElementsHidden
                  contentFit="contain"
                  pointerEvents="none"
                  source={CONSTELLATION_SVG[constellationSign]}
                  style={styles.planetConstellationHalo}
                />
                <View style={styles.planetCopyContent}>
                  <Text style={styles.planetConstellationCaption}>CHÒM SAO {zodiacLabel(constellationSign).toUpperCase()}</Text>
                  <Text style={styles.planetTitle}>{info.nameVi}</Text>
                  <Text style={[styles.heroDescription, styles.planetDescription]}>{info.description}</Text>
                  <View style={styles.themeRow}>
                    {info.themes.map((theme) => <Text key={theme} style={styles.themePill}>{theme}</Text>)}
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.heroTop}>
                <Image accessibilityLabel={`Biểu tượng ${info.nameVi}`} contentFit="contain" source={emblem} style={styles.emblem} />
                <Text style={styles.heroTitle}>{info.nameVi}</Text>
                <Text style={styles.heroDescription}>{info.description}</Text>
                <View style={styles.themeRow}>
                  {info.themes.map((theme) => <Text key={theme} style={styles.themePill}>{theme}</Text>)}
                </View>
              </View>
              <View style={styles.constellationWrap}>
                <Text style={styles.constellationLabel}>CHÒM SAO {zodiacLabel(constellationSign).toUpperCase()}</Text>
                <Image
                  accessibilityLabel={`Chòm sao ${zodiacLabel(constellationSign)}`}
                  contentFit="contain"
                  source={CONSTELLATION_SVG[constellationSign]}
                  style={styles.constellation}
                />
              </View>
            </>
          )}
          {(natalPlanet || transitPlanet) && (
            <View style={[styles.placementPanel, isPlanetDetail && styles.planetPlacementPanel]}>
              {!!natalPlanet && (
                <View style={styles.placementItem}>
                  <Image contentFit="contain" source={smallSymbol} style={styles.placementIcon} />
                  <View style={styles.placementCopy}>
                    <Text style={styles.placementLabel}>BẢN MỆNH</Text>
                    <Text style={styles.placementValue}>{zodiacLabel(natalPlanet.sign)} · {natalPlanet.degreeInSign.toFixed(1)}°{house ? ` · Nhà ${house}` : ''}</Text>
                  </View>
                </View>
              )}
              {!!transitPlanet && (
                <View style={styles.placementItem}>
                  <Image contentFit="contain" source={smallSymbol} style={styles.placementIcon} />
                  <View style={styles.placementCopy}>
                    <Text style={styles.placementLabel}>HÔM NAY</Text>
                    <Text style={styles.placementValue}>{zodiacLabel(transitPlanet.sign)} · {transitPlanet.degreeInSign.toFixed(1)}°</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {!metadata ? (
          <MysticCard style={styles.emptyCard}>
            <Ionicons name="alert-circle-outline" size={26} color="#FFB0BE" />
            <Text style={astrologyUiStyles.emptyText}>Chưa có dữ liệu lá số hợp lệ để hiển thị ảnh hưởng.</Text>
          </MysticCard>
        ) : (
          <>
            <SectionHeading title="Trọng tâm năng lượng" eyebrow="Energy Focus" />
            <MysticCard style={styles.focusCard}>
              <View style={styles.focusGrid}>
                {focus.map((item) => (
                  <EnergyScoreRing key={item.id} label={item.label} value={item.value} color={item.color} />
                ))}
              </View>
              <Text style={styles.focusNote}>Các tỷ lệ lấy trực tiếp từ điểm góc chiếu và nhịp hành tinh của engine.</Text>
            </MysticCard>

            <SectionHeading title="Ảnh hưởng đang hoạt động" eyebrow="Active Influences" />
            <MysticCard style={styles.influenceCard}>
              {influences.length > 0 ? influences.map((aspect, index) => (
                <View key={`${aspect.transitPlanet}-${aspect.natalPlanet}-${aspect.type}`} style={[styles.influenceRow, index > 0 && styles.influenceBorder]}>
                  <View style={[styles.natureDot, { backgroundColor: aspect.nature === 'harmony' ? '#5EEAD4' : aspect.nature === 'tension' ? ASTRO_COLORS.statusPink : '#FBBF24' }]} />
                  <View style={styles.influenceCopy}>
                    <Text style={styles.influenceTitle}>{planetLabel(aspect.transitPlanet)} {aspect.symbol} {planetLabel(aspect.natalPlanet)}</Text>
                    <Text style={styles.influenceBody}>{formatAspect(aspect)}</Text>
                  </View>
                  <Text style={styles.orbText}>{aspect.orb.toFixed(1)}°</Text>
                </View>
              )) : (
                <View style={styles.noInfluence}>
                  <Ionicons name="moon-outline" size={25} color="#A9A2CA" />
                  <Text style={astrologyUiStyles.emptyText}>Không có góc chính nổi bật liên quan tới {info.nameVi} trong dữ liệu hôm nay.</Text>
                </View>
              )}
            </MysticCard>

            <SectionHeading title="Luận giải hôm nay" eyebrow="Today's Interpretation" />
            <MysticCard style={styles.interpretationCard}>
              <LinearGradient colors={[ASTRO_COLORS.paperLight, ASTRO_COLORS.paperDeep]} style={StyleSheet.absoluteFill} />
              <View style={styles.interpretationIcon}><Ionicons name="sparkles" size={22} color="#35205D" /></View>
              <Text style={styles.interpretationText}>{buildTodayInterpretation(metadata, target)}</Text>
              {!!metadata.dailyContext?.activatedHouses.length && (
                <View style={styles.houseRow}>
                  {metadata.dailyContext.activatedHouses.map((activeHouse) => (
                    <View key={activeHouse.house} style={styles.housePill}>
                      <Text style={styles.houseNumber}>Nhà {activeHouse.house}</Text>
                      <Text style={styles.houseTopic}>{activeHouse.topicVi}</Text>
                    </View>
                  ))}
                </View>
              )}
            </MysticCard>
          </>
        )}
      </ScrollView>
    </AstrologyBackground>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: 12, minHeight: 520, alignItems: 'center', padding: 18, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,214,155,0.48)', overflow: 'hidden', shadowColor: '#7C51D6', shadowOpacity: 0.3, shadowRadius: 18, elevation: 7 },
  planetHero: { minHeight: 0, paddingHorizontal: 12, paddingTop: 14, paddingBottom: 16, borderColor: 'rgba(201,167,255,0.58)', shadowColor: '#B77CFF', shadowOpacity: 0.34, shadowRadius: 22 },
  heroTop: { width: '100%', alignItems: 'center', zIndex: 2 },
  emblem: { width: 72, height: 72, marginTop: -4 },
  planetHeroRow: { width: '100%', minHeight: 244, flexDirection: 'row', alignItems: 'center', zIndex: 2 },
  planetArtStage: { width: '40%', minHeight: 218, alignItems: 'center', justifyContent: 'center' },
  planetAura: { position: 'absolute', width: 124, height: 124, borderRadius: 62, backgroundColor: 'rgba(167,111,255,0.2)', shadowColor: '#FFD69B', shadowOpacity: 0.74, shadowRadius: 28, elevation: 10 },
  planetEmblemWrap: { width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', shadowColor: '#F8C98C', shadowOpacity: 0.72, shadowRadius: 22, elevation: 12 },
  planetEmblem: { width: '94%', height: '94%' },
  planetConstellationHalo: { position: 'absolute', width: 148, height: 148, top: -7, alignSelf: 'center', opacity: 0.48 },
  planetCopy: { width: '60%', minHeight: 244, alignItems: 'center', justifyContent: 'center', position: 'relative', paddingHorizontal: 3 },
  planetCopyContent: { width: '100%', alignItems: 'center', zIndex: 2, paddingTop: 36, paddingBottom: 8 },
  planetConstellationCaption: { color: ASTRO_COLORS.cyan, fontSize: 8, lineHeight: 12, fontWeight: '900', letterSpacing: 0.8, textAlign: 'center', marginBottom: 4 },
  planetTitle: { color: ASTRO_COLORS.text, fontSize: 25, lineHeight: 30, textAlign: 'center', fontFamily: 'serif', fontWeight: '900', textShadowColor: '#1B0D45', textShadowRadius: 8 },
  heroTitle: { color: ASTRO_COLORS.text, fontSize: 31, lineHeight: 36, fontFamily: 'serif', fontWeight: '900', textShadowColor: '#1B0D45', textShadowRadius: 8 },
  heroDescription: { maxWidth: 430, color: '#F2ECF8', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6, textShadowColor: '#110A34', textShadowRadius: 5 },
  planetDescription: { maxWidth: 260, paddingHorizontal: 2, fontSize: 10, lineHeight: 15 },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 9 },
  themePill: { color: '#FFF2FB', fontSize: 8.5, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(17,10,55,0.48)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  constellationWrap: { width: '100%', maxWidth: 440, height: 205, alignItems: 'center', marginTop: 1, zIndex: 2 },
  constellationLabel: { position: 'absolute', top: 8, zIndex: 2, color: ASTRO_COLORS.cyan, fontSize: 8, fontWeight: '900', letterSpacing: 1.35 },
  constellation: { width: '100%', height: '100%', transform: [{ scale: 1.17 }] },
  placementPanel: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 'auto', zIndex: 2 },
  planetPlacementPanel: { marginTop: 12 },
  placementItem: { flex: 1, minWidth: 142, minHeight: 61, flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 16, backgroundColor: 'rgba(8,12,67,0.72)', borderWidth: 1, borderColor: 'rgba(255,220,178,0.3)' },
  placementIcon: { width: 30, height: 30, marginRight: 8 },
  placementCopy: { flex: 1 },
  placementLabel: { color: ASTRO_COLORS.cyan, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  placementValue: { color: ASTRO_COLORS.text, fontSize: 11, lineHeight: 16, fontWeight: '900', marginTop: 5 },
  emptyCard: { marginTop: 20, padding: 24, alignItems: 'center', gap: 10 },
  focusCard: { paddingVertical: 22, paddingHorizontal: 8, backgroundColor: 'rgba(31,23,93,0.92)', borderColor: 'rgba(201,167,255,0.5)' },
  focusGrid: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 14 },
  focusNote: { color: '#A8A6C5', fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 14, paddingHorizontal: 10 },
  influenceCard: { paddingHorizontal: 16, backgroundColor: 'rgba(31,23,93,0.92)' },
  influenceRow: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 11 },
  influenceBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)' },
  natureDot: { width: 10, height: 10, borderRadius: 5 },
  influenceCopy: { flex: 1 },
  influenceTitle: { color: ASTRO_COLORS.text, fontSize: 13, fontWeight: '800' },
  influenceBody: { color: '#BBB6D2', fontSize: 10, lineHeight: 15, marginTop: 4 },
  orbText: { color: ASTRO_COLORS.gold, fontSize: 11, fontWeight: '900' },
  noInfluence: { paddingVertical: 24, paddingHorizontal: 8, alignItems: 'center', gap: 10 },
  interpretationCard: { padding: 19, backgroundColor: ASTRO_COLORS.paper, borderColor: 'rgba(255,214,155,0.62)' },
  interpretationIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1C970', marginBottom: 12 },
  interpretationText: { color: '#33284B', fontSize: 14, lineHeight: 22 },
  houseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 15 },
  housePill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, backgroundColor: 'rgba(110,76,160,0.12)' },
  houseNumber: { color: '#6B418D', fontSize: 9, fontWeight: '900' },
  houseTopic: { color: '#433855', fontSize: 10, marginTop: 2 },
});
