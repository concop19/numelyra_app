import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { RepresentativeItem } from '../db/representativeService';
import ThreeDButton from './ThreeDButton';
import { useLocalization } from '../i18n/LocalizationContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Kích thước chuẩn khung ảnh chân dung theo tỉ lệ ảnh mẫu (chiếm ~46% chiều cao màn hình)
const HERO_IMAGE_WIDTH = Math.min(SCREEN_WIDTH - 32, 400);
const HERO_IMAGE_HEIGHT = Math.min(Math.round(SCREEN_HEIGHT * 0.46), 390);

export interface HistoricalFigureModalProps {
  visible: boolean;
  figure: RepresentativeItem | null;
  loading?: boolean;
  userTriple?: {
    lifePath: number;
    expression: number;
    soulUrge: number;
  };
  onClose: () => void;
}

export const HistoricalFigureModal: React.FC<HistoricalFigureModalProps> = ({
  visible,
  figure,
  loading = false,
  userTriple,
  onClose,
}) => {
  const { locale } = useLocalization();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lang, setLang] = useState<'vi' | 'en'>(locale);
  const copy = (vi: string, en: string) => lang === 'en' ? en : vi;

  useEffect(() => setLang(locale), [locale]);

  if (!visible) return null;

  // Tên hiển thị ưu tiên tiếng Việt, fallback tiếng Anh
  const displayName = lang === 'vi'
    ? (figure?.display_name_vi || figure?.display_name || 'Nhân Vật Lịch Sử')
    : (figure?.display_name || figure?.display_name_vi || 'Historical Figure');
  const originalName = lang === 'vi' && figure?.display_name_vi && figure?.display_name !== figure.display_name_vi ? figure.display_name : null;

  // Đoạn tiểu sử theo ngôn ngữ đang chọn
  const currentBio = (lang === 'vi'
    ? (figure?.biography_vi || figure?.biography || figure?.description)
    : (figure?.biography_en || figure?.biography || figure?.description)) ||
    (lang === 'vi' ? 'Chưa có thông tin chi tiết về cuộc đời nhân vật này.' : 'No detailed biography available.');

  // Năm sinh - năm mất
  const formatYear = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const match = dateStr.match(/-?\d{1,4}/);
    return match ? match[0] : dateStr;
  };

  const birthYear = formatYear(figure?.birth_date);
  const deathYear = formatYear(figure?.death_date);
  const lifespan = birthYear ? (deathYear ? `${birthYear} – ${deathYear}` : copy(`Sinh năm ${birthYear}`, `Born ${birthYear}`)) : '';

  // Độ khớp
  const getMatchLabel = () => {
    if (!figure) return copy('Đồng Điệu', 'Aligned');
    if (figure.matchType === 'exact_3') return copy('100% Đồng Điệu 3 Số', '100% three-number match');
    if (figure.matchType === 'core_2') return copy('Đồng Điệu Đường Đời & Sứ Mệnh', 'Life Path & Destiny match');
    return copy('Đồng Điệu Đường Đời', 'Life Path match');
  };

  // Mở bài viết gốc trên Wikipedia
  const handleOpenWikipedia = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const targetUrl = figure?.wikipedia_url || figure?.wikidata_url;
    if (targetUrl) {
      try {
        await WebBrowser.openBrowserAsync(targetUrl);
      } catch (e) {
        console.warn('Lỗi khi mở Wikipedia:', e);
      }
    }
  };

  // Chia sẻ thông tin nhân vật
  const handleShare = async () => {
    void Haptics.selectionAsync();
    if (!figure) return;
    try {
      await Share.share({
        message: copy(
          `✦ Nhân vật đồng điệu Thần số học với tôi: ${displayName} (${lifespan})\nBộ 3 số cốt lõi: Đường đời ${figure.life_path} · Sứ mệnh ${figure.expression} · Linh hồn ${figure.soul_urge}.\nKhám phá hành trình cùng Numelyra!`,
          `✦ My numerology-aligned historical figure: ${displayName} (${lifespan})\nCore numbers: Life Path ${figure.life_path} · Destiny ${figure.expression} · Soul Urge ${figure.soul_urge}.\nExplore your journey with Numelyra!`,
        ),
      });
    } catch {}
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0914" />

        {/* Nút đóng tròn phía trên bên phải */}
        <View style={styles.topControlBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleShare}
            style={styles.iconCircleBtn}
            accessibilityRole="button"
            accessibilityLabel={copy('Chia sẻ', 'Share')}
          >
            <Ionicons name="share-social-outline" size={18} color="#D2CCE5" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onClose}
            style={styles.iconCircleBtn}
            accessibilityRole="button"
            accessibilityLabel={copy('Đóng', 'Close')}
          >
            <Ionicons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E8BC79" />
            <Text style={styles.loadingText}>{copy('Đang truy vấn kho tàng lịch sử nhân loại...', 'Searching the historical archive…')}</Text>
          </View>
        ) : !figure ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="compass-outline" size={54} color="#7F7699" />
            <Text style={styles.emptyTitle}>{copy('Chưa tìm thấy nhân vật tương ứng', 'No matching historical figure found')}</Text>
            <Text style={styles.emptySub}>
              {copy('Hệ thống đang tiếp tục cập nhật dữ liệu nhân vật cho bộ số của bạn.', 'The historical-figure catalog is still being expanded for your number set.')}
            </Text>
            <TouchableOpacity activeOpacity={0.8} onPress={onClose} style={styles.backBtn}>
              <Text style={styles.backBtnText}>{copy('Quay lại Bản đồ', 'Back to chart')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Khung Ảnh Chân Dung Lớn Bo Tròn (Theo phong cách ảnh mẫu Dorian Gray) */}
            <View style={styles.imageCardContainer}>
              <View style={styles.imageWrapper}>
                {figure.image_url && !imageError ? (
                  <ExpoImage
                    source={{ uri: figure.image_url }}
                    style={styles.heroImage}
                    contentFit="cover"
                    transition={400}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <LinearGradient
                    colors={['#1E163B', '#120D25']}
                    style={[styles.heroImage, styles.placeholderWrap]}
                  >
                    <Ionicons name="person-circle-outline" size={88} color="#E8BC79" />
                    <Text style={styles.placeholderLabel}>{displayName}</Text>
                  </LinearGradient>
                )}

                {/* Gradient phủ đáy ảnh tạo chiều sâu chuyển màu vào card */}
                <LinearGradient
                  colors={['transparent', 'rgba(10, 9, 20, 0.4)', 'rgba(10, 9, 20, 0.95)']}
                  style={styles.imageGradientOverlay}
                />
              </View>
            </View>

            {/* 2. Phần Nội Dung Thẻ Chi Tiết */}
            <View style={styles.contentBody}>
              {/* Tên nhân vật in đậm nổi bật ở giữa */}
              <Text style={styles.characterName}>{displayName}</Text>
              {originalName && (
                <Text style={styles.characterOriginalName}>({originalName})</Text>
              )}

              {/* Hàng meta badge: by @... | comments | score (Mô phỏng chuẩn ảnh mẫu) */}
              <View style={styles.metaRow}>
                {lifespan ? (
                  <View style={styles.metaBadge}>
                    <Ionicons name="time-outline" size={13} color="#E8BC79" style={{ marginRight: 4 }} />
                    <Text style={styles.metaBadgeText}>{lifespan}</Text>
                  </View>
                ) : null}

                <View style={styles.metaBadge}>
                  <Ionicons name="chatbubbles-outline" size={13} color="#8DA0F8" style={{ marginRight: 4 }} />
                  <Text style={styles.metaBadgeText}>{figure.sitelinks} {copy('bài viết', 'articles')}</Text>
                </View>

                <View style={[styles.metaBadge, styles.metaBadgeHighlight]}>
                  <Ionicons name="sparkles" size={12} color="#FF6584" style={{ marginRight: 4 }} />
                  <Text style={[styles.metaBadgeText, styles.metaBadgeHighlightText]}>
                    {getMatchLabel()}
                  </Text>
                </View>
              </View>

              {/* Dải chỉ số đối chiếu (Core Numbers Comparison) */}
              <View style={styles.numbersCompareRow}>
                <View style={styles.numberChip}>
                  <Text style={styles.numberChipLabel}>{copy('Đường đời', 'Life Path')}</Text>
                  <Text style={styles.numberChipVal}>{figure.life_path}</Text>
                </View>
                <View style={styles.numberChipDivider} />
                <View style={styles.numberChip}>
                  <Text style={styles.numberChipLabel}>{copy('Sứ mệnh', 'Destiny')}</Text>
                  <Text style={styles.numberChipVal}>{figure.expression}</Text>
                </View>
                <View style={styles.numberChipDivider} />
                <View style={styles.numberChip}>
                  <Text style={styles.numberChipLabel}>{copy('Linh hồn', 'Soul Urge')}</Text>
                  <Text style={styles.numberChipVal}>{figure.soul_urge}</Text>
                </View>
              </View>

              {/* 3. Đoạn Văn Tiểu Sử Cuộc Đời (Editorial Biography) & Bộ Chuyển Ngôn Ngữ */}
              <View style={styles.bioContainer}>
                {/* Nút chuyển đổi ngôn ngữ Tiếng Việt ⇄ English */}
                <View style={styles.langToggleWrap}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setLang('vi');
                    }}
                    style={[styles.langToggleBtn, lang === 'vi' && styles.langToggleBtnActive]}
                    accessibilityRole="button"
                    accessibilityLabel={copy('Xem tiếng Việt', 'View in Vietnamese')}
                  >
                    <Ionicons
                      name="language"
                      size={13}
                      color={lang === 'vi' ? '#160E34' : '#E8BC79'}
                      style={{ marginRight: 5 }}
                    />
                    <Text style={[styles.langToggleText, lang === 'vi' && styles.langToggleTextActive]}>
                      Tiếng Việt
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setLang('en');
                    }}
                    style={[styles.langToggleBtn, lang === 'en' && styles.langToggleBtnActive]}
                    accessibilityRole="button"
                    accessibilityLabel="View in English"
                  >
                    <Ionicons
                      name="globe-outline"
                      size={13}
                      color={lang === 'en' ? '#160E34' : '#ADA2C5'}
                      style={{ marginRight: 5 }}
                    />
                    <Text style={[styles.langToggleText, lang === 'en' && styles.langToggleTextActive]}>
                      English
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text
                  style={styles.bioText}
                  numberOfLines={isExpanded ? undefined : 6}
                >
                  {currentBio}
                </Text>

                {currentBio && currentBio.length > 250 && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setIsExpanded(!isExpanded);
                    }}
                    style={styles.expandBtn}
                  >
                    <Text style={styles.expandBtnText}>
                      {isExpanded
                        ? (lang === 'vi' ? 'Thu gọn ▴' : 'Collapse ▴')
                        : (lang === 'vi' ? 'Đọc trọn vẹn tiểu sử ▾' : 'Read full biography ▾')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* 4. Nút Hành Động Wikipedia & Chevron Chỉ Báo Chuẩn Mẫu */}
              <View style={styles.actionFooter}>
                {figure.wikipedia_url && (
                  <ThreeDButton
                    label={copy('Khám phá trên Wikipedia', 'Explore on Wikipedia')}
                    leadingIcon={<Ionicons name="globe-outline" size={16} color="#FFFFFF" />}
                    onPress={handleOpenWikipedia}
                    shape="pill"
                    trailingIcon={<Ionicons name="open-outline" size={14} color="#FFFFFF" />}
                    variant="purple"
                  />
                )}

                {/* Biểu tượng Chevron Hồng Tím ở đáy (Giống hệt ảnh mẫu của user) */}
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={onClose}
                  style={styles.bottomChevronWrap}
                >
                  <Ionicons name="chevron-up" size={24} color="#FF4F99" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0A0914',
  },
  topControlBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 12,
    zIndex: 10,
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 36,
    alignItems: 'center',
  },
  imageCardContainer: {
    width: HERO_IMAGE_WIDTH,
    height: HERO_IMAGE_HEIGHT,
    marginTop: 6,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#161226',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  placeholderWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderLabel: {
    marginTop: 10,
    color: '#E8BC79',
    fontSize: 18,
    fontWeight: '600',
  },
  imageGradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  contentBody: {
    width: '100%',
    paddingHorizontal: 24,
    marginTop: 20,
    alignItems: 'center',
  },
  characterName: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  characterOriginalName: {
    color: '#9E94B8',
    fontSize: 14,
    marginTop: 2,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  metaBadgeText: {
    color: '#D4CDE6',
    fontSize: 12.5,
    fontWeight: '500',
  },
  metaBadgeHighlight: {
    backgroundColor: 'rgba(255, 101, 132, 0.16)',
    borderColor: 'rgba(255, 101, 132, 0.35)',
    borderWidth: 0.8,
  },
  metaBadgeHighlightText: {
    color: '#FF6584',
    fontWeight: '600',
  },
  numbersCompareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(232, 188, 121, 0.08)',
    borderColor: 'rgba(232, 188, 121, 0.22)',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginTop: 18,
    width: '100%',
    maxWidth: 340,
  },
  numberChip: {
    alignItems: 'center',
  },
  numberChipLabel: {
    color: '#A99DC4',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  numberChipVal: {
    color: '#E8BC79',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  numberChipDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(232, 188, 121, 0.2)',
  },
  bioContainer: {
    marginTop: 18,
    width: '100%',
    paddingHorizontal: 4,
  },
  langToggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 20,
    padding: 3,
    marginBottom: 14,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  langToggleBtn: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  langToggleBtnActive: {
    backgroundColor: '#E8BC79',
  },
  langToggleText: {
    color: '#ADA2C5',
    fontSize: 12,
    fontWeight: '600',
  },
  langToggleTextActive: {
    color: '#160E34',
    fontWeight: '700',
  },
  bioText: {
    color: '#C8BFDC',
    fontSize: 14.5,
    lineHeight: 23,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  expandBtn: {
    marginTop: 10,
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  expandBtnText: {
    color: '#E8BC79',
    fontSize: 13,
    fontWeight: '600',
  },
  actionFooter: {
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
  },
  bottomChevronWrap: {
    marginTop: 22,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  loadingText: {
    marginTop: 16,
    color: '#B6ABCF',
    fontSize: 15,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    marginTop: 18,
    textAlign: 'center',
  },
  emptySub: {
    color: '#9F95BA',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  backBtn: {
    marginTop: 24,
    backgroundColor: '#E8BC79',
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 20,
  },
  backBtnText: {
    color: '#160E34',
    fontSize: 14,
    fontWeight: '700',
  },
});
