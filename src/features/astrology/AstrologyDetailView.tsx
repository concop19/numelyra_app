import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { DetectedAspect, NatalAspect } from '../../services/astro/aspectCalculator';
import type { PureAstroFeatureMetadata } from '../../services/astro/astroVectorEngine';
import { ASTROLOGY_BACKGROUNDS, CONSTELLATION_SVG, PLANET_PNG, PLANET_SVG, ZODIAC_PNG } from './astrologyArtwork';
import { EnergyScoreRing } from './EnergyScoreRing';
import { ASTRO_COLORS, AstrologyBackground, AstrologyHeader, MysticCard, SectionHeading, astrologyUiStyles } from './AstrologyUi';
import {
  HOUSE_INFO,
  buildPlanetPlacementInterpretation,
  buildTodayInterpretation,
  describeNatalAspect,
  describeTransitAspect,
  formatAspect,
  getActiveInfluences,
  getCelestialInfo,
  getEnergyFocus,
  getIncomingTransitAspects,
  getNatalAspectCounterpart,
  getNatalAspectsForPlanet,
  getOutgoingTransitAspects,
  getPlanetRuleInsights,
  getPrecisionMessage,
  planetLabel,
  resolveDetailConstellation,
  zodiacLabel,
  type AstrologyDetailTarget,
  type PlanetDetailMode,
  type PlanetId,
} from './astrologyPresentation';
import { useLocalization } from '../../i18n/LocalizationContext';

interface Props {
  target: AstrologyDetailTarget;
  metadata?: PureAstroFeatureMetadata;
  initialMode?: PlanetDetailMode;
  onBack(): void;
  onEditBirthData?(): void;
}

interface AspectDisplayItem {
  key: string;
  title: string;
  meta: string;
  description: string;
  nature: 'tension' | 'harmony' | 'neutral';
}

function natureColor(nature: AspectDisplayItem['nature']): string {
  if (nature === 'harmony') return '#5EEAD4';
  if (nature === 'tension') return ASTRO_COLORS.statusPink;
  return '#FBBF24';
}

function AspectList({ items, emptyText }: { items: AspectDisplayItem[]; emptyText: string }) {
  const { l } = useLocalization();
  return (
    <MysticCard style={styles.aspectCard}>
      {items.length > 0 ? items.map((item, index) => (
        <View key={item.key} style={[styles.aspectRow, index > 0 && styles.rowBorder]}>
          <View style={[styles.natureDot, { backgroundColor: natureColor(item.nature) }]} />
          <View style={styles.flexCopy}>
            <View style={styles.aspectTitleRow}>
              <Text style={styles.aspectTitle}>{item.title}</Text>
              {index === 0 && <Text style={styles.strongestBadge}>{l('NỔI BẬT NHẤT', 'STRONGEST')}</Text>}
            </View>
            <Text style={styles.aspectMeta}>{item.meta}</Text>
            <Text style={styles.aspectDescription}>{item.description}</Text>
          </View>
        </View>
      )) : (
        <View style={styles.noInfluence}>
          <Ionicons name="planet-outline" size={25} color="#A9A2CA" />
          <Text style={astrologyUiStyles.emptyText}>{emptyText}</Text>
        </View>
      )}
    </MysticCard>
  );
}

function transitAspectItems(aspects: DetectedAspect[], english = false): AspectDisplayItem[] {
  return aspects.map((aspect, index) => ({
    key: `${aspect.transitPlanet}-${aspect.natalPlanet}-${aspect.type}-${index}`,
    title: `${english ? aspect.transitPlanet : planetLabel(aspect.transitPlanet)} ${aspect.symbol} ${english ? aspect.natalPlanet : planetLabel(aspect.natalPlanet)}`,
    meta: english ? `${aspect.type} · actual angle ${aspect.actualAngle.toFixed(1)}° · orb ${aspect.orb.toFixed(1)}°` : `${aspect.nameVi} · góc thực tế ${aspect.actualAngle.toFixed(1)}° · orb ${aspect.orb.toFixed(1)}°`,
    description: english ? `Current ${aspect.transitPlanet} forms a ${aspect.type} with natal ${aspect.natalPlanet}.` : describeTransitAspect(aspect),
    nature: aspect.nature,
  }));
}

