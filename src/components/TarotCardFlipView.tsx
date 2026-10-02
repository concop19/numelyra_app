/**
 * TarotCardFlipView.tsx - Thẻ bài Tarot lật 3D tương tác (Interactive 3D Flip Card)
 * Cho phép người dùng chạm để lật bài (từ lưng bài sang mặt bài thực tế).
 */
import React, { useRef, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity,
  Animated, Image, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DrawnCardResult } from '../services/tarotService';
import { getTarotCardImage, TAROT_CARD_BACK } from '../services/tarotAssets';

interface Props {
  item: DrawnCardResult;
  index: number;
  isFlipped: boolean;
  onFlip: (index: number) => void;
  onPressCard?: (item: DrawnCardResult) => void;
}

export default function TarotCardFlipView({
  item,
  index,
  isFlipped,
  onFlip,
  onPressCard
}: Props) {
  const animatedValue = useRef(new Animated.Value(isFlipped ? 180 : 0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: isFlipped ? 180 : 0,
      friction: 8,
      tension: 10,
      useNativeDriver: Platform.OS !== 'web' // Web handles transform matrix reliably
    }).start();
  }, [isFlipped]);

  // Interpolations for 3D Flip
  const frontInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg']
  });

  const backInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg']
  });

  const frontOpacity = animatedValue.interpolate({
    inputRange: [89, 90],
    outputRange: [0, 1]
  });

  const backOpacity = animatedValue.interpolate({
    inputRange: [89, 90],
    outputRange: [1, 0]
  });

  const cardImage = getTarotCardImage(item.card.id);

  const handleCardPress = () => {
    if (!isFlipped) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onFlip(index);
    } else if (onPressCard) {
      onPressCard(item);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handleCardPress}
      style={styles.container}
    >
      {/* Vị trí trong trải bài */}
      <View style={styles.posHeader}>
        <Text style={styles.posNumber}>{index + 1}</Text>
        <Text style={styles.posName} numberOfLines={1}>{item.position.nameVi}</Text>
      </View>

      <View style={styles.cardWrapper}>
        {/* MẶT SAU (LƯNG BÀI - KHI CHƯA LẬT) */}
        <Animated.View
          style={[
            styles.cardFace,
            styles.cardBack,
            {
              opacity: backOpacity,
              transform: [{ rotateY: backInterpolate }]
            }
          ]}
        >
          <Image
            source={TAROT_CARD_BACK}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <View style={styles.backOverlay}>
            <View style={styles.tapToFlipBadge}>
              <Ionicons name="sparkles" size={12} color="#FDB551" style={styles.tapSparkle} />
              <Text style={styles.tapText}>Chạm để lật</Text>
            </View>
          </View>
        </Animated.View>

        {/* MẶT TRƯỚC (HÌNH LÁ BÀI THẬT - KHI ĐÃ LẬT) */}
        <Animated.View
          style={[
            styles.cardFace,
            styles.cardFront,
            {
              opacity: frontOpacity,
              transform: [{ rotateY: frontInterpolate }]
            }
          ]}
        >
          {/* Hình ảnh lá bài đã rút */}
          <View style={styles.artContainer}>
            <Image
              source={cardImage}
              style={[
                styles.cardImage,
                item.isReversed && styles.reversedImage
              ]}
              resizeMode="cover"
            />
            {/* Nhãn Lá Xuôi / Lá Ngược */}
            <View
              style={[
                styles.orientationTag,
                item.isReversed ? styles.tagReversed : styles.tagUpright
              ]}
            >
              <Text style={styles.orientationText}>
                {item.isReversed ? 'Lá Ngược ↷' : 'Lá Xuôi ↾'}
              </Text>
            </View>
          </View>

          {/* Tên lá bài & Thông điệp tóm tắt */}
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.card.nameVi.split('(')[0].trim()}
            </Text>
            <Text style={styles.cardSnippet} numberOfLines={3}>
              {item.isReversed ? item.card.meaningReversed : item.card.meaningUpright}
            </Text>
          </View>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 146,
    marginRight: 12,
    alignItems: 'center'
  },
  posHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1833',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#392E5C',
    width: '100%'
  },
  posNumber: {
    color: '#FDB551',
    fontSize: 10,
    fontWeight: '800',
    marginRight: 4
  },
  posName: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '600',
    flexShrink: 1
  },
  cardWrapper: {
    width: 140,
    height: 236,
    borderRadius: 14,
    overflow: 'hidden'
  },
  cardFace: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: '#161224',
    borderWidth: 1,
    borderColor: '#362B54',
    overflow: 'hidden',
    backfaceVisibility: 'hidden'
  },
  cardBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardFront: {
    position: 'absolute',
    top: 0,
    left: 0
  },
  cardImage: {
    width: '100%',
    height: '100%'
  },
  reversedImage: {
    transform: [{ rotate: '180deg' }]
  },
  backOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 8, 20, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 16
  },
  tapToFlipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 24, 51, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDB551'
  },
  tapSparkle: {
    color: '#FDB551',
    fontSize: 10,
    marginRight: 4
  },
  tapText: {
    color: '#FDB551',
    fontSize: 10,
    fontWeight: '700'
  },
  artContainer: {
    width: '100%',
    height: 156,
    overflow: 'hidden',
    position: 'relative'
  },
  orientationTag: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  tagUpright: {
    backgroundColor: 'rgba(22, 101, 52, 0.85)',
    borderWidth: 1,
    borderColor: '#4ADE80'
  },
  tagReversed: {
    backgroundColor: 'rgba(154, 52, 18, 0.85)',
    borderWidth: 1,
    borderColor: '#FB923C'
  },
  orientationText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700'
  },
  cardInfo: {
    flex: 1,
    backgroundColor: '#19132B',
    padding: 8,
    justifyContent: 'center'
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2
  },
  cardSnippet: {
    color: '#94A3B8',
    fontSize: 9,
    lineHeight: 12
  }
});
