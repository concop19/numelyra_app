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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CalculatedIndicator } from '../services/numerologyEngine';
import { getIndicatorReading, KnowledgeReadingResult } from '../services/numerologyKnowledge';

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
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState<KnowledgeReadingResult | null>(null);
  const [showFullArticle, setShowFullArticle] = useState(false);

  useEffect(() => {
    if (visible && indicator) {
      setLoading(true);
      setShowFullArticle(false);
      getIndicatorReading(indicator.key, indicator.value, indicator.nameVi)
        .then((res) => {
          setReading(res);
        })
        .catch((err) => {
          console.warn('[DetailModal] Load reading error:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setReading(null);
    }
  }, [visible, indicator]);

  if (!indicator) return null;

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
              <Text style={styles.headerCategory}>{indicator.categoryNameVi}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="rgba(255, 255, 255, 0.8)" />
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
                <Text style={styles.indicatorName}>{indicator.nameVi}</Text>
                <Text style={styles.indicatorNameEn}>{indicator.nameEn}</Text>

                <View style={styles.valueRow}>
                  <Text style={styles.valueLabel}>Kết quả của bạn:</Text>
                  <View style={[styles.valuePill, indicator.isMaster && styles.valuePillMaster]}>
                    <Text style={[styles.valuePillText, indicator.isMaster && styles.valuePillTextMaster]}>
                      {indicator.displayValue}
                    </Text>
                  </View>
                  {indicator.isMaster && (
                    <View style={styles.masterTag}>
                      <Text style={styles.masterTagText}>Master</Text>
                    </View>
                  )}
                </View>

                {/* Subtitle Description */}
                <Text style={styles.cardShortDesc}>{indicator.description}</Text>
              </View>
            </View>

            {/* Tra Cứu Tri Thức Banner */}
            <View style={styles.knowledgeBanner}>
              <Ionicons name="book-outline" size={16} color="#FCD34D" />
              <Text style={styles.knowledgeBannerText}>
                Luận giải tri thức chuẩn Pythagoras • Tức thì & Không qua AI
              </Text>
            </View>

            {/* Loading Indicator */}
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#E5A93C" />
                <Text style={styles.loadingText}>Đang tra cứu kho tri thức bản mệnh...</Text>
              </View>
            )}

            {/* Reading Content */}
            {!loading && reading && (
              <View style={styles.readingContainer}>
                {/* 1. Bản Chất Cốt Lõi */}
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="sparkles" size={17} color="#FCD34D" />
                    <Text style={styles.sectionHeading}>Bản Chất Cốt Lõi & Năng Lượng</Text>
                  </View>
                  <Text style={styles.sectionBodyText}>{reading.overview}</Text>
                </View>

                {/* 2. Điểm Mạnh */}
                {reading.strengths.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons name="diamond-outline" size={17} color="#7DD3FC" />
                      <Text style={styles.sectionHeading}>Điểm Mạnh Tự Nhiên</Text>
                    </View>
                    {reading.strengths.map((s, idx) => (
                      <View key={`str-${idx}`} style={styles.bulletItem}>
                        <Ionicons name="sparkles" size={12} color="#34D399" style={styles.bulletDot} />
                        <Text style={styles.bulletText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* 3. Thách Thức */}
                {reading.challenges.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons name="moon-outline" size={17} color="#C4B5FD" />
                      <Text style={styles.sectionHeading}>Vùng Bóng Tối Cần Lưu Ý</Text>
                    </View>
                    {reading.challenges.map((c, idx) => (
                      <View key={`cha-${idx}`} style={styles.bulletItem}>
                        <Ionicons name="sparkles" size={12} color="#F87171" style={styles.bulletDot} />
                        <Text style={styles.bulletText}>{c}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* 4. Lời Khuyên */}
                {reading.advice ? (
                  <View style={[styles.sectionBlock, styles.adviceBlock]}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons name="leaf-outline" size={17} color="#A7F3D0" />
                      <Text style={[styles.sectionHeading, { color: '#FCD34D' }]}>
                        Lời Khuyên & Bước Chuyển Hóa
                      </Text>
                    </View>
                    <Text style={styles.adviceText}>{reading.advice}</Text>
                  </View>
                ) : null}

                {/* 5. Toàn Văn Chi Tiết Sách Gốc (Tùy chọn mở rộng) */}
                {reading.fullContent && reading.fullContent.length > 300 && (
                  <View style={styles.fullArticleContainer}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setShowFullArticle(!showFullArticle);
                      }}
                      style={styles.expandArticleBtn}
                    >
                      <Ionicons name={showFullArticle ? "chevron-up" : "chevron-down"} size={15} color="#93C5FD" />
                      <Text style={styles.expandArticleText}>{showFullArticle ? 'Thu gọn bài luận giải' : 'Đọc toàn văn tư liệu gốc'}</Text>
                    </TouchableOpacity>

                    {showFullArticle && (
                      <View style={styles.fullArticleBox}>
                        <Text style={styles.fullArticleContent}>{reading.fullContent}</Text>
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
            <TouchableOpacity activeOpacity={0.7} onPress={() => { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onClose(); }} style={styles.footerConfirmBtn}>
              <Text style={styles.footerConfirmText}>Đã Hiểu • Quay Lại 24 Lá Bài</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 15, 0.88)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0D1224',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.28)',
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  numberBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  numberBadgeText: {
    color: '#FCD34D',
    fontSize: 12,
    fontWeight: '700',
  },
  headerCategory: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
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
    borderColor: 'rgba(229, 169, 60, 0.45)',
    backgroundColor: '#1E293B',
    elevation: 8,
    shadowColor: '#E5A93C',
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
    backgroundColor: 'rgba(229, 169, 60, 0.04)',
  },
  titleInfo: {
    flex: 1,
  },
  indicatorName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  indicatorNameEn: {
    color: 'rgba(255, 255, 255, 0.45)',
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
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
  },
  valuePill: {
    backgroundColor: 'rgba(229, 169, 60, 0.18)',
    borderWidth: 1,
    borderColor: '#E5A93C',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  valuePillMaster: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
    borderColor: '#F59E0B',
  },
  valuePillText: {
    color: '#FCD34D',
    fontSize: 16,
    fontWeight: '800',
  },
  valuePillTextMaster: {
    color: '#FEF08A',
  },
  masterTag: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  masterTagText: {
    color: '#EDE9FE',
    fontSize: 10,
    fontWeight: '700',
  },
  cardShortDesc: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  knowledgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 18,
    marginBottom: 14,
  },
  knowledgeBannerIcon: {
    fontSize: 14,
  },
  knowledgeBannerText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 11,
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
  },
  readingContainer: {
    gap: 14,
  },
  sectionBlock: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    padding: 16,
  },
  adviceBlock: {
    backgroundColor: 'rgba(229, 169, 60, 0.08)',
    borderColor: 'rgba(229, 169, 60, 0.25)',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionHeading: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sectionBodyText: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 13.5,
    lineHeight: 21,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 6,
  },
  bulletDot: {
    color: '#34D399',
    fontSize: 11,
    marginTop: 4,
  },
  bulletText: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  adviceText: {
    color: '#FEF3C7',
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
    color: '#93C5FD',
    fontSize: 12.5,
    fontWeight: '600',
  },
  fullArticleBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginTop: 8,
  },
  fullArticleContent: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 12,
    lineHeight: 18,
  },
  footerRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  footerConfirmBtn: {
    backgroundColor: '#E5A93C',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#E5A93C',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  footerConfirmText: {
    color: '#0A0E1A',
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
