import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { calculate24Indicators, CalculatedIndicator } from '../services/numerologyEngine';
import { IndicatorCategory } from '../config/numerologyCards';
import { IndicatorDetailModal } from './IndicatorDetailModal';
import { type ProfileItem } from '../store/userProfile';

interface NumerologyCardsModalProps {
  visible: boolean;
  profile: ProfileItem | { fullName: string; birthDate: string } | null;
  onClose: () => void;
}

const CATEGORY_TABS: { key: 'all' | IndicatorCategory; label: string; count?: number }[] = [
  { key: 'all', label: 'Tất Cả' },
  { key: 'core', label: 'Cốt Lõi' },
  { key: 'potential', label: 'Tiềm Năng' },
  { key: 'karmic', label: 'Nợ Nghiệp' },
  { key: 'bridge', label: 'Cầu Nối' },
  { key: 'cycle', label: 'Vận Hạn' },
  { key: 'chart', label: 'Biểu Đồ' },
];

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export const NumerologyCardsModal: React.FC<NumerologyCardsModalProps> = ({
  visible,
  profile,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | IndicatorCategory>('all');
  const [selectedIndicator, setSelectedIndicator] = useState<CalculatedIndicator | null>(null);

  const indicators = useMemo(() => {
    if (!profile) return [];
    return calculate24Indicators(profile.fullName, profile.birthDate);
  }, [profile?.fullName, profile?.birthDate]);

  const filteredIndicators = useMemo(() => {
    if (selectedCategory === 'all') return indicators;
    return indicators.filter((item) => item.category === selectedCategory);
  }, [indicators, selectedCategory]);
  const selectCategory = (category: 'all' | IndicatorCategory) => {
    if (category !== selectedCategory) void Haptics.selectionAsync();
    setSelectedCategory(category);
  };

  const renderCardItem = ({ item }: { item: CalculatedIndicator }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedIndicator(item);
        }}
        style={styles.cardWrapper}
      >
        <View style={styles.cardContainer}>
          {/* Card Artwork */}
          <View style={styles.imageFrame}>
            <Image source={item.image} style={styles.cardImage} resizeMode="cover" />
            
            {/* Number Pill Top-Left */}
            <View style={styles.cardNumBadge}>
              <Text style={styles.cardNumText}>#{item.number}</Text>
            </View>

            {/* Category Tag Top-Right */}
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{item.categoryNameVi}</Text>
            </View>

            {/* Value Overlay Bottom */}
            <View style={[styles.valueOverlay, item.isMaster && styles.valueOverlayMaster]}>
              <Text style={styles.valueOverlayLabel}>Chỉ số:</Text>
              <Text style={[styles.valueOverlayNum, item.isMaster && styles.valueOverlayNumMaster]}>
                {item.displayValue}
              </Text>
            </View>
          </View>

          {/* Title & Kicker */}
          <View style={styles.cardMeta}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.nameVi}
            </Text>
            <Text style={styles.cardKicker} numberOfLines={1}>
              {item.nameEn}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#070913" />

        {/* Top Header */}
        <View style={styles.topHeader}>
          <View style={styles.headerInfo}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="sparkles" size={16} color="#E5A93C" />
              <Text style={styles.headerTitle}>Bản Đồ 24 Chỉ Số Thần Số Học</Text>
            </View>
            <Text style={styles.profileSubtitle}>
              Hồ sơ: <Text style={styles.highlightName}>{profile?.fullName || 'Người Dùng'}</Text> • Sinh ngày: {profile?.birthDate || 'Chưa cập nhật'}
            </Text>
          </View>

          <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="rgba(255, 255, 255, 0.85)" />
          </TouchableOpacity>
        </View>

        {/* Notice Banner */}
        <View style={styles.bannerContainer}>
          <Text style={styles.bannerText}>
            Chạm vào bất kỳ lá bài nào để mở bài luận giải tri thức bản mệnh tức thì.
          </Text>
        </View>

        {/* Category Tabs */}
        <View style={styles.tabsWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={CATEGORY_TABS}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.tabsList}
            renderItem={({ item }) => {
              const isActive = selectedCategory === item.key;
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => selectCategory(item.key)}
                  style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                >
                  <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* 24 Cards Grid */}
        <FlatList
          data={filteredIndicators}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          renderItem={renderCardItem}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={<View style={{ height: 40 }} />}
        />

        {/* Indicator Detail Reading Modal */}
        <IndicatorDetailModal
          visible={!!selectedIndicator}
          indicator={selectedIndicator}
          onClose={() => setSelectedIndicator(null)}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070913',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.2)',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  celestialIcon: {
    color: '#E5A93C',
    fontSize: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  profileSubtitle: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    marginTop: 4,
  },
  highlightName: {
    color: '#FCD34D',
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  closeButtonText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 18,
    fontWeight: '600',
  },
  bannerContainer: {
    backgroundColor: 'rgba(229, 169, 60, 0.1)',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(229, 169, 60, 0.2)',
  },
  bannerText: {
    color: '#FDE68A',
    fontSize: 11.5,
    textAlign: 'center',
  },
  tabsWrapper: {
    paddingVertical: 10,
  },
  tabsList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(229, 169, 60, 0.2)',
    borderColor: '#E5A93C',
  },
  tabBtnText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: '#FCD34D',
    fontWeight: '700',
  },
  gridContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginHorizontal: 4,
    marginBottom: 16,
  },
  cardContainer: {
    backgroundColor: '#0F1528',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(229, 169, 60, 0.22)',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  imageFrame: {
    width: '100%',
    height: CARD_WIDTH * 1.38,
    backgroundColor: '#1E293B',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardNumBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(5, 7, 15, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  cardNumText: {
    color: '#FCD34D',
    fontSize: 10,
    fontWeight: '800',
  },
  categoryTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(5, 7, 15, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  categoryTagText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 9,
    fontWeight: '600',
  },
  valueOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(7, 10, 22, 0.92)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 169, 60, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valueOverlayMaster: {
    backgroundColor: 'rgba(88, 28, 135, 0.92)',
    borderTopColor: '#A78BFA',
  },
  valueOverlayLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10.5,
  },
  valueOverlayNum: {
    color: '#FCD34D',
    fontSize: 13,
    fontWeight: '800',
  },
  valueOverlayNumMaster: {
    color: '#FEF08A',
  },
  cardMeta: {
    padding: 10,
    backgroundColor: '#0F1528',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  cardKicker: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 10.5,
    marginTop: 2,
  },
});
