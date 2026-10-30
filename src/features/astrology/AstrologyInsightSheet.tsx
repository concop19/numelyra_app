import React, { useEffect, useState, type ReactNode } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AstroFortuneSlip } from '../../services/astro/astroFortuneService';
import type { PureAstroFeatureMetadata } from '../../services/astro/astroVectorEngine';
import {
  buildTodayInterpretation,
  getAstrologyRuleTopicSummaries,
} from './astrologyPresentation';
import { ASTRO_COLORS } from './AstrologyUi';
import { useLocalization } from '../../i18n/LocalizationContext';
import {
  AstrologyEstimateMark,
  AstrologyEstimateNotice,
} from './AstrologyEstimateNotice';

const PLANET_VI: Record<string, string> = {
  Sun: 'Mặt Trời',
  Moon: 'Mặt Trăng',
  Mercury: 'Sao Thủy',
  Venus: 'Sao Kim',
  Mars: 'Sao Hỏa',
  Jupiter: 'Sao Mộc',
  Saturn: 'Sao Thổ',
  Uranus: 'Sao Thiên Vương',
  Neptune: 'Sao Hải Vương',
  Pluto: 'Sao Diêm Vương',
};

interface Props {
  visible: boolean;
  fortune: AstroFortuneSlip | null;
  metadata?: PureAstroFeatureMetadata;
  dataQuality?: {
    isEstimated: boolean;
    missingBirthTime: boolean;
    missingBirthLocation: boolean;
  };
  onClose(): void;
}

interface DisclosureProps {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  accent: string;
  open: boolean;
  onToggle(): void;
  children: ReactNode;
}

function DisclosureSection({
  title,
  icon,
  accent,
  open,
  onToggle,
  children,
}: DisclosureProps) {
  return (
    <View style={[styles.disclosure, open && styles.disclosureOpen]}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        activeOpacity={0.78}
        onPress={onToggle}
        style={styles.disclosureButton}
      >
        <View style={[styles.disclosureIcon, { borderColor: `${accent}66` }]}>
          <Ionicons name={icon} size={19} color={accent} />
        </View>
        <Text style={styles.disclosureTitle}>{title}</Text>
        <View style={styles.disclosureDivider} />
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={ASTRO_COLORS.lavender}
        />
      </TouchableOpacity>
      {open && <View style={styles.disclosureBody}>{children}</View>}
    </View>
  );
}

