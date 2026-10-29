import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Share } from 'react-native';
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
  retry(): Promise<AstroFortuneSlip | null>;
  share(): Promise<void>;
}

export interface DailyAstroFortuneOptions {
  autoGenerate?: boolean;
}

interface PendingFortuneRequest {
  key: string;
  promise: Promise<AstroFortuneSlip | null>;
}

// A screen can keep Chat mounted while Astrology mounts another copy of this
// hook. Share the actual AI request across hook instances so a profile/date/
// locale can never create two simultaneous Fortune requests.
const sharedGenerationRequests = new Map<string, Promise<AstroFortuneSlip>>();

function createAstroMetadata(profile: UserProfile, date: Date) {
  return generatePureAstroVector({
    birthDate: profile.birthDate,
    birthTime: profile.birthTime || undefined,
    fullName: profile.fullName,
    birthTimeAccuracy: profile.birthTimeAccuracy,
    resolvedBirthLocation: profile.birthLocation,
  }, date).metadata;
}

export function useDailyAstroFortune(
  profile?: UserProfile | null,
  profileId?: string | null,
  options: DailyAstroFortuneOptions = {},
): DailyAstroFortuneState {
  const { locale } = useLocalization();
  const autoGenerate = options.autoGenerate !== false;
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [fortune, setFortune] = useState<AstroFortuneSlip | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const activeRequestKey = useRef('');
  const hydrationRequest = useRef<PendingFortuneRequest | null>(null);
  const generationRequest = useRef<PendingFortuneRequest | null>(null);
  const cacheProfile = useMemo(() => profile ? { ...profile, id: profileId } : null, [
    profile,
    profileId,
  ]);
  const localDateKey = formatLocalDateKey(currentDate);
  const requestKey = `${locale}:${localDateKey}:${getAstrologyProfileFingerprint(cacheProfile)}`;
  activeRequestKey.current = requestKey;

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

  const hydrateCachedFortune = useCallback(async (): Promise<AstroFortuneSlip | null> => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);

    if (!metadata) {
      setFortune(null);
      setLoading(false);
      return null;
    }

    try {
      const cached = await loadCachedAstroFortune(AsyncStorage, currentDate, cacheProfile, locale);
      if (!cached) return null;

      const refreshed = refreshCachedAstroMetadata(cached.fortune, metadata);
      if (refreshed.metadataChanged) {
        try {
          await saveCachedAstroFortune(AsyncStorage, currentDate, cacheProfile, refreshed.fortune, locale);
        } catch {
          // Cache migration should never prevent a valid fortune from rendering.
        }
      }
      if (requestVersion.current !== version || activeRequestKey.current !== requestKey) return null;
      setFortune(refreshed.fortune);
      return refreshed.fortune;
    } finally {
      if (requestVersion.current === version) setLoading(false);
    }
  }, [cacheProfile, currentDate, locale, metadata, requestKey]);

  const readCache = useCallback((): Promise<AstroFortuneSlip | null> => {
    const pending = hydrationRequest.current;
    if (pending?.key === requestKey) return pending.promise;

    const promise = hydrateCachedFortune();
    hydrationRequest.current = { key: requestKey, promise };
    void promise.finally(() => {
      if (hydrationRequest.current?.promise === promise) hydrationRequest.current = null;
    });
    return promise;
  }, [hydrateCachedFortune, requestKey]);

  const generateFortune = useCallback(async (): Promise<AstroFortuneSlip | null> => {
    if (activeRequestKey.current !== requestKey) return null;
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);

    if (!metadata) {
      setFortune(null);
      setLoading(false);
      return null;
    }

    try {
      let sharedRequest = sharedGenerationRequests.get(requestKey);
      if (!sharedRequest) {
        sharedRequest = (async () => {
          const [recentAdvice, recentCaDao] = await Promise.all([
            loadRecentAstroAdvice(AsyncStorage, currentDate, cacheProfile, 7, locale),
            loadRecentAstroCaDao(AsyncStorage, currentDate, cacheProfile, 14, locale),
          ]);
          const result = await requestAstroFortuneSlip({
            locale,
            astroMetadata: metadata,
            caDaoMode: 'daily',
            recentAdvice,
            recentCaDao,
            profileKey: getAstrologyProfileFingerprint(cacheProfile),
            localDate: formatLocalDateKey(currentDate),
            requestId: `cadao-${getAstrologyProfileFingerprint(cacheProfile)}-${formatLocalDateKey(currentDate)}`,
          });
          result.astroMetadata = metadata;
          try {
            await saveCachedAstroFortune(AsyncStorage, currentDate, cacheProfile, result, locale);
          } catch {
            // The freshly loaded result is still useful when local storage is unavailable.
          }
          return result;
        })();
        sharedGenerationRequests.set(requestKey, sharedRequest);
        void sharedRequest.finally(() => {
          if (sharedGenerationRequests.get(requestKey) === sharedRequest) {
            sharedGenerationRequests.delete(requestKey);
          }
        }).catch(() => undefined);
      }

      const result = await sharedRequest;

      if (requestVersion.current !== version || activeRequestKey.current !== requestKey) return null;
      setFortune(result);
      return result;
    } catch (caught) {
      if (requestVersion.current === version) {
        setFortune(null);
        setError(
          caught instanceof Error
            ? caught.message
            : 'Không thể kết nối máy chủ chiêm tinh. Vui lòng thử lại.'
        );
      }
      return null;
    } finally {
      if (requestVersion.current === version) setLoading(false);
    }
  }, [cacheProfile, currentDate, locale, metadata, requestKey]);

  const ensureFortune = useCallback(async (): Promise<AstroFortuneSlip | null> => {
    if (fortune) return fortune;

    const cached = await readCache();
    if (cached) return cached;
    if (activeRequestKey.current !== requestKey) return null;

    const pending = generationRequest.current;
    if (pending?.key === requestKey) return pending.promise;

    const promise = generateFortune();
    generationRequest.current = { key: requestKey, promise };
    try {
      return await promise;
    } finally {
      if (generationRequest.current?.promise === promise) generationRequest.current = null;
    }
  }, [fortune, generateFortune, readCache, requestKey]);

  useEffect(() => {
    setFortune(null);
    // Primary profiles preserve the cache-first automatic bootstrap. Secondary
    // profiles only hydrate an existing result; a cache miss waits for the
    // user's explicit "view Fortune" action so browsing cannot consume a slot.
    void (autoGenerate ? ensureFortune() : readCache());
    return () => {
      requestVersion.current += 1;
      // React Strict Mode runs effect setup -> cleanup -> setup in development.
      // Detach the cancelled hydration so the second setup starts a fresh read;
      // otherwise it reuses a promise whose version can no longer clear loading.
      if (hydrationRequest.current?.key === requestKey) {
        hydrationRequest.current = null;
      }
    };
  }, [autoGenerate, requestKey]);

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

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      const now = new Date();
      if (formatLocalDateKey(now) !== formatLocalDateKey(currentDate)) {
        setCurrentDate(now);
        return;
      }
      // A failed request has no cache, so foregrounding the app is a safe time
      // to retry. Cache hits and in-flight work remain de-duplicated.
      void (autoGenerate ? ensureFortune() : readCache());
    });
    return () => subscription.remove();
  }, [autoGenerate, currentDate, ensureFortune, readCache]);

  const retry = useCallback(async (): Promise<AstroFortuneSlip | null> => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    return ensureFortune();
  }, [ensureFortune]);

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
