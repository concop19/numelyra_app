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
  loadCachedAstroFortune,
  loadRecentAstroAdvice,
  saveCachedAstroFortune,
} from './dailyAstroFortune';

export interface DailyAstroFortuneState {
  currentDate: Date;
  fortune: AstroFortuneSlip | null;
  metadata: PureAstroFeatureMetadata | undefined;
  loading: boolean;
  error: string | null;
  retry(): Promise<void>;
  share(): Promise<void>;
}

function createAstroMetadata(profile: UserProfile | null | undefined, date: Date) {
  return generatePureAstroVector({
    birthDate: profile?.birthDate || '1998-10-20',
    birthTime: profile?.birthTime || undefined,
    fullName: profile?.fullName || 'Đương số',
    birthTimeAccuracy: profile?.birthTimeAccuracy,
    resolvedBirthLocation: profile?.birthLocation,
  }, date).metadata;
}

export function useDailyAstroFortune(profile?: UserProfile | null): DailyAstroFortuneState {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [fortune, setFortune] = useState<AstroFortuneSlip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const localDateKey = formatLocalDateKey(currentDate);

  const metadata = useMemo(
    () => fortune?.astroMetadata,
    [fortune]
  );

  const fetchFortune = useCallback(async (allowCache: boolean) => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);

    try {
      if (allowCache) {
        const cached = await loadCachedAstroFortune(AsyncStorage, currentDate, profile);
        if (cached) {
          const cachedFortune = cached.fortune;
          const needsMetadata = !cachedFortune.astroMetadata;
          if (needsMetadata) {
            cachedFortune.astroMetadata = createAstroMetadata(profile, currentDate);
          }
          if (needsMetadata) {
            try {
              await saveCachedAstroFortune(AsyncStorage, currentDate, profile, cachedFortune);
            } catch {
              // Cache migration should never prevent a valid fortune from rendering.
            }
          }
          if (requestVersion.current === version) setFortune(cachedFortune);
          return;
        }
      }

      const astroMetadata = createAstroMetadata(profile, currentDate);
      const recentAdvice = await loadRecentAstroAdvice(
        AsyncStorage,
        currentDate,
        profile
      );
      const result = await requestAstroFortuneSlip({
        astroMetadata,
        caDaoMode: 'daily',
        recentAdvice,
      });
      result.astroMetadata = astroMetadata;
      try {
        await saveCachedAstroFortune(AsyncStorage, currentDate, profile, result);
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
    profile?.birthDate,
    profile?.birthLocation?.placeId,
    profile?.birthTime,
    profile?.birthTimeAccuracy,
    profile?.fullName,
  ]);

  useEffect(() => {
    setFortune(null);
    void fetchFortune(true);
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
    await fetchFortune(false);
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

  return { currentDate, fortune, metadata, loading, error, retry, share };
}