export function AstrologyInsightSheet({ visible, fortune, metadata, dataQuality, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { locale, l, t } = useLocalization();
  const [caDaoOpen, setCaDaoOpen] = useState(false);
  const [basisOpen, setBasisOpen] = useState(false);
  const [estimateNoticeOpen, setEstimateNoticeOpen] = useState(false);
  const ruleTopics = getAstrologyRuleTopicSummaries(metadata);

  useEffect(() => {
    if (!visible) {
      setCaDaoOpen(false);
      setBasisOpen(false);
      setEstimateNoticeOpen(false);
    }
  }, [visible]);

  const planetName = (value: string) => locale === 'en' ? value : (PLANET_VI[value] || value);
  const primaryAdvice = fortune?.advice
    ?? (metadata ? buildTodayInterpretation(metadata) : l(
      'Luận giải hôm nay đang được tổng hợp. Hãy quay lại sau ít phút.',
      'Today\'s reading is still being prepared. Please return in a few minutes.'
    ));
  const hasBasis = (!!metadata && !!fortune) || !!metadata?.topAspect || ruleTopics.length > 0;

  return (
    <>
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          accessibilityLabel={l('Đóng luận giải', 'Close astrology reading')}
          onPress={onClose}
        />

        <LinearGradient
          accessibilityViewIsModal
          colors={[ASTRO_COLORS.deep, ASTRO_COLORS.navy, '#050716']}
          locations={[0, 0.58, 1]}
          style={[styles.sheet, { paddingBottom: Math.max(12, insets.bottom + 4) }]}
        >
          <View pointerEvents="none" style={styles.headerOrbitLarge} />
          <View pointerEvents="none" style={styles.headerOrbitSmall} />
          <Text pointerEvents="none" style={[styles.decorativeStar, styles.starOne]}>✦</Text>
          <Text pointerEvents="none" style={[styles.decorativeStar, styles.starTwo]}>✧</Text>

          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>{l('LUẬN GIẢI HÔM NAY', "TODAY'S READING")}</Text>
              <Text numberOfLines={2} style={styles.sheetTitle}>
                {fortune?.title || l('Thông điệp từ bầu trời', 'A message from the sky')}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              hitSlop={8}
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={ASTRO_COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <LinearGradient
              colors={['rgba(50,31,116,0.96)', 'rgba(31,23,93,0.96)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.adviceCard}
            >
              <View pointerEvents="none" style={styles.adviceOrbit} />
              <Text pointerEvents="none" style={styles.adviceStar}>✦</Text>
              <View style={styles.cardHeadingRow}>
                <View style={styles.adviceIcon}>
                  <Ionicons name="compass-outline" size={19} color={ASTRO_COLORS.gold} />
                </View>
                <Text style={styles.adviceLabel}>
                  {l('ĐIỀU NÊN LÀM HÔM NAY', 'WHAT TO DO TODAY')}
                </Text>
              </View>
              <Text style={styles.adviceText}>{primaryAdvice}</Text>
            </LinearGradient>

            {!!fortune?.mirror && (
              <View style={styles.reflectionCard}>
                <LinearGradient
                  colors={['rgba(50,31,116,0.34)', 'rgba(12,11,68,0.18)']}
                  style={StyleSheet.absoluteFill}
                />
                <View pointerEvents="none" style={styles.reflectionGlow} />
                <View style={styles.sectionHeadingRow}>
                  <Ionicons name="sparkles" size={20} color={ASTRO_COLORS.pink} />
                  <Text style={styles.sectionHeading}>{l('Gương soi', 'Reflection')}</Text>
                </View>
                <Text style={styles.reflectionText}>{fortune.mirror}</Text>
              </View>
            )}

            {!!fortune?.verse && (
              <LinearGradient
                colors={[ASTRO_COLORS.paperLight, ASTRO_COLORS.paper, ASTRO_COLORS.paperDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.verseCard}
              >
                <View pointerEvents="none" style={styles.verseOrbitTop} />
                <View pointerEvents="none" style={styles.verseOrbitBottom} />
                <Text pointerEvents="none" style={styles.verseMoon}>☾</Text>
                <View style={styles.verseHeadingRow}>
                  <Ionicons name="sparkles-outline" size={19} color="#6A3A92" />
                  <Text style={styles.verseHeading}>{l('Bài thơ quẻ', "Today's verse")}</Text>
                </View>
                <View style={styles.verseRuleRow}>
                  <View style={styles.verseRule} />
                  <Text style={styles.verseRuleStar}>✦</Text>
                  <View style={styles.verseRule} />
                </View>
                <Text style={styles.fortuneVerse}>{fortune.verse}</Text>
                <View style={styles.verseFooterMark}>
                  <View style={styles.verseRule} />
                  <Text style={styles.verseRuleStar}>✦</Text>
                  <View style={styles.verseRule} />
                </View>
              </LinearGradient>
            )}

            {!!fortune?.anchorCaDao?.content && (
              <DisclosureSection
                title={l('Ca dao nguồn cảm hứng', 'Traditional verse inspiration')}
                icon="leaf-outline"
                accent={ASTRO_COLORS.cyan}
                open={caDaoOpen}
                onToggle={() => setCaDaoOpen((current) => !current)}
              >
                <View style={styles.anchorVerseRow}>
                  <Text style={styles.anchorVerse}>“{fortune.anchorCaDao.content}”</Text>
                  {dataQuality?.isEstimated && (
                    <AstrologyEstimateMark dark onPress={() => setEstimateNoticeOpen(true)} />
                  )}
                </View>
                {!!fortune.anchorCaDao.category && (
                  <Text style={styles.anchorCategory}>{fortune.anchorCaDao.category}</Text>
                )}
                {!!fortune.anchorCaDao.matchReason && (
                  <Text style={styles.anchorReason}>{fortune.anchorCaDao.matchReason}</Text>
                )}
              </DisclosureSection>
            )}

            {hasBasis && (
              <DisclosureSection
                title={l('Vì sao có luận giải này?', 'Why this reading?')}
                icon="help-outline"
                accent={ASTRO_COLORS.gold}
                open={basisOpen}
                onToggle={() => setBasisOpen((current) => !current)}
              >
                {!!metadata && !!fortune && (
                  <View style={styles.basisSummary}>
                    <Text style={styles.basisEyebrow}>{l('BỨC TRANH HÔM NAY', "TODAY'S SKY")}</Text>
                    <Text style={styles.basisText}>{buildTodayInterpretation(metadata)}</Text>
                  </View>
                )}

                {!!metadata?.topAspect && (
                  <View style={styles.aspectRow}>
                    <View style={styles.aspectIcon}>
                      <Ionicons name="git-branch-outline" size={16} color={ASTRO_COLORS.cyan} />
                    </View>
                    <View style={styles.flexCopy}>
                      <Text style={styles.aspectLabel}>{l('Góc chiếu nổi bật', 'Leading aspect')}</Text>
                      <Text style={styles.aspectFormula}>
                        {planetName(metadata.topAspect.transitPlanet)} · {locale === 'en' ? metadata.topAspect.type : metadata.topAspect.nameVi} · {planetName(metadata.topAspect.natalPlanet)}
                      </Text>
                      <Text style={styles.aspectMeta}>
                        {l('Sai số', 'Orb')} {metadata.topAspect.orb.toFixed(1)}°
                      </Text>
                    </View>
                  </View>
                )}

                {ruleTopics.map((topic) => (
                  <View key={topic.key} style={styles.ruleTopic}>
                    <Text style={styles.ruleTopicTitle}>{topic.title}</Text>
                    <Text style={styles.ruleTopicExperience}>{topic.experience}</Text>
                    <View style={styles.ruleAdviceRow}>
                      <Ionicons name="compass-outline" size={15} color={ASTRO_COLORS.gold} />
                      <Text style={styles.ruleAdviceText}>{topic.advice}</Text>
                    </View>
                  </View>
                ))}
              </DisclosureSection>
            )}

            <Text style={styles.disclaimer}>
              {l(
                'Nội dung mang tính tham khảo và hỗ trợ bạn tự quan sát.',
                'This content is for reflection and general guidance.'
              )}
            </Text>
          </ScrollView>
        </LinearGradient>
      </View>
    </Modal>
    <AstrologyEstimateNotice
      visible={estimateNoticeOpen}
      missingBirthTime={dataQuality?.missingBirthTime ?? false}
      missingBirthLocation={dataQuality?.missingBirthLocation ?? false}
      onClose={() => setEstimateNoticeOpen(false)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 3, 16, 0.74)',
  },
  sheet: {
    width: '100%',
    maxWidth: 560,
    height: '92%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(201,167,255,0.72)',
    overflow: 'hidden',
    shadowColor: '#7A55FF',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 18,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(214,189,255,0.46)',
    alignSelf: 'center',
    marginTop: 10,
    zIndex: 3,
  },
  headerOrbitLarge: {
    position: 'absolute',
    right: -42,
    top: 34,
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(255,214,155,0.17)',
  },
  headerOrbitSmall: {
    position: 'absolute',
    right: 4,
    top: 67,
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1,
    borderColor: 'rgba(143,214,255,0.14)',
  },
  decorativeStar: { position: 'absolute', color: ASTRO_COLORS.gold, zIndex: 1 },
  starOne: { right: 126, top: 70, fontSize: 13, opacity: 0.8 },
  starTwo: { right: 38, top: 142, fontSize: 17, opacity: 0.55 },
  sheetHeader: {
    minHeight: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(201,167,255,0.20)',
    zIndex: 2,
  },
  headerCopy: { flex: 1, minWidth: 0, paddingRight: 14 },
  eyebrow: {
    color: ASTRO_COLORS.cyan,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.9,
  },
  sheetTitle: {
    color: ASTRO_COLORS.text,
    fontSize: 26,
    lineHeight: 32,
    fontFamily: 'serif',
    fontWeight: '800',
    marginTop: 5,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31,23,93,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(201,167,255,0.66)',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 26,
    gap: 12,
  },
  adviceCard: {
    position: 'relative',
    minHeight: 164,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1.25,
    borderColor: ASTRO_COLORS.gold,
    overflow: 'hidden',
  },
  adviceOrbit: {
    position: 'absolute',
    right: -45,
    bottom: -55,
    width: 175,
    height: 175,
    borderRadius: 88,
    borderWidth: 1,
    borderColor: 'rgba(255,214,155,0.22)',
  },
  adviceStar: {
    position: 'absolute',
    right: 35,
    top: 36,
    color: ASTRO_COLORS.gold,
    fontSize: 17,
    opacity: 0.72,
  },
  cardHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  adviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,214,155,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,214,155,0.50)',
  },
  adviceLabel: {
    flex: 1,
    color: ASTRO_COLORS.gold,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
    letterSpacing: 1.05,
  },
  adviceText: {
    color: ASTRO_COLORS.text,
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '600',
    marginTop: 16,
    paddingRight: 8,
  },
  reflectionCard: {
    position: 'relative',
    minHeight: 142,
    padding: 18,
    borderRadius: 22,
    backgroundColor: 'rgba(31,23,93,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(201,167,255,0.58)',
    overflow: 'hidden',
  },
  reflectionGlow: {
    position: 'absolute',
    right: -34,
    bottom: -52,
    width: 145,
    height: 145,
    borderRadius: 73,
    backgroundColor: 'rgba(249,183,221,0.10)',
  },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionHeading: {
    color: ASTRO_COLORS.text,
    fontFamily: 'serif',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
  },
  reflectionText: {
    color: ASTRO_COLORS.muted,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 12,
    paddingRight: 4,
  },
  verseCard: {
    position: 'relative',
    minHeight: 238,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,245,204,0.72)',
    overflow: 'hidden',
  },
  verseOrbitTop: {
    position: 'absolute',
    right: -46,
    top: -44,
    width: 145,
    height: 145,
    borderRadius: 73,
    borderWidth: 1,
    borderColor: 'rgba(106,58,146,0.18)',
  },
  verseOrbitBottom: {
    position: 'absolute',
    left: -55,
    bottom: -70,
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(106,58,146,0.13)',
  },
  verseMoon: {
    position: 'absolute',
    right: 25,
    top: 20,
    color: '#6A3A92',
    fontSize: 33,
    opacity: 0.32,
  },
  verseHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  verseHeading: {
    color: ASTRO_COLORS.paperText,
    fontFamily: 'serif',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
  },
  verseRuleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  verseFooterMark: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  verseRule: { width: 45, height: 1, backgroundColor: 'rgba(106,58,146,0.30)' },
  verseRuleStar: { color: '#9D5B91', fontSize: 13 },
  fortuneVerse: {
    color: ASTRO_COLORS.paperText,
    fontFamily: 'serif',
    fontSize: 17,
    fontStyle: 'italic',
    fontWeight: '700',
    lineHeight: 27,
    textAlign: 'center',
    marginTop: 12,
  },
  disclosure: {
    borderRadius: 18,
    backgroundColor: 'rgba(31,23,93,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(201,167,255,0.40)',
    overflow: 'hidden',
  },
  disclosureOpen: { borderColor: 'rgba(201,167,255,0.66)' },
  disclosureButton: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 11,
  },
  disclosureIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,12,67,0.52)',
    borderWidth: 1,
  },
  disclosureTitle: {
    flex: 1,
    color: ASTRO_COLORS.lavender,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },
  disclosureDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: 'rgba(214,189,255,0.28)',
  },
  disclosureBody: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(201,167,255,0.18)',
    gap: 10,
  },
  anchorVerseRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginTop: 12,
  },
  anchorVerse: {
    flex: 1,
    color: ASTRO_COLORS.text,
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 24,
  },
  anchorCategory: {
    color: ASTRO_COLORS.cyan,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '900',
  },
  anchorReason: { color: '#C9C1E0', fontSize: 12, lineHeight: 19 },
  basisSummary: {
    padding: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(8,12,67,0.58)',
    marginTop: 12,
  },
  basisEyebrow: {
    color: ASTRO_COLORS.cyan,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 1.15,
  },
  basisText: { color: '#DADAF0', fontSize: 13, lineHeight: 21, marginTop: 7 },
  aspectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(8,12,67,0.44)',
  },
  aspectIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(138,229,234,0.10)',
  },
  flexCopy: { flex: 1 },
  aspectLabel: {
    color: ASTRO_COLORS.cyan,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  aspectFormula: { color: ASTRO_COLORS.text, fontSize: 12, lineHeight: 18, fontWeight: '800', marginTop: 5 },
  aspectMeta: { color: '#B8ADD2', fontSize: 10, lineHeight: 14, marginTop: 3 },
  ruleTopic: {
    padding: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(8,12,67,0.44)',
  },
  ruleTopicTitle: { color: ASTRO_COLORS.pink, fontSize: 12, lineHeight: 17, fontWeight: '900' },
  ruleTopicExperience: { color: '#DADAF0', fontSize: 12, lineHeight: 19, marginTop: 6 },
  ruleAdviceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 9 },
  ruleAdviceText: { flex: 1, color: '#FFF0C7', fontSize: 12, lineHeight: 19, fontWeight: '700' },
  disclaimer: {
    color: '#8F89AA',
    fontSize: 9,
    lineHeight: 14,
    textAlign: 'center',
    paddingHorizontal: 18,
    marginTop: 2,
  },
});
