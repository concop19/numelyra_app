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
          accessibilityLabel="Đóng giải mã"
          onPress={onClose}
        />
        <LinearGradient
          colors={['#0A1740', '#080D25', '#050716']}
          style={[styles.sheet, { paddingBottom: Math.max(18, insets.bottom + 8) }]}
        >
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.eyebrow}>GIẢI MÃ CHIÊM TINH</Text>
              <Text style={styles.sheetTitle}>{fortune?.title || 'Quẻ hôm nay'}</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Đóng"
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
            {fortune && (
              <>
                <View style={styles.insightCard}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="eye-outline" size={18} color="#A78BFA" />
                    <Text style={styles.sectionTitle}>Gương soi tâm trí</Text>
                  </View>
                  <Text style={styles.bodyText}>{fortune.mirror}</Text>
                </View>

                <View style={styles.insightCard}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="flash-outline" size={18} color="#5EEAD4" />
                    <Text style={styles.sectionTitle}>Kế sách bỏ túi</Text>
                  </View>
                  <Text style={styles.bodyText}>{fortune.advice}</Text>
                </View>
              </>
            )}

            {metadata && (
              <>
                <View style={styles.divider} />
                <Text style={styles.groupTitle}>Lá số bản mệnh</Text>
                <Text style={styles.groupDescription}>
                  Dựa trên ngày sinh {metadata.birthDate}
                  {metadata.birthTime ? ` lúc ${metadata.birthTime}` : ' với giờ sinh ước lượng'}.
                </Text>

                <View style={styles.dataGrid}>
                  <View style={styles.dataCard}>
                    <Text style={styles.dataLabel}>Mặt Trời bản mệnh</Text>
                    <Text style={styles.dataValue}>
                      {ZODIAC_VI[metadata.natalSunSign] || metadata.natalSunSign}
                    </Text>
                  </View>
                  <View style={styles.dataCard}>
                    <Text style={styles.dataLabel}>Mặt Trăng bản mệnh</Text>
                    <Text style={styles.dataValue}>
                      {ZODIAC_VI[metadata.natalMoonSign] || metadata.natalMoonSign}
                    </Text>
                  </View>
                  <View style={styles.dataCardWide}>
                    <Text style={styles.dataLabel}>Khí chất nổi trội</Text>
                    <Text style={styles.dataValue}>
                      {metadata.temperament.dominantElement} · {metadata.temperament.dominantModality}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />
                <Text style={styles.groupTitle}>Bầu trời hôm nay</Text>
                <Text style={styles.groupDescription}>{metadata.vibeSummary}</Text>

                <View style={styles.transitCard}>
                  <Text style={styles.dataLabel}>Mặt Trăng quá cảnh</Text>
                  <Text style={styles.dataValue}>
                    {ZODIAC_VI[metadata.transitMoonSign] || metadata.transitMoonSign}
                  </Text>
                </View>

                {metadata.topAspect && (
                  <View style={styles.aspectCard}>
                    <Text style={styles.aspectLabel}>Góc chiếu nổi bật</Text>
                    <Text style={styles.aspectFormula}>
                      {PLANET_VI[metadata.topAspect.transitPlanet] || metadata.topAspect.transitPlanet}
                      {' · '}{metadata.topAspect.nameVi}{' · '}
                      {PLANET_VI[metadata.topAspect.natalPlanet] || metadata.topAspect.natalPlanet}
                    </Text>
                    <Text style={styles.aspectMeta}>
                      Góc {metadata.topAspect.actualAngle.toFixed(0)}° · Sai số {metadata.topAspect.orb.toFixed(1)}°
                    </Text>
                  </View>
                )}

                <View style={styles.scoresCard}>
                  <ScoreBar label="Hài hòa" value={metadata.scores.harmony} color="#5EEAD4" />
                  <ScoreBar label="Thử thách" value={metadata.scores.tension} color="#FB7185" />
                  <ScoreBar label="Hội tụ" value={metadata.scores.conjunction} color="#FBBF24" />
                </View>
              </>
            )}

            {fortune?.anchorCaDao?.content && (
              <>
                <View style={styles.divider} />
                <Text style={styles.groupTitle}>Nhịp ca dao neo quẻ</Text>
                <View style={styles.verseCard}>
                  <Text style={styles.anchorVerse}>“{fortune.anchorCaDao.content}”</Text>
                  {!!fortune.anchorCaDao.category && (
                    <Text style={styles.anchorCategory}>{fortune.anchorCaDao.category}</Text>
                  )}
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
});
