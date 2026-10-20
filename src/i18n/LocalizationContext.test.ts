import { interpolateTranslation, resolveDeviceLocale } from './localeUtils';

describe('localization helpers', () => {
  test('defaults only English device locales to English', () => {
    expect(resolveDeviceLocale('en')).toBe('en');
    expect(resolveDeviceLocale('en-US')).toBe('en');
    expect(resolveDeviceLocale('vi')).toBe('vi');
    expect(resolveDeviceLocale(null)).toBe('vi');
  });

  test('interpolates values without leaking missing placeholders', () => {
    expect(interpolateTranslation('{{time}} · {{direction}}', { time: '09:00', direction: 'East' }))
      .toBe('09:00 · East');
  });
});
