import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import type { UserProfile } from '../../store/userProfile';
import {
  generatePureAstroVector,
  type PureAstroFeatureMetadata,
} from '../../services/astro/astroVectorEngine';
import {
  requestAstroFortuneSlip,
  type AstroFortuneSlip,
} from '../../services/astro/astroFortuneService';
import {
  formatLocalDateKey,
  getAstrologyProfileFingerprint,
  loadCachedAstroFortune,
  loadRecentAstroAdvice,
  loadRecentAstroCaDao,
  refreshCachedAstroMetadata,
  saveCachedAstroFortune,
} from './dailyAstroFortune';
import { useLocalization } from '../../i18n/LocalizationContext';

export interface DailyAstroFortuneState {
  currentDate: Date;
  fortune: AstroFortuneSlip | null;
  metadata: PureAstroFeatureMetadata | undefined;
  loading: boolean;
  error: string | null;
  calculationError: string | null;
  retry(): Promise<void>;
  share(): Promise<void>;
}

function createAstroMetadata(profile: UserProfile, date: Date) {
  return generatePureAstroVector({
    birthDate: profile.birthDate,
    birthTime: profile.birthTime || undefined,
    fullName: profile.fullName,
    birthTimeAccuracy: profile.birthTimeAccuracy,
    resolvedBirthLocation: profile.birthLocation,
  }, date).metadata;
}

export function useDailyAstroFortune(profile?: UserProfile | null): DailyAstroFortuneState {
  const { locale } = useLocalization();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [fortune, setFortune] = useState<AstroFortuneSlip | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const localDateKey = formatLocalDateKey(currentDate);

  const localAstro = useMemo(() => {
    if (!profile?.fullName || !profile.birthDate) {
      return {
        metadata: undefined,
        error: 'Chưa có hồ sơ hợp lệ để dựng dữ liệu chiêm tinh.',
      };
    }
    try {
      return { metadata: createAstroMetadata(profile, currentDate), error: null };
    } catch (caught) {
      return {
        metadata: undefined,
        error: caught instanceof Error
          ? caught.message
          : 'Không thể dựng dữ liệu chiêm tinh từ hồ sơ hiện tại.',
      };
    }
  }, [
    currentDate,
    profile?.birthDate,
    profile?.birthLocation?.placeId,
    profile?.birthLocation?.resolvedAt,
    profile?.birthTime,
    profile?.birthTimeAccuracy,
    profile?.fullName,
  ]);
  const metadata = localAstro.metadata;

  const fetchFortune = useCallback(async (allowCache: boolean, generateIfMissing = true) => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);

    if (!metadata) {
      setFortune(null);
      setLoading(false);
      return;
    }

    try {
      if (allowCache) {
        const cached = await loadCachedAstroFortune(AsyncStorage, currentDate, profile, locale);
        if (cached) {
          const refreshed = refreshCachedAstroMetadata(cached.fortune, metadata);
          if (refreshed.metadataChanged) {
            try {
              await saveCachedAstroFortune(AsyncStorage, currentDate, profile, refreshed.fortune, locale);
            } catch {
              // Cache migration should never prevent a valid fortune from rendering.
            }
          }
          if (requestVersion.current === version) setFortune(refreshed.fortune);
          return;
        }
      }

      if (!generateIfMissing) return;

      const [recentAdvice, recentCaDao] = await Promise.all([
        loadRecentAstroAdvice(AsyncStorage, currentDate, profile, 7, locale),
        loadRecentAstroCaDao(AsyncStorage, currentDate, profile, 14, locale),
      ]);
      const result = await requestAstroFortuneSlip({
        locale,
        astroMetadata: metadata,
        caDaoMode: 'daily',
        recentAdvice,
        recentCaDao,
        profileKey: getAstrologyProfileFingerprint(profile),
        localDate: formatLocalDateKey(currentDate),
        requestId: `cadao-${getAstrologyProfileFingerprint(profile)}-${formatLocalDateKey(currentDate)}`,
      });
      result.astroMetadata = metadata;
      try {
        await saveCachedAstroFortune(AsyncStorage, currentDate, profile, result, locale);
      } catch {
        // The freshly loaded result is still useful when local storage is unavailable.
      }

      if (requestVersion.current === version) {
        setFortune(result);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (caught) {
      if (requestVersion.current === version) {
        setFortune(null);
        setError(
          caught instanceof Error
            ? caught.message
            : 'Không thể kết nối máy chủ chiêm tinh. Vui lòng thử lại.'
        );
      }
    } finally {
      if (requestVersion.current === version) setLoading(false);
    }
  }, [
    currentDate,
    metadata,
    locale,
    profile?.birthDate,
    profile?.birthLocation?.placeId,
    profile?.birthTime,
    profile?.birthTimeAccuracy,
    profile?.fullName,
  ]);

  useEffect(() => {
    setFortune(null);
    void fetchFortune(true, false);
    return () => {
      requestVersion.current += 1;
    };
  }, [fetchFortune, localDateKey]);

  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout>;
    const scheduleNextDay = () => {
      const now = new Date();
      const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      midnightTimer = setTimeout(() => {
        setCurrentDate(new Date());
        scheduleNextDay();
      }, Math.max(1_000, nextDay.getTime() - now.getTime() + 250));
    };
    scheduleNextDay();
    return () => clearTimeout(midnightTimer);
  }, []);

  const retry = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await fetchFortune(false, true);
  }, [fetchFortune]);

  const share = useCallback(async () => {
    if (!fortune) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await Share.share({
        title: fortune.title || 'Lá Thăm Chiêm Tinh',
        message: `📜 LÁ THĂM CHIÊM TINH HÔM NAY: ${fortune.title || 'Quẻ Xăm Dân Gian'}\n\n${fortune.verse}\n\n🪞 Gương soi: ${fortune.mirror}\n🎒 Kế sách: ${fortune.advice}\n\n✨ Bốc quẻ chiêm tinh dân gian trên Numelyra.`,
      });
    } catch {
      // Người dùng có thể đóng bảng chia sẻ mà không chọn ứng dụng.
    }
  }, [fortune]);

  return {
    currentDate,
    fortune,
    metadata,
    loading,
    error,
    calculationError: localAstro.error,
    retry,
    share,
  };
}
