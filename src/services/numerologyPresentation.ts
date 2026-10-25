import { translate, type AppLocale } from '../i18n/translations';
import type { CalculatedIndicator } from './numerologyEngine';

/** Presentation only: preserve stable calculation/lookup values in the engine. */
export function formatIndicatorValue(value: string | number, locale: AppLocale): string {
  const raw = String(value);
  if (raw === 'Không thiếu') return translate(locale, 'indicator.noneMissing');
  if (raw === 'Không có nợ nghiệp') return translate(locale, 'indicator.noneDebts');
  if (raw === 'Không xác định') return translate(locale, 'indicator.unknown');
  return locale === 'en' ? raw.replace(/Đủ bộ/g, 'Complete').replace(/Có một phần/g, 'Partial').replace(/Trống/g, 'Empty') : raw;
}

export function formatIndicatorDisplayValue(indicator: CalculatedIndicator, locale: AppLocale): string {
  if (indicator.chartData) return translate(locale, indicator.key === 'arrows' ? 'indicator.arrowStates' : 'indicator.matrix');
  return formatIndicatorValue(indicator.value, locale);
}
