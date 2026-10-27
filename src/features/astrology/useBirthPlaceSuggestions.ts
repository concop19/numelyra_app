import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import type { AppLocale } from '../../i18n/translations';
import {
  searchBirthPlaceSuggestions,
  type BirthPlaceSuggestion,
} from '../../services/astro/birthLocation';

interface Options {
  query: string;
  existingLabel?: string;
  selectedLabel?: string;
  enabled?: boolean;
  locale?: AppLocale;
}

/**
 * Shared, debounced birth-place lookup used by onboarding and Astrology.
 * Coordinates are only resolved after the user has typed enough text and the
 * results are immediately shown, which keeps native geocoding usage bounded.
 */
export function useBirthPlaceSuggestions({
  query,
  existingLabel,
  selectedLabel,
  enabled = true,
  locale = 'vi',
}: Options) {
  const [suggestions, setSuggestions] = useState<BirthPlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const normalized = query.trim();
    const normalizedExisting = existingLabel?.trim();

    if (!enabled) {
      setSuggestions([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    if (
      Platform.OS === 'web'
      && normalized.length >= 3
      && normalized !== normalizedExisting
    ) {
      setSuggestions([]);
      setSearching(false);
      setSearchError(locale === 'en'
        ? 'Birth-place lookup is currently available in the iOS and Android apps.'
        : 'Tra cứu nơi sinh mới hiện hỗ trợ trên ứng dụng iOS và Android.');
      return;
    }

    if (
      normalized.length < 3
      || normalized === normalizedExisting
      || selectedLabel === normalized
    ) {
      setSuggestions([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      setSearchError(null);
      void searchBirthPlaceSuggestions(normalized, controller.signal)
        .then((items) => {
          setSuggestions(items);
          if (items.length === 0) {
            setSearchError(locale === 'en'
              ? 'No matching place was found.'
              : 'Không tìm thấy địa điểm phù hợp.');
          }
        })
        .catch((caught) => {
          if (caught instanceof Error && caught.name === 'AbortError') return;
          setSuggestions([]);
          setSearchError(locale === 'en'
            ? 'Unable to load place suggestions.'
            : 'Không thể tải đề xuất địa điểm.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, existingLabel, locale, query, selectedLabel]);

  return { suggestions, searching, searchError };
}
