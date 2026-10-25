import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import ThreeDButton from './ThreeDButton';
import { CalculatedIndicator } from '../services/numerologyEngine';
import {
  getIndicatorReading,
  getMatrixKnowledgeBundle,
  KnowledgeReadingResult,
  MatrixKnowledgeBundle,
} from '../services/numerologyKnowledge';
import {
  getArrowKnowledgeValue,
  getMatrixKnowledgeValue,
} from '../services/numerologyKnowledgeContract';
import {
  getFrequencyBand,
} from '../services/numerologyMatrixInterpretations';
import { useLocalization } from '../i18n/LocalizationContext';
import { formatIndicatorDisplayValue } from '../services/numerologyPresentation';

interface IndicatorDetailModalProps {
  visible: boolean;
  indicator: CalculatedIndicator | null;
  onClose: () => void;
}

export const IndicatorDetailModal: React.FC<IndicatorDetailModalProps> = ({
  visible,
  indicator,
  onClose,
}) => {
  const { locale, l, t } = useLocalization();
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState<KnowledgeReadingResult | null>(null);
  const [showFullArticle, setShowFullArticle] = useState(false);

  useEffect(() => {
    if (visible && indicator) {
      setLoading(true);
      setShowFullArticle(false);
      let active = true;
      setReading(null);
      getIndicatorReading(indicator.key, indicator.value, locale === 'en' ? indicator.nameEn : indicator.nameVi, locale)
        .then((res) => {
          if (active) setReading(res);
        })
        .catch((err) => {
          console.warn('[DetailModal] Load reading error:', err);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => { active = false; };
    } else {
      setReading(null);
    }
  }, [visible, indicator, locale]);

  if (!indicator) return null;
  const visibleReading = reading;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>#{indicator.number}</Text>
              </View>
              <Text style={styles.headerCategory}>{locale === 'en' ? indicator.categoryNameEn || 'Numerology' : indicator.categoryNameVi}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Card Hero Showcase */}
            <View style={styles.heroSection}>
              <View style={styles.cardImageFrame}>
                <Image source={indicator.image} style={styles.cardImage} resizeMode="cover" />
                <View style={styles.cardGlowOverlay} />
              </View>

              <View style={styles.titleInfo}>
                <Text style={styles.indicatorName}>{locale === 'en' ? indicator.nameEn : indicator.nameVi}</Text>
                {locale !== 'en' && <Text style={styles.indicatorNameEn}>{indicator.nameEn}</Text>}

                <View style={styles.valueRow}>
                  <Text style={styles.valueLabel}>{t(indicator.chartData ? 'reading.chartData' : 'reading.result')}</Text>
                  <View style={[styles.valuePill, indicator.isMaster && styles.valuePillMaster]}>
                    <Text style={[styles.valuePillText, indicator.isMaster && styles.valuePillTextMaster]}>
                      {formatIndicatorDisplayValue(indicator, locale)}
                    </Text>
                  </View>
                  {indicator.isMaster && (
                    <View style={styles.masterTag}>
                      <Text style={styles.masterTagText}>Master</Text>
                    </View>
                  )}
                </View>

                {/* Subtitle Description */}
                <Text style={styles.cardShortDesc}>{locale === 'en' ? indicator.descriptionEn || `A Pythagorean numerology reading for ${indicator.nameEn}.` : indicator.description}</Text>
              </View>
            </View>

            {indicator.chartData && (
              <ChartDataSection indicator={indicator} />
            )}

            {/* Tra Cứu Tri Thức Banner */}
            <View style={styles.knowledgeBanner}>
              <Text style={styles.knowledgeBannerText}>
                {visibleReading?.source === 'fallback' ? t('reading.fallbackLabel') : t('reading.reference')}
              </Text>
            </View>

            {/* Loading Indicator */}
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF8A3D" />
                <Text style={styles.loadingText}>{t('reading.loading')}</Text>
              </View>
            )}

            {/* Reading Content */}
            {!loading && visibleReading && (
              <View style={styles.readingContainer}>
                {/* 1. Bản Chất Cốt Lõi */}
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionHeading}>{t('reading.core')}</Text>
                  </View>
                  <Text style={styles.sectionBodyText}>{visibleReading.overview}</Text>
                </View>

                {/* 2. Điểm Mạnh */}
                {visibleReading.strengths.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionTitleRow}>
                      <Text style={styles.sectionHeading}>{t('reading.strengths')}</Text>
                    </View>
                    {visibleReading.strengths.map((s, idx) => (
                      <View key={`str-${idx}`} style={styles.bulletItem}>
                        <Text style={styles.bulletText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* 3. Thách Thức */}
                {visibleReading.challenges.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionTitleRow}>
                      <Text style={styles.sectionHeading}>{t('reading.challenges')}</Text>
                    </View>
                    {visibleReading.challenges.map((c, idx) => (
                      <View key={`cha-${idx}`} style={styles.bulletItem}>
                        <Text style={styles.bulletText}>{c}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* 4. Lời Khuyên */}
                {visibleReading.advice ? (
                  <View style={[styles.sectionBlock, styles.adviceBlock]}>
                    <View style={styles.sectionTitleRow}>
                      <Text style={[styles.sectionHeading, { color: '#FFC85A' }]}>
                        {t('reading.guidance')}
                      </Text>
                    </View>
                    <Text style={styles.adviceText}>{visibleReading.advice}</Text>
                  </View>
                ) : null}

                {/* 5. Toàn Văn Chi Tiết Sách Gốc (Tùy chọn mở rộng) */}
                {visibleReading.fullContent && visibleReading.fullContent.length > 300 && (
                  <View style={styles.fullArticleContainer}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setShowFullArticle(!showFullArticle);
                      }}
                      style={styles.expandArticleBtn}
                    >
                      <Text style={styles.expandArticleText}>{t(showFullArticle ? 'reading.source.collapse' : 'reading.source.expand')}</Text>
                    </TouchableOpacity>

                    {showFullArticle && (
                      <View style={styles.fullArticleBox}>
                        <Text style={styles.fullArticleContent}>
                          {renderNumberedListContent(visibleReading.fullContent)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            <View style={{ height: 36 }} />
          </ScrollView>

          {/* Footer Close Button */}
          <View style={styles.footerRow}>
            <ThreeDButton
              fullWidth
              label={t('reading.back')}
              onPress={() => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onClose(); }}
              shape="pill"
              variant="gold"
              textStyle={{ color: '#2A1405' }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const MATRIX_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function ChartDataSection({ indicator }: { indicator: CalculatedIndicator }) {
  const { locale, l, t } = useLocalization();
  const [selectedDigit, setSelectedDigit] = useState<number | null>(null);
  const [selectedArrowLabel, setSelectedArrowLabel] = useState<string | null>(null);
  const [dbReadings, setDbReadings] = useState<MatrixKnowledgeBundle>({});
  const [digitDbReadings, setDigitDbReadings] = useState<MatrixKnowledgeBundle>({});
  const chartData = indicator.chartData;

  useEffect(() => {
    let active = true;
    setDbReadings({});
    setDigitDbReadings({});
    setSelectedDigit(null);
    setSelectedArrowLabel(null);
    const birthIndicator = { ...indicator, key: 'birthChart', nameVi: 'Biểu đồ ngày sinh', nameEn: 'Birth Chart' };
    Promise.all([
      getMatrixKnowledgeBundle(indicator, locale),
      indicator.key === 'arrows' ? getMatrixKnowledgeBundle(birthIndicator, locale) : Promise.resolve(null),
    ]).then(([bundle, digits]) => {
      if (active) {
        setDbReadings(bundle);
        setDigitDbReadings(digits ?? bundle);
      }
    });
    return () => { active = false; };
  }, [indicator, locale]);

  if (!chartData) return null;

  const isArrows = indicator.key === 'arrows';
  const title = indicator.key === 'nameChart'
    ? l('Ma trận tần suất theo tên', 'Name Frequency Matrix')
    : indicator.key === 'birthChart' || isArrows
      ? l('Ma trận ngày sinh 3×3', '3×3 Birth Matrix')
      : l('Ma trận số 3×3', '3×3 Number Matrix');
  const statusLabels = {
    strong: l('Đủ bộ', 'Complete'),
    empty: l('Trống', 'Empty'),
    partial: l('Có một phần', 'Partial'),
  } as const;
  const pending = { summary: t('reading.loading'), strength: '', challenge: '', advice: '' };
  const resolveDigitReading = (number: number, count: number) => {
    const band = getFrequencyBand(count);
    return {
      ...(digitDbReadings[getMatrixKnowledgeValue(number, band)] ?? pending),
      theme: t('matrix.digitTheme', { digit: number }),
      bandLabel: t(`matrix.${band}`),
    };
  };
  const resolveArrowReading = (label: string, status: 'strong' | 'empty' | 'partial') => ({
    ...(dbReadings[getArrowKnowledgeValue(label, status)] ?? pending),
    theme: locale === 'en' ? `Arrow ${label}` : `Mũi tên ${label}`,
  });
  const selectedDigitReading = selectedDigit === null
    ? null
    : resolveDigitReading(selectedDigit, chartData.counts[selectedDigit] || 0);

  return (
    <View style={styles.chartSection}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionHeading}>{title}</Text>
      </View>
      <Text style={styles.chartHint}>{l('Số lớn là con số trong ma trận; chấm nhỏ thể hiện số lần xuất hiện.', 'The large digit identifies the matrix number; dots show how often it appears.')}</Text>
      <View style={styles.matrixGrid}>
        {MATRIX_ORDER.map((number) => {
          const count = chartData.counts[number] || 0;
          const reading = resolveDigitReading(number, count);
          const selected = selectedDigit === number;
          return (
            <TouchableOpacity
              key={number}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={l(`Số ${number}, ${count} lần, ${reading.bandLabel}`, `Number ${number}, ${count} occurrences, ${reading.bandLabel}`)}
              onPress={() => setSelectedDigit(selected ? null : number)}
              style={[
                styles.matrixCell,
                count > 0 && styles.matrixCellFilled,
                selected && styles.matrixCellSelected,
              ]}
            >
              <Text style={styles.matrixNumber}>{number}</Text>
              <View style={styles.matrixDots}>
                {count > 0 ? Array.from({ length: count }, (_, index) => (
                  <View key={`${number}-${index}`} style={styles.matrixDot} />
                )) : <Text style={styles.matrixEmpty}>—</Text>}
              </View>
              <Text style={styles.matrixCount}>{l(`${count} lần`, `${count}×`)}</Text>
              <Text style={styles.matrixBand}>{reading.bandLabel}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedDigit !== null && selectedDigitReading && (
        <InterpretationDetails
          title={l(`Số ${selectedDigit} · ${selectedDigitReading.theme}`, `Number ${selectedDigit} · ${selectedDigitReading.theme}`)}
          reading={selectedDigitReading}
        />
      )}

      {isArrows && chartData.arrows && (
        <View style={styles.arrowList}>
          <Text style={styles.arrowListTitle}>{l('Trạng thái 8 mũi tên', 'Eight Arrow Patterns')}</Text>
          {chartData.arrows.map((arrow) => {
            const reading = resolveArrowReading(arrow.label, arrow.status);
            const selected = selectedArrowLabel === arrow.label;
            return (
              <View key={arrow.label}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={locale === 'en'
                    ? `Arrow ${arrow.numbers.join('-')}, ${statusLabels[arrow.status]}, ${arrow.presentCount} of 3 numbers`
                    : `${arrow.label}, ${statusLabels[arrow.status]}, ${arrow.presentCount} trên 3 số`}
                  onPress={() => setSelectedArrowLabel(selected ? null : arrow.label)}
                  style={styles.arrowRow}
                >
                  <View style={styles.arrowRowCopy}>
                    <View style={styles.arrowRowHeading}>
                      <Text style={styles.arrowLabel}>{locale === 'en' ? `Arrow ${arrow.numbers.join('-')}` : arrow.label}</Text>
                      <Text style={[
                        styles.arrowStatus,
                        arrow.status === 'strong' && styles.arrowStatusStrong,
                        arrow.status === 'empty' && styles.arrowStatusEmpty,
                      ]}>
                        {statusLabels[arrow.status]} · {arrow.presentCount}/3
                      </Text>
                    </View>
                    <Text style={styles.arrowSummary}>{reading.summary}</Text>
                  </View>
                </TouchableOpacity>
                {selected && (
                  <InterpretationDetails
                    title={reading.theme}
                    reading={reading}
                    compact
                  />
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function InterpretationDetails({
  title,
  reading,
  compact = false,
}: {
  title: string;
  reading: { summary: string; strength: string; challenge: string; advice: string };
  compact?: boolean;
}) {
  const { l } = useLocalization();
  return (
    <View style={[styles.interpretationDetails, compact && styles.interpretationDetailsCompact]}>
      <Text style={styles.interpretationTitle}>{title}</Text>
      <Text style={styles.interpretationSummary}>{reading.summary}</Text>
      <Text style={styles.interpretationLabel}>{l('Điểm có thể phát huy', 'Strength to develop')}</Text>
      <Text style={styles.interpretationBody}>{reading.strength}</Text>
      <Text style={styles.interpretationLabel}>{l('Thử thách cần lưu ý', 'Challenge to notice')}</Text>
      <Text style={styles.interpretationBody}>{reading.challenge}</Text>
      <Text style={styles.interpretationLabel}>{l('Gợi ý phát triển', 'Growth suggestion')}</Text>
      <Text style={styles.interpretationBody}>{reading.advice}</Text>
    </View>
  );
}

function renderNumberedListContent(content: string): React.ReactNode[] {
  const numberedPrefix = /(^|\n)([ \t]*)(\d+[.)]?)(?=[ \t]|$)/gm;
  const segments: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = numberedPrefix.exec(content)) !== null) {
    const numberStart = match.index + match[1].length + match[2].length;
    segments.push(content.slice(lastIndex, numberStart));
    segments.push(
      <Text key={`number-${numberedPrefix.lastIndex}`} style={styles.numberedListNumber}>
        {match[3]}
      </Text>,
    );
    lastIndex = numberStart + match[3].length;
  }

  segments.push(content.slice(lastIndex));
  return segments;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 6, 24, 0.88)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#170F2E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#3A2C6B',
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#221845',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#3A2C6B',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  numberBadge: {
    backgroundColor: '#3A2A10',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 90, 0.35)',
  },
  numberBadgeText: {
    color: '#FFC85A',
    fontSize: 12,
    fontWeight: '700',
  },
  headerCategory: {
    color: '#B3A6D6',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2D1F55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#FF8A3D',
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '600',
  },
  scrollBody: {
    paddingHorizontal: 20,
  },
  heroSection: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 16,
    alignItems: 'flex-start',
  },
  cardImageFrame: {
    width: 105,
    height: 155,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#3A2C6B',
    backgroundColor: '#221845',
    elevation: 8,
    shadowColor: '#FF8A3D',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGlowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 138, 61, 0.04)',
  },
  titleInfo: {
    flex: 1,
  },
  indicatorName: {
    color: '#FFF3DC',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  indicatorNameEn: {
    color: '#B3A6D6',
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  valueLabel: {
    color: '#B3A6D6',
    fontSize: 13,
  },
  valuePill: {
    backgroundColor: '#3A2A10',
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 90, 0.55)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  valuePillMaster: {
    backgroundColor: '#3A2A10',
    borderColor: '#FFC85A',
  },
  valuePillText: {
    color: '#FFC85A',
    fontSize: 16,
    fontWeight: '800',
  },
  valuePillTextMaster: {
    color: '#FFC85A',
  },
  masterTag: {
    backgroundColor: '#3A2A10',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  masterTagText: {
    color: '#FFC85A',
    fontSize: 10,
    fontWeight: '700',
  },
  cardShortDesc: {
    color: '#B3A6D6',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  chartSection: {
    marginTop: 18,
    padding: 16,
    backgroundColor: '#221845',
    borderWidth: 1,
    borderColor: '#3A2C6B',
    borderRadius: 16,
  },
  chartHint: {
    color: '#B3A6D6',
    fontSize: 11,
    lineHeight: 16,
    marginTop: -4,
    marginBottom: 12,
  },
  matrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#3A2C6B',
  },
  matrixCell: {
    width: '33.3333%',
    minHeight: 78,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#170F2E',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#3A2C6B',
    paddingVertical: 7,
  },
  matrixCellFilled: {
    backgroundColor: '#221845',
  },
  matrixCellSelected: {
    backgroundColor: 'rgba(255, 138, 61, 0.16)',
    borderColor: '#FF8A3D',
  },
  matrixNumber: {
    color: '#FFC85A',
    fontSize: 16,
    fontWeight: '800',
  },
  matrixDots: {
    minHeight: 9,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 3,
    marginTop: 3,
  },
  matrixDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FF8A3D',
  },
  matrixEmpty: {
    color: '#B3A6D6',
    fontSize: 8,
    lineHeight: 9,
  },
  matrixCount: {
    color: '#E6DDF5',
    fontSize: 10,
    marginTop: 2,
  },
  matrixBand: {
    color: '#B3A6D6',
    fontSize: 9,
    marginTop: 2,
  },
  interpretationDetails: {
    marginTop: 12,
    padding: 13,
    borderRadius: 12,
    backgroundColor: '#2D1F55',
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 90, 0.35)',
    gap: 4,
  },
  interpretationDetailsCompact: {
    marginTop: 0,
    marginBottom: 8,
    marginLeft: 8,
  },
  interpretationTitle: {
    color: '#FFC85A',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 3,
  },
  interpretationSummary: {
    color: '#E6DDF5',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  interpretationLabel: {
    color: '#B3A6D6',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  interpretationBody: {
    color: '#E6DDF5',
    fontSize: 11,
    lineHeight: 16,
  },
  arrowList: {
    marginTop: 16,
  },
  arrowListTitle: {
    color: '#FFF3DC',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 7,
  },
  arrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#3A2C6B',
  },
  arrowRowCopy: {
    flex: 1,
  },
  arrowRowHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  arrowLabel: {
    color: '#E6DDF5',
    fontSize: 12,
    fontWeight: '600',
  },
  arrowStatus: {
    color: '#FFC85A',
    fontSize: 12,
    textAlign: 'right',
  },
  arrowStatusStrong: {
    color: '#FF8A3D',
  },
  arrowStatusEmpty: {
    color: '#FF8A3D',
  },
  arrowSummary: {
    color: '#B3A6D6',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
  knowledgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#221845',
    borderWidth: 1,
    borderColor: '#3A2C6B',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 18,
    marginBottom: 14,
  },
  knowledgeBannerText: {
    color: '#B3A6D6',
    fontSize: 11,
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#B3A6D6',
    fontSize: 13,
  },
  readingContainer: {
    gap: 14,
  },
  sectionBlock: {
    backgroundColor: '#221845',
    borderWidth: 1,
    borderColor: '#3A2C6B',
    borderRadius: 16,
    padding: 16,
  },
  adviceBlock: {
    backgroundColor: '#2D1F55',
    borderColor: 'rgba(255, 200, 90, 0.35)',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionHeading: {
    color: '#FFF3DC',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sectionBodyText: {
    color: '#E6DDF5',
    fontSize: 13.5,
    lineHeight: 21,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 6,
  },
  bulletText: {
    color: '#E6DDF5',
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  adviceText: {
    color: '#E6DDF5',
    fontSize: 13.5,
    lineHeight: 21,
    fontStyle: 'italic',
  },
  fullArticleContainer: {
    marginTop: 4,
  },
  expandArticleBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  expandArticleText: {
    color: '#FFC85A',
    fontSize: 12.5,
    fontWeight: '600',
  },
  fullArticleBox: {
    backgroundColor: '#170F2E',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#3A2C6B',
    marginTop: 8,
  },
  fullArticleContent: {
    color: '#E6DDF5',
    fontSize: 12,
    lineHeight: 18,
  },
  numberedListNumber: {
    fontWeight: '900',
  },
  footerRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#3A2C6B',
  },
});
