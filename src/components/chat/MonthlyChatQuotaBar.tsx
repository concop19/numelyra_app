import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useLocalization } from '../../i18n/LocalizationContext';
import type { QuotaStatus } from '../../services/billingService';

export type ChatQuotaLoadState = 'loading' | 'ready' | 'guest' | 'error';

interface Props {
  quota: QuotaStatus['ai_response'] | null;
  status: ChatQuotaLoadState;
  isPro: boolean;
  onPress: () => void;
}

export const getChatQuotaTone = (
  remaining: number,
  limit: number,
): 'normal' | 'low' | 'empty' => {
  if (remaining <= 0) return 'empty';
  if (limit > 0 && remaining / limit <= 0.2) return 'low';
  return 'normal';
};

const MonthlyChatQuotaBar: React.FC<Props> = ({ quota, status, isPro, onPress }) => {
  const { l, formatNumber } = useLocalization();
  const safeLimit = Math.max(0, quota?.limit ?? 0);
  const safeRemaining = Math.max(0, Math.min(quota?.remaining ?? 0, safeLimit || Number.MAX_SAFE_INTEGER));
  const tone = getChatQuotaTone(safeRemaining, safeLimit);
  const progress = safeLimit > 0 ? safeRemaining / safeLimit : 0;
  const progressWidth = `${Math.max(0, Math.min(100, progress * 100))}%` as const;
  const hasCachedQuota = !!quota;

  const isLoading = status === 'loading';
  const isGuest = status === 'guest';
  const isUnavailable = status === 'error' && !hasCachedQuota;
  const isOffline = status === 'error' && hasCachedQuota;

  const label = isLoading
    ? l('Đang tải lượt chat', 'Loading chat allowance')
    : isGuest
      ? l('Đăng nhập để nhận lượt chat', 'Sign in for chat allowance')
      : isUnavailable
        ? l('Chưa tải được · chạm thử lại', 'Unavailable · tap to retry')
        : tone === 'empty'
          ? l('Đã hết lượt tháng này', 'Monthly allowance used')
          : l('lượt chat tháng này', 'chats this month');

  const accessibilityLabel = hasCachedQuota
    ? l(
        `Còn ${safeRemaining} trên ${safeLimit} lượt chat tháng này. Chạm để xem chi tiết.`,
        `${safeRemaining} of ${safeLimit} monthly chats remaining. Tap for details.`,
      )
    : label;

  const gradientColors = tone === 'empty'
    ? ['rgba(92, 31, 69, 0.98)', 'rgba(48, 21, 68, 0.98)'] as const
    : tone === 'low'
      ? ['rgba(91, 53, 54, 0.98)', 'rgba(45, 26, 70, 0.98)'] as const
      : ['rgba(69, 42, 121, 0.98)', 'rgba(35, 22, 77, 0.98)'] as const;

  const accentColor = tone === 'empty' ? '#FF9CB5' : tone === 'low' ? '#FFD073' : '#FFE08A';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={0.8}
      disabled={isLoading}
      hitSlop={{ top: 4, right: 8, bottom: 4, left: 8 }}
      onPress={onPress}
      style={styles.touchTarget}
      testID="monthly-chat-quota"
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.pill,
          tone === 'low' && styles.pillLow,
          tone === 'empty' && styles.pillEmpty,
          (isGuest || isUnavailable) && styles.pillMuted,
        ]}
      >
        <View style={[styles.token, { borderColor: accentColor }]}>
          <Ionicons
            name={isGuest ? 'log-in-outline' : 'chatbubble-ellipses'}
            size={14}
            color={accentColor}
          />
          {isPro && !isGuest && (
            <View style={styles.proStar}>
              <Ionicons name="star" size={6} color="#5B3510" />
            </View>
          )}
        </View>

        <View style={styles.copy}>
          {isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#E6C7FF" />
              <Text numberOfLines={1} style={styles.stateText}>{label}</Text>
            </View>
          ) : hasCachedQuota ? (
            <>
              <View style={styles.amountRow}>
                <Text style={[styles.remaining, { color: accentColor }]}>{formatNumber(safeRemaining)}</Text>
                <Text style={styles.limit}>/ {formatNumber(safeLimit)}</Text>
                {isOffline && <View accessibilityLabel={l('Dữ liệu ngoại tuyến', 'Offline data')} style={styles.offlineDot} />}
              </View>
              <Text numberOfLines={1} style={styles.caption}>{label}</Text>
            </>
          ) : (
            <Text numberOfLines={1} style={styles.stateText}>{label}</Text>
          )}
        </View>

        {!isLoading && <Ionicons name="chevron-forward" size={13} color="rgba(244, 232, 255, 0.72)" />}

        {hasCachedQuota && (
          <View pointerEvents="none" style={styles.progressTrack}>
            <LinearGradient
              colors={tone === 'empty' ? ['#FF7E9F', '#D55C91'] : ['#FFE69B', '#C995FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: progressWidth }]}
            />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchTarget: {
    minHeight: 44,
    minWidth: 184,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    width: 184,
    minHeight: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(244, 207, 126, 0.58)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 3,
    shadowColor: '#D7A7FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  pillLow: {
    borderColor: 'rgba(255, 202, 104, 0.72)',
  },
  pillEmpty: {
    borderColor: 'rgba(255, 139, 172, 0.68)',
  },
  pillMuted: {
    borderColor: 'rgba(199, 167, 235, 0.38)',
  },
  token: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 238, 183, 0.11)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  proStar: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFE08A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minHeight: 18,
  },
  remaining: {
    fontSize: 15,
    lineHeight: 17,
    fontWeight: '900',
    letterSpacing: 0.1,
  },
  limit: {
    marginLeft: 3,
    color: 'rgba(239, 225, 255, 0.86)',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
  },
  caption: {
    marginTop: -1,
    color: 'rgba(232, 213, 250, 0.86)',
    fontSize: 8.5,
    lineHeight: 10,
    fontWeight: '700',
    letterSpacing: 0.15,
  },
  stateText: {
    color: '#E7D5F8',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offlineDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CAB7D8',
    marginLeft: 5,
  },
  progressTrack: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 2,
    borderRadius: 1,
  },
});

export default MonthlyChatQuotaBar;
