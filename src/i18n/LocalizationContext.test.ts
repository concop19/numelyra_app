import { interpolateTranslation, resolveDeviceLocale } from './localeUtils';
import React, { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalizationProvider, useLocalization } from './LocalizationContext';

const mockStorage = new Map<string, string>();
const mockDeviceLocale = { languageCode: 'vi' };
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => { mockStorage.set(key, value); }),
}));
jest.mock('expo-localization', () => ({
  getLocales: () => [mockDeviceLocale], useLocales: () => [mockDeviceLocale],
}));

describe('localization helpers', () => {
  test('uses Vietnamese for Vietnamese devices and English for unsupported devices', () => {
    expect(resolveDeviceLocale('en')).toBe('en');
    expect(resolveDeviceLocale('en-US')).toBe('en');
    expect(resolveDeviceLocale('vi')).toBe('vi');
    expect(resolveDeviceLocale('vi-VN')).toBe('vi');
    expect(resolveDeviceLocale('fr')).toBe('en');
    expect(resolveDeviceLocale('th')).toBe('en');
    expect(resolveDeviceLocale(null)).toBe('en');
  });

  test('interpolates values without leaking missing placeholders', () => {
    expect(interpolateTranslation('{{time}} · {{direction}}', { time: '09:00', direction: 'East' }))
      .toBe('09:00 · East');
  });
});

describe('language preference lifecycle', () => {
  const storageKey = '@numelyra:language-preference:v1';
  let renderer: ReactTestRenderer;
  let onboarding: ReturnType<typeof useLocalization>;
  let settings: ReturnType<typeof useLocalization>;
  let draft: string;
  let setDraft: (value: string) => void;

  function OnboardingProbe() {
    onboarding = useLocalization();
    [draft, setDraft] = useState('saved onboarding name');
    return null;
  }
  function SettingsProbe() {
    settings = useLocalization();
    return null;
  }
  const app = () => React.createElement(LocalizationProvider, null,
    React.createElement(OnboardingProbe), React.createElement(SettingsProbe));

  beforeEach(() => { mockStorage.clear(); mockDeviceLocale.languageCode = 'vi'; jest.clearAllMocks(); });
  afterEach(async () => { if (renderer) await act(async () => renderer.unmount()); });

  it('shares instant changes, preserves child form state, and restores the selection after restart', async () => {
    await act(async () => { renderer = create(app()); });
    expect(onboarding!.ready).toBe(true);
    await act(async () => { setDraft!('Linh'); await onboarding!.setPreference('en'); });
    expect(settings!.locale).toBe('en');
    expect(draft!).toBe('Linh');
    expect(mockStorage.get(storageKey)).toBe('en');
    await act(async () => { await settings!.setPreference('vi'); });
    expect(onboarding!.locale).toBe('vi');
    await act(async () => { renderer.unmount(); renderer = create(app()); });
    expect(onboarding!.preference).toBe('vi');
    expect(onboarding!.locale).toBe('vi');
  });

  it('follows device changes only in Auto mode and falls back to English for unsupported locales', async () => {
    await act(async () => { renderer = create(app()); });
    expect(onboarding!.locale).toBe('vi');
    mockDeviceLocale.languageCode = 'fr';
    await act(async () => { renderer.update(app()); });
    expect(onboarding!.locale).toBe('en');
    await act(async () => { await onboarding!.setPreference('vi'); });
    mockDeviceLocale.languageCode = 'en';
    await act(async () => { renderer.update(app()); });
    expect(onboarding!.locale).toBe('vi');
    await act(async () => { await onboarding!.setPreference('system'); });
    expect(settings!.locale).toBe('en');
  });

  it('keeps the last rapid selection on disk even when earlier writes are delayed', async () => {
    await act(async () => { renderer = create(app()); });
    let release!: () => void;
    jest.mocked(AsyncStorage.setItem).mockImplementationOnce((key, value) => new Promise<void>((resolve) => {
      release = () => { mockStorage.set(key, value); resolve(); };
    }));
    let first!: Promise<void>, last!: Promise<void>;
    await act(async () => {
      first = onboarding!.setPreference('vi');
      last = onboarding!.setPreference('en');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(onboarding!.locale).toBe('en');
    await act(async () => { release(); await Promise.all([first, last]); });
    expect(mockStorage.get(storageKey)).toBe('en');
  });
});
