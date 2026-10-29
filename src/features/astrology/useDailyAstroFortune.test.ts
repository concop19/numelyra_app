import React, { StrictMode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useDailyAstroFortune, type DailyAstroFortuneState } from './useDailyAstroFortune';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(async () => undefined),
  },
}));

jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  notificationAsync: jest.fn(async () => undefined),
  impactAsync: jest.fn(async () => undefined),
}));

jest.mock('../../i18n/LocalizationContext', () => ({
  useLocalization: () => ({ locale: 'vi' }),
}));

jest.mock('../../services/astro/astroVectorEngine', () => ({
  generatePureAstroVector: () => ({
    metadata: { engineVersion: 'test-engine' },
  }),
}));

jest.mock('../../services/astro/astroFortuneService', () => ({
  requestAstroFortuneSlip: jest.fn(),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('useDailyAstroFortune cache hydration', () => {
  let renderer: ReactTestRenderer | undefined;

  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(async () => {
    storage.getItem.mockReset();
    if (renderer) {
      await act(async () => renderer?.unmount());
      renderer = undefined;
    }
  });

  it('finishes loading when Strict Mode restarts a pending cache effect', async () => {
    const resolvers: Array<() => void> = [];
    storage.getItem.mockImplementation(() => new Promise<string | null>((resolve) => {
      resolvers.push(() => resolve(null));
    }));
    let state: DailyAstroFortuneState | undefined;
    const profile = {
      fullName: 'An Nguyễn',
      birthDate: '1998-10-20',
      gender: 'female' as const,
    };

    function Harness() {
      state = useDailyAstroFortune(profile);
      return null;
    }

    await act(async () => {
      renderer = create(React.createElement(StrictMode, null, React.createElement(Harness)));
    });

    expect(storage.getItem).toHaveBeenCalledTimes(2);
    expect(state?.loading).toBe(true);

    await act(async () => {
      resolvers.forEach((resolve) => resolve());
      await Promise.resolve();
    });

    expect(state?.loading).toBe(false);
    expect(state?.fortune).toBeNull();
  });
});
