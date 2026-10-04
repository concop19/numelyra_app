/**
 * AstrologyScreen.tsx
 * Màn hình Lá Thăm Chiêm Tinh Dân Gian Hôm Nay
 * Tối giản, thanh lịch, tinh tế: Tự động tải hoặc bốc quẻ từ Backend (Gemini)
 * và lưu trữ trực tiếp tại thiết bị (AsyncStorage) theo ngày.
 *
 * Mở rộng: Accordion giải mã căn nguyên chiêm tinh:
 * 1. Ngày sinh / giờ sinh (Lá số bản mệnh)
 * 2. Bầu trời quá cảnh hôm nay (Transit)
 * 3. Bộ 32 chỉ số vector lượng hóa
 * 4. Khuôn nhịp ca dao neo điệu tạo ra quẻ
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { UserProfile } from '../store/userProfile';
import {
  generatePureAstroVector,
  PureAstroFeatureMetadata,
} from '../services/astro/astroVectorEngine';
import {
  requestAstroFortuneSlip,
  AstroFortuneSlip,
} from '../services/astro/astroFortuneService';

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
  profile?: UserProfile | null;
}

export default function AstrologyScreen({ profile }: Props) {
  const [fortune, setFortune] = useState<AstroFortuneSlip | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const todayKey = new Date().toISOString().slice(0, 10);
  const storageKey = `@astro_fortune_${todayKey}_${profile?.fullName || 'guest'}`;

  // 1. Tải quẻ đã lưu trong ngày từ AsyncStorage
  const loadStoredFortune = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as AstroFortuneSlip;
        // Bổ sung metadata chiêm tinh nếu cache cũ chưa lưu
        if (!parsed.astroMetadata) {
          const astroData = generatePureAstroVector(
            {
              birthDate: profile?.birthDate || '1998-10-20',
              birthTime: profile?.birthTime || undefined,
              fullName: profile?.fullName || 'Đương số',
            },
            new Date()
          );
          parsed.astroMetadata = astroData.metadata;
        }
        setFortune(parsed);
        return true;
      }
    } catch {
      // Bỏ qua lỗi đọc cache
    }
    return false;
  }, [profile?.birthDate, profile?.birthTime, profile?.fullName, storageKey]);

  // 2. Bốc quẻ mới từ backend và lưu vào AsyncStorage
  const fetchNewFortune = useCallback(
    async (mode: 'daily' | 'random' = 'daily') => {
      setLoading(true);
      setError(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      try {
        // Trích xuất metadata chiêm tinh ngầm từ ngày sinh
        const birthDate = profile?.birthDate || '1998-10-20';
        const birthTime = profile?.birthTime || undefined;
        const astroData = generatePureAstroVector(
          { birthDate, birthTime, fullName: profile?.fullName || 'Đương số' },
          new Date()
        );

        // Gọi Backend Gemini
        const result = await requestAstroFortuneSlip({
          astroMetadata: astroData.metadata,
          caDaoMode: mode,
        });

        // Đảm bảo metadata được đính kèm để giải thích căn nguyên
        result.astroMetadata = astroData.metadata;

        setFortune(result);
        // Lưu trữ lại ở Local theo ngày
        await AsyncStorage.setItem(storageKey, JSON.stringify(result));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch (err) {
        console.error('[AstrologyScreen] Fetch fortune error:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể kết nối máy chủ chiêm tinh. Vui lòng thử lại!'
        );
      } finally {
        setLoading(false);
      }
    },
    [profile?.birthDate, profile?.birthTime, profile?.fullName, storageKey]
  );

  // Khi mở màn hình: Kiểm tra nếu đã có quẻ hôm nay thì hiện luôn, nếu chưa thì tự động bốc quẻ
  useEffect(() => {
    loadStoredFortune().then((hasStored) => {
      if (!hasStored) {
        fetchNewFortune('daily');
      }
    });
  }, [loadStoredFortune, fetchNewFortune]);

  // Chia sẻ lá thăm
  const handleShare = async () => {
    if (!fortune) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const shareText = `📜 LÁ THĂM CHIÊM TINH HÔM NAY: ${fortune.title || 'Quẻ Xăm Dân Gian'}\n\n${fortune.verse}\n\n🪞 Gương soi: ${fortune.mirror}\n🎒 Kế sách: ${fortune.advice}\n\n✨ Bốc quẻ chiêm tinh dân gian trên Numelyra.`;
    try {
      await Share.share({
        message: shareText,
        title: fortune.title || 'Lá Thăm Chiêm Tinh',
      });
    } catch {
      // Người dùng huỷ share
    }
  };

  const formattedDate = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Metadata chiêm tinh phục vụ giải mã căn nguyên
  const meta: PureAstroFeatureMetadata | undefined =
    fortune?.astroMetadata ||
    (fortune
      ? generatePureAstroVector(
          {
            birthDate: profile?.birthDate || '1998-10-20',
            birthTime: profile?.birthTime || undefined,
            fullName: profile?.fullName || 'Đương số',
          },
          new Date()
        ).metadata
      : undefined);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Chiêm Tinh Dân Gian</Text>
          <Text style={styles.headerSubtitle}>{formattedDate}</Text>
        </View>

        <TouchableOpacity
          style={styles.refreshIconButton}
          onPress={() => fetchNewFortune('random')}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Ionicons
            name="dice-outline"
            size={22}
            color={loading ? '#6B7280' : '#F59E0B'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading State */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text style={styles.loadingTitle}>Đang lắc ống xăm...</Text>
            <Text style={styles.loadingSubtitle}>
              Lắng nghe nhịp điệu sao trời và hồn cốt ca dao dân gian
            </Text>
          </View>
        )}

        {/* Error State */}
        {!loading && error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={44} color="#EF4444" />
            <Text style={styles.errorTitle}>Chưa thể gieo quẻ lúc này</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchNewFortune('daily')}
              activeOpacity={0.8}
            >
              <Ionicons name="reload-outline" size={18} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Gieo lại quẻ</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main Fortune Card */}
        {!loading && fortune && (
          <View style={styles.cardContainer}>
            {/* Viền sáng & Nền thẻ mô phỏng Giấy Dó Neo-Folk */}
            <LinearGradient
              colors={['#1F1D2B', '#16131F', '#0D0B12']}
              style={styles.fortuneCard}
            >
              {/* Thẻ bài Triện Đỏ / Tiêu đề quẻ */}
              <View style={styles.stampBadge}>
                <Text style={styles.stampBadgeText}>QUẺ XĂM HÔM NAY</Text>
              </View>

              <Text style={styles.cardTitle}>
                {fortune.title || 'Quẻ Xăm Thế Sự'}
              </Text>

              {/* Họa tiết Ngăn cách */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Ionicons name="sparkles" size={14} color="#F59E0B" />
                <View style={styles.dividerLine} />
              </View>

              {/* TẦNG 1: THƠ ĐỒNG DAO THẾ SỰ */}
              <View style={styles.verseBox}>
                <Text style={styles.verseText}>{fortune.verse}</Text>
              </View>

              {/* TẦNG 2: GƯƠNG SOI TÂM TRÍ */}
              <View style={styles.insightSection}>
                <View style={styles.insightHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: '#312E81' }]}>
                    <Ionicons name="eye-outline" size={16} color="#A78BFA" />
                  </View>
                  <Text style={styles.insightLabel}>Gương soi tâm trí</Text>
                </View>
                <Text style={styles.insightBody}>{fortune.mirror}</Text>
              </View>

              {/* TẦNG 3: KẾ SÁCH BỎ TÚI */}
              <View style={styles.insightSection}>
                <View style={styles.insightHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: '#064E3B' }]}>
                    <Ionicons name="flash-outline" size={16} color="#34D399" />
                  </View>
                  <Text style={styles.insightLabel}>Kế sách bỏ túi</Text>
                </View>
                <Text style={styles.insightBody}>{fortune.advice}</Text>
              </View>

              {/* NÚT DROPDOWN: VÌ SAO RA QUẺ NÀY? (GIẢI MÃ CĂN NGUYÊN) */}
              <TouchableOpacity
                style={[
                  styles.explainAccordionButton,
                  showExplanation && styles.explainAccordionButtonActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setShowExplanation(!showExplanation);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.explainAccordionButtonLeft}>
                  <Ionicons
                    name={showExplanation ? 'compass' : 'compass-outline'}
                    size={17}
                    color="#F59E0B"
                  />
                  <Text style={styles.explainAccordionButtonText}>
                    {showExplanation
                      ? 'Thu gọn giải mã căn nguyên'
                      : 'Vì sao ra quẻ này? (Giải mã Chiêm tinh)'}
                  </Text>
                </View>
                <Ionicons
                  name={showExplanation ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#F59E0B"
                />
              </TouchableOpacity>

              {/* NỘI DUNG GIẢI MÃ CĂN NGUYÊN CHIÊM TINH */}
              {showExplanation && meta && (
                <View style={styles.explanationBox}>
                  {/* Lời dẫn căn nguyên */}
                  <View style={styles.explainCallout}>
                    <Ionicons name="sparkles" size={16} color="#FBBF24" />
                    <Text style={styles.explainCalloutText}>
                      Quẻ không sinh ra ngẫu nhiên. Đây là sự giao thoa khoa học giữa{' '}
                      <Text style={styles.boldHighlight}>Lá số bản mệnh</Text>,{' '}
                      <Text style={styles.boldHighlight}>Bầu trời hôm nay (Transit)</Text>, và{' '}
                      <Text style={styles.boldHighlight}>Bộ 32 chỉ số vector</Text> được tính toán từ thiên văn học.
                    </Text>
                  </View>

                  {/* 1. LÁ SỐ BẢN MỆNH CỦA BẠN */}
                  <View style={styles.explainCard}>
                    <View style={styles.explainCardHeader}>
                      <View style={[styles.stepNumberBadge, { backgroundColor: '#5B21B6' }]}>
                        <Text style={styles.stepNumberText}>1</Text>
                      </View>
                      <Text style={styles.explainCardTitle}>Lá số bản mệnh (Ngày & Giờ sinh)</Text>
                    </View>
                    <Text style={styles.explainCardDesc}>
                      Dựa vào thời điểm bạn chào đời ({meta.birthDate}
                      {meta.birthTime ? ` lúc ${meta.birthTime}` : ' - giờ chuẩn ước lượng'}):
                    </Text>

                    <View style={styles.dataGrid}>
                      <View style={styles.dataItem}>
                        <Text style={styles.dataLabel}>☀️ Mặt Trời bản mệnh</Text>
                        <Text style={styles.dataVal}>
                          {ZODIAC_VI[meta.natalSunSign] || meta.natalSunSign}
                        </Text>
                        <Text style={styles.dataSub}>Ý chí, bản sắc và cái tôi cốt lõi</Text>
                      </View>

                      <View style={styles.dataItem}>
                        <Text style={styles.dataLabel}>🌙 Mặt Trăng bản mệnh</Text>
                        <Text style={styles.dataVal}>
                          {ZODIAC_VI[meta.natalMoonSign] || meta.natalMoonSign}
                        </Text>
                        <Text style={styles.dataSub}>
                          Nội tâm sâu kín, thói quen và phản xạ cảm xúc
                        </Text>
                      </View>

                      <View style={styles.dataItem}>
                        <Text style={styles.dataLabel}>🔥/💧 Khí chất áp đảo</Text>
                        <Text style={styles.dataVal}>
                          Nguyên tố {meta.temperament.dominantElement} • {meta.temperament.dominantModality}
                        </Text>
                        <Text style={styles.dataSub}>
                          {meta.temperament.dominantElement === 'Lửa' &&
                            'Năng lượng mạnh mẽ, bộc trực, muốn hành động ngay'}
                          {meta.temperament.dominantElement === 'Đất' &&
                            'Thực tế, điềm đạm, thích sự chắc chắn và cẩn trọng'}
                          {meta.temperament.dominantElement === 'Khí' &&
                            'Lý trí, phân tích, thích kết nối và quan sát thế sự'}
                          {meta.temperament.dominantElement === 'Nước' &&
                            'Trực giác nhạy bén, sâu sắc, dễ rung cảm và thấu hiểu'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* 2. BẦU TRỜI HÔM NAY TÁC ĐỘNG (TRANSIT) */}
                  <View style={styles.explainCard}>
                    <View style={styles.explainCardHeader}>
                      <View style={[styles.stepNumberBadge, { backgroundColor: '#1E3A8A' }]}>
                        <Text style={styles.stepNumberText}>2</Text>
                      </View>
                      <Text style={styles.explainCardTitle}>Bầu trời hôm nay tác động (Transit)</Text>
                    </View>
                    <Text style={styles.explainCardDesc}>
                      Vị trí các vì sao trên bầu trời hiện tại đang kích hoạt lá số của bạn:
                    </Text>

                    <View style={styles.transitBox}>
                      <View style={styles.transitRow}>
                        <Text style={styles.transitRowLabel}>🌙 Mặt Trăng hôm nay ở:</Text>
                        <Text style={styles.transitRowValue}>
                          {ZODIAC_VI[meta.transitMoonSign] || meta.transitMoonSign}
                        </Text>
                      </View>

                      {meta.topAspect ? (
                        <View style={styles.aspectDetailBox}>
                          <View style={styles.aspectTitleRow}>
                            <Ionicons
                              name={meta.topAspect.nature === 'tension' ? 'flash' : 'sparkles'}
                              size={15}
                              color={meta.topAspect.nature === 'tension' ? '#EF4444' : '#10B981'}
                            />
                            <Text style={styles.aspectHeaderLabel}>
                              Góc tương tác kích hoạt mạnh nhất:
                            </Text>
                          </View>

                          <Text style={styles.aspectFormulaText}>
                            {PLANET_VI[meta.topAspect.transitPlanet] || meta.topAspect.transitPlanet} (hôm nay){' '}
                            <Text
                              style={{
                                color:
                                  meta.topAspect.nature === 'tension'
                                    ? '#F87171'
                                    : meta.topAspect.nature === 'harmony'
                                    ? '#34D399'
                                    : '#FBBF24',
                                fontWeight: '700',
                              }}
                            >
                              {meta.topAspect.nameVi} ({meta.topAspect.actualAngle.toFixed(0)}°)
                            </Text>{' '}
                            {PLANET_VI[meta.topAspect.natalPlanet] || meta.topAspect.natalPlanet} (bản mệnh)
                          </Text>

                          <Text style={styles.aspectExplanationText}>
                            {meta.topAspect.nature === 'tension'
                              ? `🔴 Góc ma sát (Sai số ${meta.topAspect.orb.toFixed(1)}°): Dễ tạo cảm giác sốt ruột, nóng nảy, bất đồng hoặc đối diện tình huống ngoài dự tính.`
                              : meta.topAspect.nature === 'harmony'
                              ? `🟢 Góc hài hòa (Sai số ${meta.topAspect.orb.toFixed(1)}°): Dòng năng lượng êm dịu, giúp bạn hanh thông, nhìn thấu sự việc và cư xử nhẹ nhàng.`
                              : `🟡 Góc hội tụ (Sai số ${meta.topAspect.orb.toFixed(1)}°): Năng lượng tập trung cao độ vào việc trọng tâm trong ngày.`}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.noAspectText}>
                          Bầu trời hôm nay ổn định, các vì sao duy trì quỹ đạo thông thường.
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* 3. BỘ 32 CHỈ SỐ VECTOR LƯỢNG HÓA */}
                  <View style={styles.explainCard}>
                    <View style={styles.explainCardHeader}>
                      <View style={[styles.stepNumberBadge, { backgroundColor: '#92400E' }]}>
                        <Text style={styles.stepNumberText}>3</Text>
                      </View>
                      <Text style={styles.explainCardTitle}>Bộ 32 chỉ số Vector đo lường</Text>
                    </View>
                    <Text style={styles.explainCardDesc}>
                      Hệ thống tổng hợp 32 biến số (10 tọa độ gốc + 10 tọa độ quá cảnh + 7 khí chất + 5 động lực học):
                    </Text>

                    {/* Progress Bar Metrics */}
                    <View style={styles.metricsBox}>
                      <View style={styles.metricRow}>
                        <View style={styles.metricLabelRow}>
                          <Text style={styles.metricLabel}>Áp lực & Ma sát (Tension)</Text>
                          <Text style={[styles.metricPct, { color: '#F87171' }]}>
                            {(meta.scores.tension * 100).toFixed(0)}%
                          </Text>
                        </View>
                        <View style={styles.metricTrack}>
                          <View
                            style={[
                              styles.metricFill,
                              {
                                width: `${Math.round(meta.scores.tension * 100)}%`,
                                backgroundColor: '#EF4444',
                              },
                            ]}
                          />
                        </View>
                      </View>

                      <View style={styles.metricRow}>
                        <View style={styles.metricLabelRow}>
                          <Text style={styles.metricLabel}>Hài hòa & Trợ lực (Harmony)</Text>
                          <Text style={[styles.metricPct, { color: '#34D399' }]}>
                            {(meta.scores.harmony * 100).toFixed(0)}%
                          </Text>
                        </View>
                        <View style={styles.metricTrack}>
                          <View
                            style={[
                              styles.metricFill,
                              {
                                width: `${Math.round(meta.scores.harmony * 100)}%`,
                                backgroundColor: '#10B981',
                              },
                            ]}
                          />
                        </View>
                      </View>

                      <View style={styles.metricRow}>
                        <View style={styles.metricLabelRow}>
                          <Text style={styles.metricLabel}>Hội tụ sự kiện (Conjunction)</Text>
                          <Text style={[styles.metricPct, { color: '#A78BFA' }]}>
                            {(meta.scores.conjunction * 100).toFixed(0)}%
                          </Text>
                        </View>
                        <View style={styles.metricTrack}>
                          <View
                            style={[
                              styles.metricFill,
                              {
                                width: `${Math.round(meta.scores.conjunction * 100)}%`,
                                backgroundColor: '#8B5CF6',
                              },
                            ]}
                          />
                        </View>
                      </View>

                      <View style={styles.metricRow}>
                        <View style={styles.metricLabelRow}>
                          <Text style={styles.metricLabel}>Nhịp chuyển động nhanh (Fast Planets)</Text>
                          <Text style={[styles.metricPct, { color: '#38BDF8' }]}>
                            {(meta.scores.fastPlanetActivity * 100).toFixed(0)}%
                          </Text>
                        </View>
                        <View style={styles.metricTrack}>
                          <View
                            style={[
                              styles.metricFill,
                              {
                                width: `${Math.round(meta.scores.fastPlanetActivity * 100)}%`,
                                backgroundColor: '#0EA5E9',
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>

                    <View style={styles.vibeBox}>
                      <Text style={styles.vibeLabel}>Nhịp điệu tổng thể:</Text>
                      <Text style={styles.vibeText}>"{meta.vibeSummary}"</Text>
                    </View>
                  </View>

                  {/* 4. KHUÔN NHỊP CA DAO TƯƠNG QUAN & KẾT LUẬN */}
                  <View style={styles.explainCard}>
                    <View style={styles.explainCardHeader}>
                      <View style={[styles.stepNumberBadge, { backgroundColor: '#065F46' }]}>
                        <Text style={styles.stepNumberText}>4</Text>
                      </View>
                      <Text style={styles.explainCardTitle}>Khuôn nhịp ca dao neo điệu</Text>
                    </View>
                    <Text style={styles.explainCardDesc}>
                      Từ ma sát năng lượng trên, hệ thống liên kết với bài ca dao dân gian cùng nhịp thế sự để làm mỏ neo ngữ nghĩa:
                    </Text>

                    <View style={styles.anchorVerseCard}>
                      <Text style={styles.anchorVerseContent}>
                        "{fortune.anchorCaDao.content}"
                      </Text>
                      {fortune.anchorCaDao.category && (
                        <Text style={styles.anchorVerseCategory}>
                          Chủ đề dân gian: {fortune.anchorCaDao.category}
                        </Text>
                      )}
                    </View>

                    <View style={styles.conclusionCallout}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#34D399" />
                      <Text style={styles.conclusionCalloutText}>
                        Từ căn nguyên trên, quẻ đã gieo thành bài thơ 4 câu, gương soi nội tâm và kế sách hành động ở trên cho riêng bạn hôm nay!
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </LinearGradient>

            {/* Các nút hành động phía dưới */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={() => fetchNewFortune('random')}
                activeOpacity={0.8}
              >
                <Ionicons name="shuffle-outline" size={18} color="#D1D5DB" />
                <Text style={styles.secondaryActionText}>Lắc quẻ khác</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={handleShare}
                activeOpacity={0.8}
              >
                <Ionicons name="share-social-outline" size={18} color="#000000" />
                <Text style={styles.primaryActionText}>Khoe quẻ</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0910',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1D2B',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F9FAFB',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  refreshIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1F1D2B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
    marginTop: 16,
  },
  loadingSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 30,
    lineHeight: 18,
  },
  errorBox: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
    backgroundColor: '#1F1318',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FCA5A5',
    marginTop: 12,
  },
  errorText: {
    fontSize: 13,
    color: '#E5E7EB',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 18,
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  cardContainer: {
    width: '100%',
  },
  fortuneCard: {
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 22,
    borderWidth: 1.5,
    borderColor: '#D97706',
    ...Platform.select({
      ios: {
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  stampBadge: {
    alignSelf: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  stampBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 1.2,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FDE68A',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    gap: 12,
  },
  dividerLine: {
    width: 60,
    height: 1,
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
  },
  verseBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    marginBottom: 20,
  },
  verseText: {
    fontSize: 17,
    lineHeight: 28,
    fontWeight: '600',
    color: '#FFFBEB',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  insightSection: {
    backgroundColor: '#1E1B2E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2D2845',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  insightBody: {
    fontSize: 14,
    lineHeight: 21,
    color: '#D1D5DB',
  },
  explainAccordionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  explainAccordionButtonActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderColor: '#F59E0B',
  },
  explainAccordionButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  explainAccordionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FDE68A',
  },
  explanationBox: {
    marginTop: 14,
    backgroundColor: '#120F1D',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2D2742',
    gap: 12,
  },
  explainCallout: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    padding: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  explainCalloutText: {
    fontSize: 12,
    color: '#E5E7EB',
    lineHeight: 18,
    flex: 1,
  },
  boldHighlight: {
    fontWeight: '700',
    color: '#FDE68A',
  },
  explainCard: {
    backgroundColor: '#181524',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#28233C',
  },
  explainCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stepNumberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  explainCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F3F4F6',
  },
  explainCardDesc: {
    fontSize: 11,
    color: '#9CA3AF',
    lineHeight: 16,
    marginBottom: 8,
  },
  dataGrid: {
    gap: 8,
  },
  dataItem: {
    backgroundColor: '#1E1B2E',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2D2845',
  },
  dataLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  dataVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F9FAFB',
    marginTop: 2,
  },
  dataSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 15,
  },
  transitBox: {
    backgroundColor: '#1E1B2E',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2D2845',
    gap: 8,
  },
  transitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transitRowLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  transitRowValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  aspectDetailBox: {
    backgroundColor: '#151322',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    marginTop: 4,
    gap: 4,
  },
  aspectTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aspectHeaderLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  aspectFormulaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F3F4F6',
    lineHeight: 18,
  },
  aspectExplanationText: {
    fontSize: 11,
    color: '#D1D5DB',
    lineHeight: 16,
    marginTop: 2,
  },
  noAspectText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  metricsBox: {
    gap: 8,
  },
  metricRow: {
    gap: 4,
  },
  metricLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  metricPct: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricTrack: {
    height: 6,
    backgroundColor: '#262338',
    borderRadius: 3,
    overflow: 'hidden',
  },
  metricFill: {
    height: '100%',
    borderRadius: 3,
  },
  vibeBox: {
    backgroundColor: '#1E1B2E',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#2D2845',
  },
  vibeLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  vibeText: {
    fontSize: 12,
    color: '#E5E7EB',
    fontStyle: 'italic',
    marginTop: 2,
    lineHeight: 17,
  },
  anchorVerseCard: {
    backgroundColor: '#1E1B2E',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  anchorVerseContent: {
    fontSize: 12,
    lineHeight: 18,
    color: '#D1D5DB',
    fontStyle: 'italic',
  },
  anchorVerseCategory: {
    fontSize: 11,
    color: '#6EE7B7',
    marginTop: 4,
    fontWeight: '600',
  },
  conclusionCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    padding: 8,
    borderRadius: 8,
  },
  conclusionCalloutText: {
    fontSize: 11,
    color: '#A7F3D0',
    lineHeight: 16,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F1D2B',
    borderWidth: 1,
    borderColor: '#374151',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
});
