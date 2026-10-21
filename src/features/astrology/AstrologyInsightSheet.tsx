import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AstroFortuneSlip } from '../../services/astro/astroFortuneService';
import type { PureAstroFeatureMetadata } from '../../services/astro/astroVectorEngine';
import { longitudeToZodiac } from '../../services/astro/astroEngine';
import {
  buildTodayInterpretation,
  getAstrologyRuleTopicSummaries,
} from './astrologyPresentation';
import { useLocalization } from '../../i18n/LocalizationContext';

const ZODIAC_VI: Record<string, string> = {
  Aries: 'Bạch Dương ♈',
  Taurus: 'Kim Ngưu ♉',
  Gemini: 'Song Tử ♊',
  Cancer: 'Cự Giải ♋',
  Leo: 'Sư Tử ♌',
  Virgo: 'Xử Nữ ♍',
  Libra: 'Thiên Bình ♎',
  Scorpio: 'Bọ Cạp ♏',
  Sagittarius: 'Nhân Mã ♐',
  Capricorn: 'Ma Kết ♑',
  Aquarius: 'Bảo Bình ♒',
  Pisces: 'Song Ngư ♓',
};

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
  onClose(): void;
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  const percent = Math.round(value * 100);
  return (
    <View style={styles.scoreBlock}>
      <View style={styles.scoreHeader}>
        <Text style={styles.scoreLabel}>{label}</Text>
        <Text style={[styles.scoreValue, { color }]}>{percent}%</Text>
      </View>
      <View style={styles.scoreTrack}>
        <View style={[styles.scoreFill, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export function AstrologyInsightSheet({ visible, fortune, metadata, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { locale, t, l } = useLocalization();
  const ruleTopics = getAstrologyRuleTopicSummaries(metadata);
  const zodiacName = (value: string) => locale === 'en' ? value : (ZODIAC_VI[value] || value);
  const planetName = (value: string) => locale === 'en' ? value : (PLANET_VI[value] || value);

  return (
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
          accessibilityLabel={l('Đóng giải mã', 'Close astrology reading')}
          onPress={onClose}
        />
        <LinearGradient
          colors={['#0A1740', '#080D25', '#050716']}
          style={[styles.sheet, { paddingBottom: Math.max(18, insets.bottom + 8) }]}
        >
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.eyebrow}>{l('GIẢI MÃ CHIÊM TINH', 'ASTROLOGY READING')}</Text>
              <Text style={styles.sheetTitle}>{fortune?.title || l('Quẻ hôm nay', "Today's reading")}</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={23} color="#E7F7FF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {metadata && (
              <View style={styles.interpretationCard}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="sparkles" size={18} color="#FBBF24" />
                  <Text style={styles.sectionTitle}>{l('Luận giải hôm nay', "Today's interpretation")}</Text>
                </View>
                <Text style={styles.bodyText}>{buildTodayInterpretation(metadata)}</Text>
              </View>
            )}

            {fortune && (
              <>
                <View style={styles.fortuneVerseCard}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="sparkles-outline" size={18} color="#FBBF24" />
                    <Text style={styles.sectionTitle}>{l('Bài thơ quẻ hôm nay', "Today's verse")}</Text>
                  </View>
                  <Text style={styles.fortuneVerse}>{fortune.verse}</Text>
                </View>

                {!!fortune.anchorCaDao?.content && (
                  <View style={styles.verseCard}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons name="musical-notes-outline" size={17} color="#71E7FF" />
                      <Text style={styles.sectionTitle}>{l('Ca dao gieo nhịp', 'Traditional verse')}</Text>
                    </View>
                    <Text style={styles.anchorVerse}>“{fortune.anchorCaDao.content}”</Text>
                    {!!fortune.anchorCaDao.category && (
                      <Text style={styles.anchorCategory}>{fortune.anchorCaDao.category}</Text>
                    )}
                    {!!fortune.anchorCaDao.matchReason && (
                      <Text style={styles.anchorReason}>{fortune.anchorCaDao.matchReason}</Text>
                    )}
                  </View>
                )}

                <View style={styles.insightCard}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="eye-outline" size={18} color="#A78BFA" />
                    <Text style={styles.sectionTitle}>{l('Gương soi tâm trí', 'Reflection')}</Text>
                  </View>
                  <Text style={styles.bodyText}>{fortune.mirror}</Text>
                </View>

                <View style={styles.insightCard}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="flash-outline" size={18} color="#5EEAD4" />
                    <Text style={styles.sectionTitle}>{l('Kế sách bỏ túi', 'Practical guidance')}</Text>
                  </View>
                  <Text style={styles.bodyText}>{fortune.advice}</Text>
                </View>
              </>
            )}

            {ruleTopics.length > 0 && (
              <View style={styles.ruleSection}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="git-branch-outline" size={18} color="#7CEBFF" />
                  <Text style={styles.sectionTitle}>{l('Căn cứ luận giải', 'Reading basis')}</Text>
                </View>
                <Text style={styles.ruleIntro}>
                  Các chủ đề nổi bật được chọn từ dữ liệu lá số và bầu trời hôm nay.
                </Text>
                {ruleTopics.map((topic) => (
                  <View key={topic.key} style={styles.ruleTopicCard}>
                    <Text style={styles.ruleTopicTitle}>{topic.title}</Text>
                    <Text style={styles.bodyText}>{topic.experience}</Text>
                    <View style={styles.ruleAdviceRow}>
                      <Ionicons name="compass-outline" size={15} color="#5EEAD4" />
                      <Text style={styles.ruleAdviceText}>{topic.advice}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {metadata && (
              <>
                <View style={styles.divider} />
                <Text style={styles.groupTitle}>{l('Lá số bản mệnh', 'Natal chart')}</Text>
                <Text style={styles.groupDescription}>
                  Dựa trên ngày sinh {metadata.birthDate}
                  {metadata.birthTime ? ` lúc ${metadata.birthTime}` : ' với giờ sinh ước lượng'}
                  {metadata.birthDataPrecision === 'complete'
                    ? ' và múi giờ nơi sinh.'
                    : '. Bổ sung nơi sinh cùng giờ sinh chính xác để mở khóa ASC/MC và 12 nhà.'}
                </Text>

                <View style={styles.dataGrid}>
                  <View style={styles.dataCard}>
                    <Text style={styles.dataLabel}>{l('Mặt Trời bản mệnh', 'Natal Sun')}</Text>
                    <Text style={styles.dataValue}>
                      {zodiacName(metadata.natalSunSign)}
                    </Text>
                  </View>
                  <View style={styles.dataCard}>
                    <Text style={styles.dataLabel}>{l('Mặt Trăng bản mệnh', 'Natal Moon')}</Text>
                    <Text style={styles.dataValue}>
                      {zodiacName(metadata.natalMoonSign)}
                    </Text>
                  </View>
                  <View style={styles.dataCardWide}>
                    <Text style={styles.dataLabel}>{l('Khí chất nổi trội', 'Dominant temperament')}</Text>
                    <Text style={styles.dataValue}>
                      {metadata.temperament.dominantElement} · {metadata.temperament.dominantModality}
                    </Text>
                  </View>
                </View>

                {metadata.natalContext && (
                  <View style={styles.houseCard}>
                    <View style={styles.houseHeader}>
                      <Ionicons name="compass-outline" size={18} color="#7CEBFF" />
                      <Text style={styles.houseTitle}>{l('Trục lá số', 'Chart axis')} · Porphyry</Text>
                    </View>
                    <View style={styles.axisRow}>
                      <View style={styles.axisItem}>
                        <Text style={styles.dataLabel}>{l('Cung Mọc', 'Ascendant')} (ASC)</Text>
                        <Text style={styles.dataValue}>
                          {zodiacName(longitudeToZodiac(metadata.natalContext.angles.ascendant).sign)}
                        </Text>
                      </View>
                      <View style={styles.axisItem}>
                        <Text style={styles.dataLabel}>{l('Thiên Đỉnh', 'Midheaven')} (MC)</Text>
                        <Text style={styles.dataValue}>
                          {zodiacName(longitudeToZodiac(metadata.natalContext.angles.midheaven).sign)}
                        </Text>
                      </View>
                    </View>
                    {!!metadata.dailyContext?.activatedHouses.length && (
                      <View style={styles.activatedRow}>
                        {metadata.dailyContext.activatedHouses.map((house) => (
                          <View key={house.house} style={styles.housePill}>
                            <Text style={styles.housePillNumber}>{l('Nhà', 'House')} {house.house}</Text>
                            {locale === 'vi' && <Text style={styles.housePillTopic}>{house.topicVi}</Text>}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.divider} />
                <Text style={styles.groupTitle}>{l('Bầu trời hôm nay', "Today's sky")}</Text>
                <Text style={styles.groupDescription}>{metadata.vibeSummary}</Text>

                <View style={styles.transitCard}>
                  <Text style={styles.dataLabel}>{l('Mặt Trăng quá cảnh', 'Transit Moon')}</Text>
                  <Text style={styles.dataValue}>
                    {zodiacName(metadata.transitMoonSign)}
                  </Text>
                </View>

                {metadata.topAspect && (
                  <View style={styles.aspectCard}>
                    <Text style={styles.aspectLabel}>{l('Góc chiếu nổi bật', 'Leading aspect')}</Text>
                    <Text style={styles.aspectFormula}>
                      {planetName(metadata.topAspect.transitPlanet)}
                      {' · '}{locale === 'en' ? metadata.topAspect.type : metadata.topAspect.nameVi}{' · '}
                      {planetName(metadata.topAspect.natalPlanet)}
                    </Text>
                    <Text style={styles.aspectMeta}>
                      Góc {metadata.topAspect.actualAngle.toFixed(0)}° · Sai số {metadata.topAspect.orb.toFixed(1)}°
                    </Text>
                  </View>
                )}

                <View style={styles.scoresCard}>
                  <ScoreBar label={l('Hài hòa', 'Harmony')} value={metadata.scores.harmony} color="#5EEAD4" />
                  <ScoreBar label={l('Thử thách', 'Tension')} value={metadata.scores.tension} color="#FB7185" />
                  <ScoreBar label={l('Hội tụ', 'Conjunction')} value={metadata.scores.conjunction} color="#FBBF24" />
                </View>
              </>
            )}

          </ScrollView>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 3, 16, 0.66)',
  },
  sheet: {
    height: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(104, 220, 255, 0.42)',
    overflow: 'hidden',
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(190, 232, 255, 0.48)',
    alignSelf: 'center',
    marginTop: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(126, 216, 255, 0.24)',
  },
  eyebrow: {
    color: '#71E7FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  sheetTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontFamily: 'serif',
    marginTop: 3,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(85, 164, 217, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(152, 225, 255, 0.25)',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 34,
    gap: 12,
  },
  insightCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 44, 91, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(131, 183, 255, 0.22)',
  },
  fortuneVerseCard: {
    padding: 17,
    borderRadius: 18,
    backgroundColor: 'rgba(74, 47, 112, 0.66)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  fortuneVerse: {
    color: '#FFF4CF',
    fontFamily: 'serif',
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  interpretationCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(72, 49, 118, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.24)',
  },
  ruleSection: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(20, 57, 88, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(113, 231, 255, 0.24)',
    gap: 10,
  },
  ruleIntro: {
    color: '#AFC3D9',
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4,
  },
  ruleTopicCard: {
    padding: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(9, 24, 58, 0.62)',
    gap: 7,
  },
  ruleTopicTitle: {
    color: '#7CEBFF',
    fontSize: 13,
    fontWeight: '900',
  },
  ruleAdviceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    paddingTop: 2,
  },
  ruleAdviceText: {
    flex: 1,
    color: '#CFFCF4',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#F4F7FF',
    fontWeight: '800',
    fontSize: 14,
  },
  bodyText: {
    color: '#D5E0F2',
    fontSize: 14,
    lineHeight: 22,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(111, 205, 255, 0.25)',
    marginVertical: 8,
  },
  groupTitle: {
    color: '#77E8FF',
    fontSize: 16,
    fontWeight: '800',
  },
  groupDescription: {
    color: '#AFC3D9',
    fontSize: 13,
    lineHeight: 20,
  },
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dataCard: {
    width: '48%',
    minHeight: 82,
    padding: 13,
    borderRadius: 15,
    backgroundColor: 'rgba(37, 54, 103, 0.55)',
  },
  dataCardWide: {
    width: '100%',
    padding: 13,
    borderRadius: 15,
    backgroundColor: 'rgba(37, 54, 103, 0.55)',
  },
  dataLabel: {
    color: '#9EB4CC',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  dataValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 7,
  },
  transitCard: {
    padding: 14,
    borderRadius: 15,
    backgroundColor: 'rgba(25, 74, 111, 0.48)',
  },
  houseCard: {
    width: '100%',
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(18, 58, 91, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(113, 231, 255, 0.22)',
  },
  houseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  houseTitle: {
    color: '#DDF9FF',
    fontSize: 13,
    fontWeight: '800',
  },
  axisRow: {
    flexDirection: 'row',
    gap: 10,
  },
  axisItem: {
    flex: 1,
  },
  activatedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 13,
  },
  housePill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(80, 162, 196, 0.18)',
  },
  housePillNumber: {
    color: '#7CEBFF',
    fontSize: 10,
    fontWeight: '900',
  },
  housePillTopic: {
    color: '#E8F6FC',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  aspectCard: {
    padding: 15,
    borderRadius: 16,
    backgroundColor: 'rgba(73, 53, 119, 0.48)',
    borderWidth: 1,
    borderColor: 'rgba(193, 156, 255, 0.2)',
  },
  aspectLabel: {
    color: '#C4A7FF',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  aspectFormula: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 7,
  },
  aspectMeta: {
    color: '#B5A9CE',
    fontSize: 12,
    marginTop: 5,
  },
  scoresCard: {
    padding: 15,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 30, 70, 0.72)',
    gap: 12,
  },
  scoreBlock: {
    gap: 6,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreLabel: {
    color: '#C8D5E6',
    fontSize: 12,
    fontWeight: '700',
  },
  scoreValue: {
    fontSize: 12,
    fontWeight: '900',
  },
  scoreTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 3,
  },
  verseCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 30, 70, 0.66)',
    borderLeftWidth: 2,
    borderLeftColor: '#71E7FF',
  },
  anchorVerse: {
    color: '#E3ECF8',
    fontFamily: 'serif',
    fontStyle: 'italic',
    fontSize: 14,
    lineHeight: 22,
  },
  anchorCategory: {
    color: '#71E7FF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
  },
  anchorReason: {
    color: '#AFC3D9',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
  },
});
