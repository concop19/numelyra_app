import { Platform } from 'react-native';
import * as Location from 'expo-location';
import tzLookup from 'tz-lookup';

import type { ResolvedBirthLocation } from '../../store/userProfile';

export interface BirthPlaceSuggestion {
  placeId: string;
  primaryText: string;
  secondaryText?: string;
  userLabel: string;
  latitude: number;
  longitude: number;
  timeZoneIdentifier: string;
}

function uniqueParts(parts: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  return parts.filter((part): part is string => {
    const normalized = part?.trim();
    if (!normalized) return false;
    const key = normalized.toLocaleLowerCase('vi-VN');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resolveTimeZone(latitude: number, longitude: number, nativeTimeZone?: string | null): string {
  if (nativeTimeZone?.trim()) return nativeTimeZone.trim();
  return tzLookup(latitude, longitude);
}

export function resolveBirthPlaceSuggestion(
  suggestion: BirthPlaceSuggestion
): ResolvedBirthLocation {
  return {
    placeId: suggestion.placeId,
    userLabel: suggestion.userLabel,
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
    timeZoneIdentifier: suggestion.timeZoneIdentifier,
    resolvedAt: new Date().toISOString(),
  };
}

function stablePlaceId(label: string, latitude: number, longitude: number): string {
  const value = `${label.trim().toLocaleLowerCase('vi-VN')}|${latitude.toFixed(4)}|${longitude.toFixed(4)}`;
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `expo-geocode-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

async function ensureAndroidGeocodingPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === 'granted') return;

  const requested = await Location.requestForegroundPermissionsAsync();
  if (requested.status !== 'granted') {
    throw new Error(
      'Android cần quyền vị trí để chuyển tên nơi sinh thành tọa độ. Numelyra không đọc GPS hiện tại của bạn.'
    );
  }
}

/**
 * Tạo đề xuất từ geocoder của iOS/Android. Không dùng Google Places API,
 * không cần API key và không đọc vị trí hiện tại của thiết bị.
 */
export async function searchBirthPlaceSuggestions(
  query: string,
  signal?: AbortSignal
): Promise<BirthPlaceSuggestion[]> {
  const normalized = query.trim();
  if (normalized.length < 3 || signal?.aborted) return [];
  if (Platform.OS === 'web') return [];

  await ensureAndroidGeocodingPermission();
  const matches = await Location.geocodeAsync(normalized);
  if (signal?.aborted) return [];

  const suggestions = await Promise.all(
    matches.slice(0, 5).map(async (match): Promise<BirthPlaceSuggestion | null> => {
      if (!Number.isFinite(match.latitude) || !Number.isFinite(match.longitude)) return null;

      const addresses = await Location.reverseGeocodeAsync({
        latitude: match.latitude,
        longitude: match.longitude,
      });
      if (signal?.aborted) return null;

      const address = addresses[0];
      const primaryText = address?.city
        || address?.district
        || address?.name
        || normalized;
      const secondaryParts = uniqueParts([
        address?.district === primaryText ? null : address?.district,
        address?.region === primaryText ? null : address?.region,
        address?.country,
      ]);
      const composedLabel = uniqueParts([
        primaryText,
        ...secondaryParts,
      ]).join(', ');
      const userLabel = composedLabel || address?.formattedAddress || normalized;

      try {
        return {
          placeId: stablePlaceId(userLabel, match.latitude, match.longitude),
          primaryText,
          secondaryText: secondaryParts.join(', ') || undefined,
          userLabel,
          latitude: match.latitude,
          longitude: match.longitude,
          timeZoneIdentifier: resolveTimeZone(
            match.latitude,
            match.longitude,
            address?.timezone
          ),
        };
      } catch {
        return null;
      }
    })
  );

  const seen = new Set<string>();
  return suggestions.filter((item): item is BirthPlaceSuggestion => {
    if (!item || seen.has(item.placeId)) return false;
    seen.add(item.placeId);
    return true;
  });
}

/**
 * Phân giải tên nơi sinh bằng geocoder hệ điều hành. Hàm này không gọi
 * getCurrentPositionAsync và không đọc vị trí hiện tại của thiết bị.
 */
export async function resolveBirthLocation(query: string): Promise<ResolvedBirthLocation> {
  const userLabel = query.trim();
  if (userLabel.length < 3) {
    throw new Error('Vui lòng nhập ít nhất 3 ký tự cho nơi sinh.');
  }
  if (Platform.OS === 'web') {
    throw new Error('Tra cứu nơi sinh hiện hỗ trợ trên ứng dụng iOS và Android.');
  }

  await ensureAndroidGeocodingPermission();
  const matches = await Location.geocodeAsync(userLabel);
  const first = matches[0];
  if (!first || !Number.isFinite(first.latitude) || !Number.isFinite(first.longitude)) {
    throw new Error('Không tìm thấy địa điểm phù hợp. Hãy thêm tỉnh/thành phố hoặc quốc gia.');
  }

  let timeZoneIdentifier: string;
  try {
    timeZoneIdentifier = resolveTimeZone(first.latitude, first.longitude);
  } catch {
    throw new Error('Không xác định được múi giờ của nơi sinh này.');
  }

  return {
    placeId: stablePlaceId(userLabel, first.latitude, first.longitude),
    userLabel,
    latitude: first.latitude,
    longitude: first.longitude,
    timeZoneIdentifier,
    resolvedAt: new Date().toISOString(),
  };
}
