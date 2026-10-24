import {
  buildDailyAstroMetrics,
  calculateDailyMetricScore,
  getDailyMetricAssignments,
} from './dailyMetricEngine';
import type { UserProfile } from '../../store/userProfile';

describe('dailyMetricEngine', () => {
  test('maps personal planets into the four human-facing metrics', () => {
    expect(getDailyMetricAssignments('Moon', 'Saturn')).toEqual([
      { metric: 'emotion', weight: 1 },
    ]);
    expect(getDailyMetricAssignments('Saturn', 'Mercury')).toEqual([
      { metric: 'focus', weight: 1 },
    ]);
    expect(getDailyMetricAssignments('Mercury', 'Venus')).toEqual([
      { metric: 'focus', weight: 0.6 },
      { metric: 'connection', weight: 0.4 },
    ]);
    expect(getDailyMetricAssignments('Mars', 'Sun')).toEqual([
      { metric: 'energy', weight: 1 },
    ]);
  });

  test('reduces only the natal Moon component when birth time is estimated', () => {
    expect(getDailyMetricAssignments('Saturn', 'Moon', true)).toEqual([
      { metric: 'emotion', weight: 0.65 },
    ]);
    expect(getDailyMetricAssignments('Moon', 'Saturn', true)).toEqual([
      { metric: 'emotion', weight: 1 },
    ]);
    expect(getDailyMetricAssignments('Moon', 'Moon', true)).toEqual([
      { metric: 'emotion', weight: 0.86 },
    ]);
  });

  test('keeps neutral days centered and bounds strong support or challenge', () => {
    expect(calculateDailyMetricScore([])).toBe(50);
    expect(calculateDailyMetricScore([10, 10, 10])).toBe(85);
    expect(calculateDailyMetricScore([-10, -10, -10])).toBe(15);
    expect(calculateDailyMetricScore([0.8, -0.8])).toBe(50);
  });

  test('builds one deterministic, bounded set of four metrics for a local day', () => {
    const profile: UserProfile = {
      fullName: 'Metric Test',
      birthDate: '1998-06-15',
      gender: 'female',
    };
    const date = new Date(2026, 9, 23, 12);
    const first = buildDailyAstroMetrics(profile, date, 'vi');
    const second = buildDailyAstroMetrics(profile, date, 'vi');

    expect(second).toEqual(first);
    expect(first.dateKey).toBe('2026-10-23');
    expect(first.confidence).toBe('estimated');
    expect(Object.keys(first.metrics)).toEqual(['energy', 'emotion', 'focus', 'connection']);
    for (const metric of Object.values(first.metrics)) {
      expect(metric.score).toBeGreaterThanOrEqual(15);
      expect(metric.score).toBeLessThanOrEqual(85);
      expect(metric.summary.length).toBeGreaterThan(0);
      expect(metric.evidence.length).toBeLessThanOrEqual(3);
      expect(metric.evidence.every((item) => item.orb <= 1)).toBe(true);
    }
  });

  test('marks exact birth data as full confidence', () => {
    const profile: UserProfile = {
      fullName: 'Complete Metric Test',
      birthDate: '1998-06-15',
      birthTime: '08:30',
      birthTimeAccuracy: 'exact',
      birthPlace: 'Hà Nội',
      birthLocation: {
        placeId: 'hanoi-test',
        userLabel: 'Hà Nội',
        latitude: 21.0278,
        longitude: 105.8342,
        timeZoneIdentifier: 'Asia/Bangkok',
        resolvedAt: '2026-10-23T00:00:00.000Z',
      },
      gender: 'female',
    };

    expect(buildDailyAstroMetrics(profile, new Date(2026, 9, 23, 12), 'en').confidence).toBe('full');
  });

  test('keeps a birth time without a resolved place in estimated mode', () => {
    const profile: UserProfile = {
      fullName: 'Missing Place',
      birthDate: '1998-06-15',
      birthTime: '08:30',
      birthTimeAccuracy: 'exact',
      gender: 'female',
    };
    expect(buildDailyAstroMetrics(profile, new Date(2026, 9, 23, 12), 'vi').confidence).toBe('estimated');
  });
});
