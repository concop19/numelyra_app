import React, { StrictMode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useDailyAstroFortune, type DailyAstroFortuneState } from './useDailyAstroFortune';
import {
  getAstroFortuneQuota,
  requestAstroFortuneSlip,
  type AstroFortuneSlip,
} from '../../services/astro/astroFortuneService';

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
  getAstroFortuneQuota: jest.fn(),
  requestAstroFortuneSlip: jest.fn(),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const requestFortuneMock = requestAstroFortuneSlip as jest.MockedFunction<typeof requestAstroFortuneSlip>;
const quotaMock = getAstroFortuneQuota as jest.MockedFunction<typeof getAstroFortuneQuota>;
const fortune: AstroFortuneSlip = {
  title: 'Tín hiệu hôm nay',
  verse: 'Một câu thơ',
  mirror: 'Một lời nhắn',
  advice: 'Một lời khuyên',
  anchorCaDao: { id: 1, content: 'Một câu ca dao' },
};

describe('useDailyAstroFortune cache hydration', () => {
  let renderer: ReactTestRenderer | undefined;

  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(async () => {
    storage.getItem.mockReset();
    storage.setItem.mockClear();
    requestFortuneMock.mockReset();
    quotaMock.mockReset();
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
      // Cache hydration was pending; all subsequent history reads are misses so
      // the new cache-first bootstrap can continue into AI generation.
      storage.getItem.mockResolvedValue(null);
      requestFortuneMock.mockResolvedValue(fortune);
      resolvers.forEach((resolve) => resolve());
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(state?.loading).toBe(false);
    expect(state?.fortune).toMatchObject(fortune);
    expect(requestFortuneMock).toHaveBeenCalledTimes(1);
  });

  it('shares one AI generation request across hook instances', async () => {
    storage.getItem.mockResolvedValue(null);
    let resolveRequest: ((value: AstroFortuneSlip) => void) | undefined;
    requestFortuneMock.mockImplementation(() => new Promise<AstroFortuneSlip>((resolve) => {
      resolveRequest = resolve;
    }));
    const states: Array<DailyAstroFortuneState | undefined> = [];
    const profile = {
      fullName: 'An Nguyễn',
      birthDate: '1998-10-20',
      gender: 'female' as const,
    };

    function Harness({ index }: { index: number }) {
      states[index] = useDailyAstroFortune(profile);
      return null;
    }

    await act(async () => {
      renderer = create(React.createElement(
        React.Fragment,
        null,
        React.createElement(Harness, { index: 0 }),
        React.createElement(Harness, { index: 1 }),
      ));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(requestFortuneMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRequest?.(fortune);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(states[0]?.fortune).toMatchObject(fortune);
    expect(states[1]?.fortune).toMatchObject(fortune);
  });

  it('hydrates but does not auto-generate for a secondary profile', async () => {
    storage.getItem.mockResolvedValue(null);
    requestFortuneMock.mockResolvedValue(fortune);
    let state: DailyAstroFortuneState | undefined;
    const profile = {
      fullName: 'Bình Nguyễn',
      birthDate: '1996-04-11',
      gender: 'male' as const,
    };

    function Harness() {
      state = useDailyAstroFortune(profile, 'secondary-profile', { autoGenerate: false });
      return null;
    }

    await act(async () => {
      renderer = create(React.createElement(Harness));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(requestFortuneMock).not.toHaveBeenCalled();

    await act(async () => {
      await state?.retry();
    });

    expect(requestFortuneMock).toHaveBeenCalledTimes(1);
    expect(state?.fortune).toMatchObject(fortune);
  });

  it('loads the server quota when the Astrology screen requests it', async () => {
    storage.getItem.mockResolvedValue(null);
    quotaMock.mockResolvedValue({ limit: 3, used: 1, remaining: 2, localDate: '2026-10-30' });
    let state: DailyAstroFortuneState | undefined;
    const profile = {
      fullName: 'Bình Nguyễn',
      birthDate: '1996-04-11',
      gender: 'male' as const,
    };

    function Harness() {
      state = useDailyAstroFortune(profile, 'secondary-profile', {
        autoGenerate: false,
        loadQuota: true,
      });
      return null;
    }

    await act(async () => {
      renderer = create(React.createElement(Harness));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(quotaMock).toHaveBeenCalled();
    expect(state?.quota).toEqual({ limit: 3, used: 1, remaining: 2, localDate: '2026-10-30' });
  });
});
