type AnalyticsPayload = Record<string, string | number | boolean | undefined>;

export type AnalyticsEventName =
  | 'level_start'
  | 'move_correct'
  | 'move_wrong'
  | 'level_complete'
  | 'level_failed'
  | 'retry';

export function trackEvent(name: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  if (__DEV__) {
    console.log('[analytics]', name, payload);
  }
}