function natalAspectItems(aspects: NatalAspect[], selectedPlanet: PlanetId, english = false): AspectDisplayItem[] {
  return aspects.map((aspect, index) => {
    const counterpart = getNatalAspectCounterpart(aspect, selectedPlanet);
    return {
      key: `${aspect.planetA}-${aspect.planetB}-${aspect.type}-${index}`,
      title: `${english ? selectedPlanet : planetLabel(selectedPlanet)} ${aspect.symbol} ${english ? counterpart : planetLabel(counterpart)}`,
      meta: english ? `${aspect.type} · actual angle ${aspect.actualAngle.toFixed(1)}° · orb ${aspect.orb.toFixed(1)}°` : `${aspect.nameVi} · góc thực tế ${aspect.actualAngle.toFixed(1)}° · orb ${aspect.orb.toFixed(1)}°`,
      description: english ? `${selectedPlanet} forms a natal ${aspect.type} with ${counterpart}.` : describeNatalAspect(aspect),
      nature: aspect.nature,
    };
  });
}

function ModeSelector({ mode, onChange }: { mode: PlanetDetailMode; onChange(mode: PlanetDetailMode): void }) {
  const { l } = useLocalization();
  return (
    <View accessibilityRole="tablist" style={styles.modeSelector}>
      {([
        { id: 'natal' as const, label: l('Bản mệnh', 'Natal'), caption: l('Lúc sinh', 'At birth') },
        { id: 'transit' as const, label: l('Hiện tại', 'Current'), caption: l('Quá cảnh', 'Transit') },
      ]).map((item) => {
        const active = mode === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            activeOpacity={0.8}
            onPress={() => onChange(item.id)}
            style={[styles.modeButton, active && styles.modeButtonActive]}
          >
            {active && <LinearGradient colors={['rgba(145,102,246,0.94)', 'rgba(66,77,186,0.94)']} style={StyleSheet.absoluteFill} />}
            <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{item.label}</Text>
            <Text style={[styles.modeCaption, active && styles.modeCaptionActive]}>{item.caption}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function PlanetDetailView({
  planetId,
  metadata,
  initialMode = 'transit',
  onBack,
  onEditBirthData,
}: {
  planetId: PlanetId;
  metadata?: PureAstroFeatureMetadata;
  initialMode?: PlanetDetailMode;
  onBack(): void;
  onEditBirthData?(): void;
}) {
  const insets = useSafeAreaInsets();
  const { locale, l } = useLocalization();
  const [mode, setMode] = useState<PlanetDetailMode>(initialMode);
  const info = getCelestialInfo({ kind: 'planet', id: planetId });
  const placement = mode === 'natal'
    ? metadata?.natalPlanets.find((planet) => planet.name === planetId)
    : metadata?.transitPlanets.find((planet) => planet.name === planetId);
  const house = mode === 'natal'
    ? metadata?.natalContext?.planetHouses[planetId]
    : metadata?.dailyContext?.transitHouses[planetId];
  const constellationSign = resolveDetailConstellation({ kind: 'planet', id: planetId }, metadata, mode);
  const placementInterpretation = useMemo(
    () => buildPlanetPlacementInterpretation(planetId, placement?.sign, house, mode),
    [house, mode, placement?.sign, planetId]
  );
  const natalAspects = useMemo(() => metadata ? getNatalAspectsForPlanet(metadata, planetId) : [], [metadata, planetId]);
  const incomingAspects = useMemo(() => metadata ? getIncomingTransitAspects(metadata, planetId) : [], [metadata, planetId]);
  const outgoingAspects = useMemo(() => metadata ? getOutgoingTransitAspects(metadata, planetId) : [], [metadata, planetId]);
  const ruleInsights = useMemo(
    () => metadata ? getPlanetRuleInsights(metadata, planetId, mode) : [],
    [metadata, mode, planetId]
  );
  const houseInfo = house ? HOUSE_INFO[house] : undefined;
  const needsBirthData = !!metadata && metadata.birthDataPrecision !== 'complete';

  return (
    <AstrologyBackground variant="planetDetail">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[astrologyUiStyles.content, { paddingTop: insets.top + 6, paddingBottom: Math.max(38, insets.bottom + 26) }]}
      >
        <AstrologyHeader title={locale === 'en' ? info.id : info.nameVi} subtitle={mode === 'natal' ? l('Hành tinh · Bản mệnh', 'Planet · Natal') : l('Hành tinh · Hiện tại', 'Planet · Current')} onBack={onBack} />
        <ModeSelector mode={mode} onChange={setMode} />

        <View style={styles.planetHero}>
          <Image accessibilityElementsHidden contentFit="cover" priority="high" source={ASTROLOGY_BACKGROUNDS.planetDetail} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(8,12,47,0.02)', 'rgba(8,12,55,0.2)', 'rgba(8,10,48,0.86)']} locations={[0, 0.48, 1]} pointerEvents="none" style={StyleSheet.absoluteFill} />
          <View style={styles.planetHeroRow}>
            <View style={styles.planetArtStage}>
              <View pointerEvents="none" style={styles.planetAura} />
              <View style={styles.planetEmblemWrap}>
                <Image accessibilityLabel={`${l('Hành tinh', 'Planet')} ${locale === 'en' ? info.id : info.nameVi}`} contentFit="contain" source={PLANET_PNG[planetId]} style={styles.planetEmblem} />
              </View>
            </View>
            <View style={styles.planetCopy}>
              <Image accessibilityElementsHidden contentFit="contain" pointerEvents="none" source={CONSTELLATION_SVG[constellationSign]} style={styles.planetConstellationHalo} />
              <View style={styles.planetCopyContent}>
                <Text style={styles.planetConstellationCaption}>{mode === 'natal' ? 'VỊ TRÍ BẢN MỆNH' : 'VỊ TRÍ HIỆN TẠI'}</Text>
                <Text style={styles.planetTitle}>{locale === 'en' ? info.id : info.nameVi}</Text>
                <Text style={styles.planetSign}>{zodiacLabel(constellationSign)}</Text>
                <View style={styles.themeRow}>{info.themes.map((theme) => <Text key={theme} style={styles.themePill}>{theme}</Text>)}</View>
              </View>
            </View>
          </View>

          <View style={styles.singlePlacementPanel}>
            <Image contentFit="contain" source={PLANET_SVG[planetId]} style={styles.placementIcon} />
            <View style={styles.flexCopy}>
              <Text style={styles.placementLabel}>{mode === 'natal' ? 'BẢN MỆNH · LÚC SINH' : 'HIỆN TẠI · QUÁ CẢNH'}</Text>
              <Text style={styles.placementValue}>
                {placement ? `${zodiacLabel(placement.sign)} · ${placement.degreeInSign.toFixed(1)}°` : 'Chưa có dữ liệu vị trí'}
                {house ? ` · Nhà ${house}` : ''}
              </Text>
              {!!houseInfo && <Text style={styles.placementHouseNote}>{mode === 'transit' ? l('Đang đi qua', 'Transiting') : l('Thuộc', 'Located in')} {l('Nhà', 'House')} {house} {l('trong lá số của bạn', 'in your chart')}{locale === 'vi' ? ` · ${houseInfo.nameVi}` : ''}</Text>}
            </View>
          </View>
        </View>

        {!metadata ? (
          <MysticCard style={styles.emptyCard}>
            <Ionicons name="alert-circle-outline" size={26} color="#FFB0BE" />
            <Text style={astrologyUiStyles.emptyText}>{l('Chưa có dữ liệu lá số hợp lệ để hiển thị chi tiết hành tinh.', 'Valid birth-chart data is not available for planetary details.')}</Text>
          </MysticCard>
        ) : (
          <>
            {needsBirthData && (
              <TouchableOpacity accessibilityRole="button" activeOpacity={onEditBirthData ? 0.8 : 1} onPress={onEditBirthData} style={styles.precisionCard}>
                <Ionicons name="compass-outline" size={23} color={ASTRO_COLORS.cyan} />
                <View style={styles.flexCopy}>
                  <Text style={styles.precisionTitle}>{l('Chưa thể xác định nhà', 'House placement unavailable')}</Text>
                  <Text style={styles.precisionBody}>{getPrecisionMessage(metadata)}</Text>
                </View>
                {!!onEditBirthData && <View style={styles.completeButton}><Text style={styles.completeButtonText}>{l('Bổ sung', 'Add details')}</Text></View>}
              </TouchableOpacity>
            )}

            <SectionHeading title={mode === 'natal' ? 'Vị trí & năng lượng bản mệnh' : 'Vị trí & năng lượng hiện tại'} eyebrow={mode === 'natal' ? 'Natal Placement' : 'Transit Placement'} />
            <MysticCard style={styles.energyCard}>
              <View style={styles.energyHeader}>
                <Image contentFit="contain" source={PLANET_SVG[planetId]} style={styles.energyIcon} />
                <View style={styles.flexCopy}>
                  <Text style={styles.energyTitle}>{placement ? `${locale === 'en' ? info.id : info.nameVi} ${l('ở', 'in')} ${locale === 'en' ? placement.sign : zodiacLabel(placement.sign)}` : (locale === 'en' ? info.id : info.nameVi)}</Text>
                  <Text style={styles.energyMeta}>{houseInfo ? `${l('Nhà', 'House')} ${house}${locale === 'vi' ? ` · ${houseInfo.nameVi}` : ''}` : l('Nhà chưa xác định', 'House unavailable')}</Text>
                </View>
              </View>
              {placementInterpretation.map((paragraph, index) => (
                <View key={`${mode}-energy-${index}`} style={styles.energyParagraphRow}>
                  <View style={styles.energyBullet} />
                  <Text style={styles.energyParagraph}>{paragraph}</Text>
                </View>
              ))}
            </MysticCard>

            {ruleInsights.length > 0 && (
              <>
                <SectionHeading title={l('Điểm cần chú ý', 'Personal guidance')} eyebrow="Personal Guidance" />
                <View style={styles.ruleInsightList}>
                  {ruleInsights.map((insight) => (
                    <MysticCard key={insight.key} style={styles.ruleInsightCard}>
                      <View style={styles.ruleInsightHeader}>
                        <Ionicons name="git-branch-outline" size={17} color={ASTRO_COLORS.cyan} />
                        <Text style={styles.ruleInsightTitle}>{insight.title}</Text>
                      </View>
                      <View style={styles.ruleInsightRow}>
                        <Text style={styles.ruleInsightLabel}>{l('CẦN LƯU Ý', 'NOTICE')}</Text>
                        <Text style={styles.ruleInsightValue}>{insight.challenge}</Text>
                      </View>
                      <View style={styles.ruleAdviceBox}>
                        <Ionicons name="compass-outline" size={16} color="#5EEAD4" />
                        <Text style={styles.ruleAdviceText}>{insight.advice}</Text>
                      </View>
                    </MysticCard>
                  ))}
                </View>
              </>
            )}

            {mode === 'natal' ? (
              <>
                <SectionHeading title={l('Góc trong lá số', 'Natal aspects')} eyebrow="Natal Aspects" />
                <AspectList items={natalAspectItems(natalAspects, planetId, locale === 'en')} emptyText={l(`Không có góc chính nổi bật của ${info.nameVi} trong lá số bản mệnh.`, `No major natal aspect stands out for ${info.id}.`)} />
                <SectionHeading title={l('Tác động từ hiện tại', 'Incoming transits')} eyebrow="Incoming Transits" />
                <AspectList items={transitAspectItems(incomingAspects, locale === 'en')} emptyText={l(`Hiện không có hành tinh quá cảnh nào tạo góc chính với ${info.nameVi} bản mệnh trong orb đang dùng.`, `No current transit forms a major aspect with natal ${info.id} within the active orb.`)} />
              </>
            ) : (
              <>
                <SectionHeading title={l('Đang tác động lên bản mệnh', 'Outgoing transits')} eyebrow="Outgoing Transits" />
                <AspectList items={transitAspectItems(outgoingAspects, locale === 'en')} emptyText={l(`${info.nameVi} hiện không tạo góc chính với hành tinh bản mệnh nào trong orb đang dùng.`, `Current ${info.id} does not form a major aspect with a natal planet within the active orb.`)} />
              </>
            )}

          </>
        )}
      </ScrollView>
    </AstrologyBackground>
  );
}

function ZodiacDetailView({ target, metadata, onBack }: { target: Extract<AstrologyDetailTarget, { kind: 'sign' }>; metadata?: PureAstroFeatureMetadata; onBack(): void }) {
  const insets = useSafeAreaInsets();
  const { locale, l } = useLocalization();
  const info = getCelestialInfo(target);
  const influences = metadata ? getActiveInfluences(metadata, target) : [];
  const focus = metadata ? getEnergyFocus(metadata) : [];
  const constellationSign = resolveDetailConstellation(target, metadata);

  return (
    <AstrologyBackground variant="detail">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[astrologyUiStyles.content, { paddingTop: insets.top + 6, paddingBottom: Math.max(38, insets.bottom + 26) }]}>
        <AstrologyHeader title={l('Chi tiết năng lượng', 'Energy details')} subtitle={l('Cung hoàng đạo', 'Zodiac sign')} onBack={onBack} />
        <View style={styles.zodiacHero}>
          <Image accessibilityElementsHidden contentFit="cover" priority="high" source={ASTROLOGY_BACKGROUNDS.detail} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(8,12,67,0.04)', 'rgba(12,11,68,0.08)', 'rgba(8,12,67,0.52)']} locations={[0, 0.6, 1]} pointerEvents="none" style={StyleSheet.absoluteFill} />
          <View style={styles.zodiacHeroTop}>
            <Image accessibilityLabel={`${l('Biểu tượng', 'Symbol')} ${locale === 'en' ? info.id : info.nameVi}`} contentFit="contain" source={ZODIAC_PNG[target.id]} style={styles.zodiacEmblem} />
            <Text style={styles.zodiacTitle}>{locale === 'en' ? info.id : info.nameVi}</Text>
            {locale === 'vi' && <Text style={styles.zodiacDescription}>{info.description}</Text>}
            {locale === 'vi' && <View style={styles.themeRow}>{info.themes.map((theme) => <Text key={theme} style={styles.themePill}>{theme}</Text>)}</View>}
          </View>
          <View style={styles.constellationWrap}>
            <Text style={styles.constellationLabel}>{l('CHÒM SAO', 'CONSTELLATION')} {(locale === 'en' ? constellationSign : zodiacLabel(constellationSign)).toUpperCase()}</Text>
            <Image accessibilityLabel={`${l('Chòm sao', 'Constellation')} ${locale === 'en' ? constellationSign : zodiacLabel(constellationSign)}`} contentFit="contain" source={CONSTELLATION_SVG[constellationSign]} style={styles.constellation} />
          </View>
        </View>

        {!metadata ? (
          <MysticCard style={styles.emptyCard}>
            <Ionicons name="alert-circle-outline" size={26} color="#FFB0BE" />
            <Text style={astrologyUiStyles.emptyText}>{l('Chưa có dữ liệu lá số hợp lệ để hiển thị ảnh hưởng.', 'Valid chart data is not available for active influences.')}</Text>
          </MysticCard>
        ) : (
          <>
            <SectionHeading title={l('Trọng tâm năng lượng', 'Energy focus')} eyebrow="Energy Focus" />
            <MysticCard style={styles.focusCard}>
              <View style={styles.focusGrid}>{focus.map((item) => <EnergyScoreRing key={item.id} label={item.label} value={item.value} color={item.color} />)}</View>
              <Text style={styles.focusNote}>{l('Các tỷ lệ lấy trực tiếp từ điểm góc chiếu và nhịp hành tinh của engine.', 'Percentages are calculated from aspect scores and the current planetary rhythm.')}</Text>
            </MysticCard>
            <SectionHeading title={l('Ảnh hưởng đang hoạt động', 'Active influences')} eyebrow="Active Influences" />
            <MysticCard style={styles.legacyInfluenceCard}>
              {influences.length > 0 ? influences.map((aspect, index) => (
                <View key={`${aspect.transitPlanet}-${aspect.natalPlanet}-${aspect.type}`} style={[styles.legacyInfluenceRow, index > 0 && styles.rowBorder]}>
                  <View style={[styles.natureDot, { backgroundColor: natureColor(aspect.nature) }]} />
                  <View style={styles.flexCopy}>
                    <Text style={styles.aspectTitle}>{locale === 'en' ? aspect.transitPlanet : planetLabel(aspect.transitPlanet)} {aspect.symbol} {locale === 'en' ? aspect.natalPlanet : planetLabel(aspect.natalPlanet)}</Text>
                    <Text style={styles.aspectMeta}>{locale === 'en' ? `${aspect.type} · orb ${aspect.orb.toFixed(1)}°` : formatAspect(aspect)}</Text>
                  </View>
                  <Text style={styles.orbText}>{aspect.orb.toFixed(1)}°</Text>
                </View>
              )) : (
                <View style={styles.noInfluence}><Ionicons name="moon-outline" size={25} color="#A9A2CA" /><Text style={astrologyUiStyles.emptyText}>{l(`Không có góc chính nổi bật liên quan tới ${info.nameVi} trong dữ liệu hôm nay.`, `No major aspect related to ${info.id} stands out in today's data.`)}</Text></View>
              )}
            </MysticCard>
            <SectionHeading title={l('Luận giải hôm nay', "Today's interpretation")} eyebrow="Today's Interpretation" />
            <MysticCard style={styles.summaryCard}>
              <LinearGradient colors={[ASTRO_COLORS.paperLight, ASTRO_COLORS.paperDeep]} style={StyleSheet.absoluteFill} />
              <View style={styles.summaryIcon}><Ionicons name="sparkles" size={22} color="#35205D" /></View>
              <Text style={styles.summaryText}>{buildTodayInterpretation(metadata, target)}</Text>
              {!!metadata.dailyContext?.activatedHouses.length && (
                <View style={styles.houseRow}>{metadata.dailyContext.activatedHouses.map((activeHouse) => <View key={activeHouse.house} style={styles.housePill}><Text style={styles.houseNumber}>{l('Nhà', 'House')} {activeHouse.house}</Text>{locale === 'vi' && <Text style={styles.houseTopic}>{activeHouse.topicVi}</Text>}</View>)}</View>
              )}
            </MysticCard>
          </>
        )}
      </ScrollView>
    </AstrologyBackground>
  );
}

export function AstrologyDetailView({ target, metadata, initialMode, onBack, onEditBirthData }: Props) {
  if (target.kind === 'planet') {
    return <PlanetDetailView planetId={target.id} metadata={metadata} initialMode={initialMode} onBack={onBack} onEditBirthData={onEditBirthData} />;
  }
  return <ZodiacDetailView target={target} metadata={metadata} onBack={onBack} />;
}

const styles = StyleSheet.create({
  flexCopy: { flex: 1 },
  modeSelector: { flexDirection: 'row', gap: 8, marginTop: 7, marginBottom: 12, padding: 4, borderRadius: 20, backgroundColor: 'rgba(8,12,52,0.82)', borderWidth: 1, borderColor: 'rgba(201,167,255,0.32)' },
  modeButton: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16, overflow: 'hidden' },
  modeButtonActive: { borderWidth: 1, borderColor: 'rgba(255,226,171,0.48)' },
  modeLabel: { color: '#AAA6C7', fontSize: 13, fontWeight: '900' },
  modeLabelActive: { color: '#FFFFFF' },
  modeCaption: { color: '#777593', fontSize: 9, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 3 },
  modeCaptionActive: { color: '#FCE2AB' },
  planetHero: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 14, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(201,167,255,0.58)', overflow: 'hidden', shadowColor: '#B77CFF', shadowOpacity: 0.34, shadowRadius: 22, elevation: 7 },
  planetHeroRow: { width: '100%', minHeight: 230, flexDirection: 'row', alignItems: 'center', zIndex: 2 },
  planetArtStage: { width: '41%', minHeight: 208, alignItems: 'center', justifyContent: 'center' },
  planetAura: { position: 'absolute', width: 124, height: 124, borderRadius: 62, backgroundColor: 'rgba(167,111,255,0.2)', shadowColor: '#FFD69B', shadowOpacity: 0.74, shadowRadius: 28, elevation: 10 },
  planetEmblemWrap: { width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', shadowColor: '#F8C98C', shadowOpacity: 0.72, shadowRadius: 22, elevation: 12 },
  planetEmblem: { width: '94%', height: '94%' },
  planetCopy: { width: '59%', minHeight: 230, alignItems: 'center', justifyContent: 'center', position: 'relative', paddingHorizontal: 3 },
  planetConstellationHalo: { position: 'absolute', width: 150, height: 150, top: -1, alignSelf: 'center', opacity: 0.48 },
  planetCopyContent: { width: '100%', alignItems: 'center', zIndex: 2, paddingTop: 40, paddingBottom: 8 },
  planetConstellationCaption: { color: ASTRO_COLORS.cyan, fontSize: 8, lineHeight: 12, fontWeight: '900', letterSpacing: 0.9, textAlign: 'center', marginBottom: 4 },
  planetTitle: { color: ASTRO_COLORS.text, fontSize: 25, lineHeight: 30, textAlign: 'center', fontFamily: 'serif', fontWeight: '900', textShadowColor: '#1B0D45', textShadowRadius: 8 },
  planetSign: { color: '#F9DBA4', fontSize: 12, lineHeight: 18, textAlign: 'center', fontWeight: '800', marginTop: 4 },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 9 },
  themePill: { color: '#FFF2FB', fontSize: 8.5, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, backgroundColor: 'rgba(17,10,55,0.48)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  singlePlacementPanel: { width: '100%', minHeight: 76, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 18, backgroundColor: 'rgba(8,12,67,0.78)', borderWidth: 1, borderColor: 'rgba(255,220,178,0.32)', zIndex: 2 },
  placementIcon: { width: 36, height: 36, marginRight: 10 },
  placementLabel: { color: ASTRO_COLORS.cyan, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  placementValue: { color: ASTRO_COLORS.text, fontSize: 12, lineHeight: 17, fontWeight: '900', marginTop: 4 },
  placementHouseNote: { color: '#BAB5D3', fontSize: 9.5, lineHeight: 14, marginTop: 3 },
  precisionCard: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginTop: 14, borderRadius: 18, backgroundColor: 'rgba(13,31,75,0.9)', borderWidth: 1, borderColor: 'rgba(116,232,255,0.28)' },
  precisionTitle: { color: '#EFFBFF', fontSize: 12, fontWeight: '900' },
  precisionBody: { color: '#BDD0E1', fontSize: 9.5, lineHeight: 14, marginTop: 3 },
  completeButton: { minHeight: 35, paddingHorizontal: 11, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,214,124,0.14)' },
  completeButtonText: { color: ASTRO_COLORS.gold, fontSize: 9.5, fontWeight: '900' },
  energyCard: { padding: 17, backgroundColor: 'rgba(31,23,93,0.94)', borderColor: 'rgba(201,167,255,0.5)' },
  energyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 13, marginBottom: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.14)' },
  energyIcon: { width: 42, height: 42 },
  energyTitle: { color: ASTRO_COLORS.text, fontSize: 15, fontWeight: '900' },
  energyMeta: { color: ASTRO_COLORS.gold, fontSize: 10, lineHeight: 15, fontWeight: '800', marginTop: 3 },
  energyParagraphRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 12 },
  energyBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: ASTRO_COLORS.cyan, marginTop: 7 },
  energyParagraph: { flex: 1, color: '#D7D2E9', fontSize: 12, lineHeight: 19 },
  ruleInsightList: { gap: 10 },
  ruleInsightCard: { padding: 16, backgroundColor: 'rgba(20,57,88,0.7)', borderColor: 'rgba(113,231,255,0.3)' },
  ruleInsightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  ruleInsightTitle: { flex: 1, color: '#EAFBFF', fontSize: 13, fontWeight: '900' },
  ruleInsightRow: { paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)' },
  ruleInsightLabel: { color: '#7CEBFF', fontSize: 8.5, fontWeight: '900', letterSpacing: 0.9 },
  ruleInsightValue: { color: '#C6D6E5', fontSize: 11, lineHeight: 17, marginTop: 4 },
  ruleAdviceBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: 11, borderRadius: 13, backgroundColor: 'rgba(18,92,92,0.28)' },
  ruleAdviceText: { flex: 1, color: '#D7FFF8', fontSize: 11, lineHeight: 17, fontWeight: '700' },
  aspectCard: { paddingHorizontal: 16, backgroundColor: 'rgba(31,23,93,0.94)' },
  aspectRow: { minHeight: 112, flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 15 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)' },
  natureDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  aspectTitleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7 },
  aspectTitle: { color: ASTRO_COLORS.text, fontSize: 13, lineHeight: 18, fontWeight: '900' },
  strongestBadge: { color: '#2E2450', fontSize: 7.5, lineHeight: 16, fontWeight: '900', letterSpacing: 0.55, paddingHorizontal: 7, borderRadius: 8, backgroundColor: ASTRO_COLORS.gold, overflow: 'hidden' },
  aspectMeta: { color: '#C7BFDD', fontSize: 9.5, lineHeight: 14, marginTop: 4 },
  aspectDescription: { color: '#AFA9C9', fontSize: 10.5, lineHeight: 16, marginTop: 6 },
  noInfluence: { paddingVertical: 24, paddingHorizontal: 8, alignItems: 'center', gap: 10 },
  summaryCard: { padding: 19, backgroundColor: ASTRO_COLORS.paper, borderColor: 'rgba(255,214,155,0.62)' },
  summaryIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1C970', marginBottom: 12 },
  summaryText: { color: '#33284B', fontSize: 14, lineHeight: 22 },
  summaryFootnote: { color: '#71637E', fontSize: 9, lineHeight: 14, marginTop: 13, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(75,52,97,0.2)' },
  emptyCard: { marginTop: 20, padding: 24, alignItems: 'center', gap: 10 },
  zodiacHero: { marginTop: 12, minHeight: 520, alignItems: 'center', padding: 18, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,214,155,0.48)', overflow: 'hidden', shadowColor: '#7C51D6', shadowOpacity: 0.3, shadowRadius: 18, elevation: 7 },
  zodiacHeroTop: { width: '100%', alignItems: 'center', zIndex: 2 },
  zodiacEmblem: { width: 72, height: 72, marginTop: -4 },
  zodiacTitle: { color: ASTRO_COLORS.text, fontSize: 31, lineHeight: 36, fontFamily: 'serif', fontWeight: '900', textShadowColor: '#1B0D45', textShadowRadius: 8 },
  zodiacDescription: { maxWidth: 430, color: '#F2ECF8', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6, textShadowColor: '#110A34', textShadowRadius: 5 },
  constellationWrap: { width: '100%', maxWidth: 440, height: 205, alignItems: 'center', marginTop: 1, zIndex: 2 },
  constellationLabel: { position: 'absolute', top: 8, zIndex: 2, color: ASTRO_COLORS.cyan, fontSize: 8, fontWeight: '900', letterSpacing: 1.35 },
  constellation: { width: '100%', height: '100%', transform: [{ scale: 1.17 }] },
  focusCard: { paddingVertical: 22, paddingHorizontal: 8, backgroundColor: 'rgba(31,23,93,0.92)', borderColor: 'rgba(201,167,255,0.5)' },
  focusGrid: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 14 },
  focusNote: { color: '#A8A6C5', fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 14, paddingHorizontal: 10 },
  legacyInfluenceCard: { paddingHorizontal: 16, backgroundColor: 'rgba(31,23,93,0.92)' },
  legacyInfluenceRow: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 11 },
  orbText: { color: ASTRO_COLORS.gold, fontSize: 11, fontWeight: '900' },
  houseRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 15 },
  housePill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, backgroundColor: 'rgba(110,76,160,0.12)' },
  houseNumber: { color: '#6B418D', fontSize: 9, fontWeight: '900' },
  houseTopic: { color: '#433855', fontSize: 10, marginTop: 2 },
});
