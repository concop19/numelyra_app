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
import { AstroRichText } from './AstroRichText';
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
  planetThemes,
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
            <AstroRichText text={item.description} style={styles.aspectDescription} />
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
    description: describeTransitAspect(aspect, english ? 'en' : 'vi'),
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
      description: describeNatalAspect(aspect, english ? 'en' : 'vi'),
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
    () => buildPlanetPlacementInterpretation(planetId, placement?.sign, house, mode, locale),
    [house, locale, mode, placement?.sign, planetId]
  );
  const natalAspects = useMemo(() => metadata ? getNatalAspectsForPlanet(metadata, planetId) : [], [metadata, planetId]);
  const incomingAspects = useMemo(() => metadata ? getIncomingTransitAspects(metadata, planetId) : [], [metadata, planetId]);
  const outgoingAspects = useMemo(() => metadata ? getOutgoingTransitAspects(metadata, planetId) : [], [metadata, planetId]);
  const ruleInsights = useMemo(
    () => metadata ? getPlanetRuleInsights(metadata, planetId, mode, locale) : [],
    [locale, metadata, mode, planetId]
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
          <View style={styles.planetHeroRow}>
            <View style={styles.planetArtStage}>
              {planetId !== 'Moon' && <View pointerEvents="none" style={styles.planetAura} />}
              <View style={styles.planetEmblemWrap}>
                <Image accessibilityLabel={`${l('Hành tinh', 'Planet')} ${locale === 'en' ? info.id : info.nameVi}`} contentFit="contain" source={PLANET_PNG[planetId]} style={styles.planetEmblem} />
              </View>
            </View>
            <View style={styles.planetCopy}>
              <Image accessibilityElementsHidden contentFit="contain" pointerEvents="none" source={CONSTELLATION_SVG[constellationSign]} style={styles.planetConstellationHalo} />
              <View style={styles.planetCopyContent}>
              <Text style={styles.planetConstellationCaption}>{mode === 'natal' ? l('VỊ TRÍ BẢN MỆNH', 'NATAL POSITION') : l('VỊ TRÍ HIỆN TẠI', 'CURRENT POSITION')}</Text>
                <Text style={styles.planetTitle}>{locale === 'en' ? info.id : info.nameVi}</Text>
                <Text style={styles.planetSign}>
                  {locale === 'en' ? constellationSign : getCelestialInfo({ kind: 'sign', id: constellationSign }).nameVi}{' '}
                  <Text style={styles.planetSignSymbol}>
                    {getCelestialInfo({ kind: 'sign', id: constellationSign }).symbol}
                  </Text>
                </Text>
                <View style={styles.themeRow}>
                  {planetThemes(planetId, locale).map((theme, index) => (
                    <View key={theme} style={styles.themePill}>
                      <Ionicons
                        name={index === 0 ? 'heart-outline' : index === 1 ? 'git-branch-outline' : 'shield-checkmark-outline'}
                        size={12}
                        color="#D9CAFF"
                      />
                      <Text style={styles.themePillText}>{theme}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.singlePlacementPanel}>
            <Image contentFit="contain" source={PLANET_SVG[planetId]} style={styles.placementIcon} />
            <View style={styles.placementDivider} />
            <View style={styles.flexCopy}>
              <Text style={styles.placementLabel}>{mode === 'natal' ? l('BẢN MỆNH · LÚC SINH', 'NATAL · AT BIRTH') : l('HIỆN TẠI · QUÁ CẢNH', 'CURRENT · TRANSIT')}</Text>
              <Text style={styles.placementValue}>
                {placement ? `${zodiacLabel(placement.sign, locale)} · ${placement.degreeInSign.toFixed(1)}°` : l('Chưa có dữ liệu vị trí', 'Position data unavailable')}
                {house ? ` · ${l('Nhà', 'House')} ${house}` : ''}
              </Text>
              {!!houseInfo && (
                <AstroRichText
                  text={`${mode === 'transit' ? l('Đang đi qua', 'Transiting') : l('Thuộc', 'Located in')} ${l('Nhà', 'House')} ${house} ${l('trong lá số của bạn', 'in your chart')}${locale === 'vi' ? ` · ${houseInfo.nameVi}` : ''}`}
                  style={styles.placementHouseNote}
                />
              )}
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
                  <Text style={styles.precisionBody}>{getPrecisionMessage(metadata, locale)}</Text>
                </View>
                {!!onEditBirthData && <View style={styles.completeButton}><Text style={styles.completeButtonText}>{l('Bổ sung', 'Add details')}</Text></View>}
              </TouchableOpacity>
            )}

            <SectionHeading title={mode === 'natal' ? l('Vị trí & năng lượng bản mệnh', 'Natal placement and energy') : l('Vị trí & năng lượng hiện tại', 'Current placement and energy')} eyebrow={mode === 'natal' ? 'Natal Placement' : 'Transit Placement'} />
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
                  <AstroRichText text={paragraph} style={styles.energyParagraph} />
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
                        <AstroRichText text={insight.challenge} style={styles.ruleInsightValue} />
                      </View>
                      <View style={styles.ruleAdviceBox}>
                        <Ionicons name="compass-outline" size={16} color="#5EEAD4" />
                        <AstroRichText text={insight.advice} style={styles.ruleAdviceText} />
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
              <AstroRichText theme="light" text={buildTodayInterpretation(metadata, target)} style={styles.summaryText} />
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
  planetHero: { paddingHorizontal: 8, paddingTop: 10, paddingBottom: 8 },
  planetHeroRow: { width: '100%', minHeight: 290, flexDirection: 'row', alignItems: 'center', zIndex: 2 },
  planetArtStage: { width: '55%', minHeight: 290, alignItems: 'center', justifyContent: 'center' },
  planetAura: { position: 'absolute', width: 124, height: 124, borderRadius: 62, backgroundColor: 'rgba(167,111,255,0.2)', shadowColor: '#FFD69B', shadowOpacity: 0.74, shadowRadius: 28, elevation: 10 },
  planetEmblemWrap: { width: '120%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  planetEmblem: { width: '94%', height: '94%' },
  planetCopy: { width: '45%', minHeight: 290, alignItems: 'center', justifyContent: 'center', position: 'relative', paddingHorizontal: 3 },
  planetConstellationHalo: { position: 'absolute', width: 146, height: 146, top: 8, alignSelf: 'center', opacity: 0.48 },
  planetCopyContent: { width: '100%', alignItems: 'center', zIndex: 2, paddingTop: 62, paddingBottom: 8 },
  planetConstellationCaption: { color: ASTRO_COLORS.cyan, fontSize: 8, lineHeight: 12, fontWeight: '900', letterSpacing: 0.9, textAlign: 'center', marginBottom: 4 },
  planetTitle: { color: ASTRO_COLORS.text, fontSize: 29, lineHeight: 34, textAlign: 'center', fontFamily: 'serif', fontWeight: '900', textShadowColor: '#1B0D45', textShadowRadius: 8 },
  planetSign: { color: '#F9DBA4', fontSize: 12, lineHeight: 18, textAlign: 'center', fontWeight: '800', marginTop: 4 },
  planetSignSymbol: { color: '#D9B4FF', fontSize: 14 },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 12 },
  themePill: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 16, backgroundColor: 'rgba(17,10,55,0.58)', borderWidth: 1, borderColor: 'rgba(201,167,255,0.38)' },
  themePillText: { color: '#FFF2FB', fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },
  singlePlacementPanel: { width: '100%', minHeight: 88, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 22, backgroundColor: 'rgba(8,12,67,0.82)', borderWidth: 1, borderColor: 'rgba(201,167,255,0.4)', zIndex: 2 },
  placementIcon: { width: 50, height: 50, marginRight: 10 },
  placementDivider: { width: 1, alignSelf: 'stretch', marginRight: 14, backgroundColor: 'rgba(201,167,255,0.32)' },
  placementLabel: { color: '#A99BFF', fontSize: 9, fontWeight: '900', letterSpacing: 1.25 },
  placementValue: { color: ASTRO_COLORS.text, fontSize: 14, lineHeight: 19, fontWeight: '900', marginTop: 4 },
  placementHouseNote: { color: '#C7C2DD', fontSize: 11, lineHeight: 16, marginTop: 4 },
  precisionCard: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginTop: 14, borderRadius: 18, backgroundColor: 'rgba(13,31,75,0.9)', borderWidth: 1, borderColor: 'rgba(116,232,255,0.28)' },
  precisionTitle: { color: '#EFFBFF', fontSize: 12, fontWeight: '900' },
  precisionBody: { color: '#BDD0E1', fontSize: 9.5, lineHeight: 14, marginTop: 3 },
  completeButton: { minHeight: 35, paddingHorizontal: 11, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,214,124,0.14)' },
  completeButtonText: { color: ASTRO_COLORS.gold, fontSize: 9.5, fontWeight: '900' },
  energyCard: { padding: 17, backgroundColor: 'rgba(31,23,93,0.94)', borderColor: 'rgba(201,167,255,0.5)' },
  energyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 13, marginBottom: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.14)' },
  energyIcon: { width: 42, height: 42 },
  energyTitle: { color: ASTRO_COLORS.text, fontSize: 15, fontWeight: '900' },
  energyMeta: { color: ASTRO_COLORS.gold, fontSize: 11, lineHeight: 16, fontWeight: '800', marginTop: 3 },
  energyParagraphRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 14 },
  energyBullet: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: ASTRO_COLORS.cyan, marginTop: 7 },
  energyParagraph: { flex: 1, color: '#DDD7F0', fontSize: 13, lineHeight: 21 },
  ruleInsightList: { gap: 10 },
  ruleInsightCard: { padding: 16, backgroundColor: 'rgba(20,57,88,0.7)', borderColor: 'rgba(113,231,255,0.3)' },
  ruleInsightHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  ruleInsightTitle: { flex: 1, color: '#EAFBFF', fontSize: 13, fontWeight: '900' },
  ruleInsightRow: { paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)' },
  ruleInsightLabel: { color: '#7CEBFF', fontSize: 8.5, fontWeight: '900', letterSpacing: 0.9 },
  ruleInsightValue: { color: '#D4E2EE', fontSize: 12, lineHeight: 18.5, marginTop: 5 },
  ruleAdviceBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: 11, borderRadius: 13, backgroundColor: 'rgba(18,92,92,0.28)' },
  ruleAdviceText: { flex: 1, color: '#E4FFF9', fontSize: 12, lineHeight: 18.5, fontWeight: '700' },
  aspectCard: { paddingHorizontal: 16, backgroundColor: 'rgba(31,23,93,0.94)' },
  aspectRow: { minHeight: 112, flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 15 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)' },
  natureDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  aspectTitleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7 },
  aspectTitle: { color: ASTRO_COLORS.text, fontSize: 13.5, lineHeight: 19, fontWeight: '900' },
  strongestBadge: { color: '#2E2450', fontSize: 7.5, lineHeight: 16, fontWeight: '900', letterSpacing: 0.55, paddingHorizontal: 7, borderRadius: 8, backgroundColor: ASTRO_COLORS.gold, overflow: 'hidden' },
  aspectMeta: { color: '#C7BFDD', fontSize: 10, lineHeight: 15, marginTop: 4 },
  aspectDescription: { color: '#D4CEE8', fontSize: 12, lineHeight: 18.5, marginTop: 6 },
  noInfluence: { paddingVertical: 24, paddingHorizontal: 8, alignItems: 'center', gap: 10 },
  summaryCard: { padding: 19, backgroundColor: ASTRO_COLORS.paper, borderColor: 'rgba(255,214,155,0.62)' },
  summaryIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1C970', marginBottom: 12 },
  summaryText: { color: '#2B1E43', fontSize: 14, lineHeight: 23 },
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
