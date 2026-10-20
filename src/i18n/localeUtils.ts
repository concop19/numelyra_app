import type { AppLocale } from './translations';

export function resolveDeviceLocale(languageCode?: string | null): AppLocale {
  return languageCode?.toLowerCase().startsWith('en') ? 'en' : 'vi';
}

export function interpolateTranslation(value: string, values?: Record<string, string | number>): string {
  if (!values) return value;
  return value.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(values[key] ?? ''));
}
