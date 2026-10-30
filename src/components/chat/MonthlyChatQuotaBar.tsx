import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
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
          : l('Lượt chat', 'Chats left');

  const accessibilityLabel = hasCachedQuota
    ? l(
        `Còn ${safeRemaining} trên ${safeLimit} lượt chat tháng này. Chạm để xem chi tiết.`,
        `${safeRemaining} of ${safeLimit} monthly chats remaining. Tap for details.`,
      )
    : label;

  const gradientColors = tone === 'empty'
    ? ['#5B1D45', '#321746', '#17123D'] as const
    : tone === 'low'
      ? ['#61372E', '#3E204D', '#17123D'] as const
      : ['#512458', '#2B175A', '#15113D'] as const;

  const borderColors = tone === 'empty'
    ? ['#FF9CB5', '#FF70B7', '#A45CFF', '#FFBBCB'] as const
    : tone === 'low'
      ? ['#FFE58B', '#FFAE73', '#D67CFF', '#FFE4A0'] as const
      : ['#FFF0A5', '#FF9ADE', '#9A71FF', '#FFE58B'] as const;

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
        colors={borderColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.neonFrame,
          tone === 'empty' && styles.neonFrameEmpty,
          (isGuest || isUnavailable) && styles.neonFrameMuted,
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          locations={[0, 0.48, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.pill}
        >
          <View pointerEvents="none" style={styles.innerBorder} />
          <View pointerEvents="none" style={styles.topHighlight} />

          <LinearGradient
            colors={borderColors}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.tokenFrame}
          >
            <LinearGradient
              colors={['#713166', '#34205F', '#23184F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.token}
            >
              <Ionicons
                name={isGuest ? 'log-in-outline' : 'chatbubble-ellipses'}
                size={14}
                color={accentColor}
              />
              {isPro && !isGuest && (
                <View style={styles.proStar}>
                  <Ionicons name="star" size={5} color="#5B3510" />
                </View>
              )}
            </LinearGradient>
          </LinearGradient>

          <View style={[styles.copy, !hasCachedQuota && styles.copyState]}>
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#FFE08A" />
                <Text numberOfLines={2} style={styles.stateText}>{label}</Text>
              </View>
            ) : hasCachedQuota ? (
              <>
                <View style={styles.amountRow}>
                  <Text style={[styles.remaining, { color: accentColor }]}>{formatNumber(safeRemaining)}</Text>
                  <Text style={styles.limit}>/ {formatNumber(safeLimit)}</Text>
                  {isOffline && <View accessibilityLabel={l('Dữ liệu ngoại tuyến', 'Offline data')} style={styles.offlineDot} />}
                </View>
              </>
            ) : (
              <Text numberOfLines={2} style={styles.stateText}>{label}</Text>
            )}
          </View>
        </LinearGradient>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchTarget: {
    minHeight: 44,
    minWidth: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  neonFrame: {
    width: 104,
    height: 36,
    borderRadius: 18,
    padding: 1.5,
    shadowColor: '#F285FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.78,
    shadowRadius: 6,
    elevation: 5,
  },
  neonFrameEmpty: {
    shadowColor: '#FF729F',
  },
  neonFrameMuted: {
    opacity: 0.74,
    shadowOpacity: 0.36,
  },
  pill: {
    flex: 1,
    borderRadius: 16.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 6,
    overflow: 'hidden',
  },
  innerBorder: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 16.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 245, 0.38)',
  },
  topHighlight: {
    position: 'absolute',
    top: 2,
    left: 16,
    right: 16,
    height: 1,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 246, 210, 0.48)',
  },
  tokenFrame: {
    width: 26,
    height: 26,
    borderRadius: 13,
    padding: 1.5,
    marginRight: 6,
    shadowColor: '#FFE38A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 4,
    elevation: 4,
  },
  token: {
    flex: 1,
    borderRadius: 11.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proStar: {
    position: 'absolute',
    right: 1,
    top: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFE08A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  copyState: {
    paddingRight: 2,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minHeight: 18,
  },
  remaining: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '900',
    letterSpacing: -0.35,
    textShadowColor: 'rgba(255, 206, 103, 0.72)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  limit: {
    marginLeft: 2,
    color: '#D9CBFF',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    textShadowColor: 'rgba(148, 102, 255, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  stateText: {
    color: '#E7D5F8',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '800',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  offlineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CAB7D8',
    marginLeft: 5,
  },
});

export default MonthlyChatQuotaBar;
