import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales, useLocales } from 'expo-localization';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  translations,
  translate,
  type AppLocale,
  type LanguagePreference,
  type TranslationKey,
} from './translations';
import { resolveDeviceLocale } from './localeUtils';

const STORAGE_KEY = '@numelyra:language-preference:v1';

interface LocalizationValue {
  locale: AppLocale;
  preference: LanguagePreference;
  ready: boolean;
  setPreference(preference: LanguagePreference): Promise<void>;
  t(key: TranslationKey, values?: Record<string, string | number>): string;
  /** Select one-off localized copy without forcing every screen-specific sentence into the shared catalog. */
  l(vi: string, en: string): string;
  formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string;
  formatTime(date: Date): string;
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
}

const LocalizationContext = createContext<LocalizationValue | null>(null);

export function LocalizationProvider({ children }: React.PropsWithChildren) {
  const deviceLocales = useLocales();
  const [preference, setPreferenceState] = useState<LanguagePreference>('system');
  const [ready, setReady] = useState(false);
  const deviceLocale = resolveDeviceLocale(deviceLocales[0]?.languageCode ?? getLocales()[0]?.languageCode);
  const locale = preference === 'system' ? deviceLocale : preference;

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored === 'system' || stored === 'vi' || stored === 'en') setPreferenceState(stored);
      })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  const setPreference = useCallback(async (next: LanguagePreference) => {
    setPreferenceState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback((key: TranslationKey, values?: Record<string, string | number>) => (
    translate(locale, key, values)
  ), [locale]);

  const value = useMemo<LocalizationValue>(() => ({
    locale,
    preference,
    ready,
    setPreference,
    t,
    l: (vi, en) => (locale === 'en' ? en : vi),
    formatDate: (date, options) => new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'vi-VN', options).format(date),
    formatTime: (date) => new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'vi-VN', {
      hour: '2-digit', minute: '2-digit', hour12: locale === 'en',
    }).format(date),
    formatNumber: (number, options) => new Intl.NumberFormat(
      locale === 'en' ? 'en-US' : 'vi-VN',
      options,
    ).format(number),
  }), [locale, preference, ready, setPreference, t]);

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useLocalization(): LocalizationValue {
  const value = useContext(LocalizationContext);
  if (!value) throw new Error('useLocalization must be used inside LocalizationProvider');
  return value;
}

