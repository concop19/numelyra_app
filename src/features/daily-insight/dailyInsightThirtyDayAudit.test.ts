declare const require: (moduleName: string) => unknown;
declare const __dirname: string;

const { mkdirSync, writeFileSync } = require('fs') as {
  mkdirSync(path: string, options: { recursive: boolean }): void;
  writeFileSync(path: string, data: string, encoding: string): void;
};
const path = require('path') as {
  resolve(...segments: string[]): string;
  join(...segments: string[]): string;
};

import type { UserProfile } from '../../store/userProfile';
import { buildDailyInsight, buildDailyLuckyColor } from './dailyInsight';

const DAY_COUNT = 30;

function atLocalNoon(date: Date): Date {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  return result;
}

function addLocalDays(date: Date, days: number): Date {
  const result = atLocalNoon(date);
  result.setDate(result.getDate() + days);
  return result;
}

describe('daily insight 30-day audit', () => {
  test('keeps the 24-color cycle diverse across profiles and seasons', () => {
    const profiles: UserProfile[] = [
      { fullName: 'Summer Profile', birthDate: '1998-06-15', gender: 'female' },
      { fullName: 'Winter Profile', birthDate: '1990-01-01', gender: 'male' },
      { fullName: 'Autumn Profile', birthDate: '1985-11-23', gender: 'female' },
      {
        fullName: 'Complete Profile',
        birthDate: '2001-03-21',
        birthTime: '08:30',
        birthTimeAccuracy: 'exact',
        gender: 'male',
        birthLocation: {
          placeId: 'hanoi',
          userLabel: 'Hà Nội, Việt Nam',
          latitude: 21.0278,
          longitude: 105.8342,
          timeZoneIdentifier: 'Asia/Bangkok',
          resolvedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    ];
    const starts = [
      new Date(2026, 0, 1, 12),
      new Date(2026, 3, 1, 12),
      new Date(2026, 6, 1, 12),
      new Date(2026, 9, 1, 12),
    ];

    for (const profile of profiles) {
      for (const start of starts) {
        const colorIds = Array.from({ length: DAY_COUNT }, (_, offset) => (
          buildDailyLuckyColor(profile, addLocalDays(start, offset), 'vi').id
        ));
        let longestRun = 1;
        let currentRun = 1;
        for (let index = 1; index < colorIds.length; index += 1) {
          currentRun = colorIds[index] === colorIds[index - 1] ? currentRun + 1 : 1;
          longestRun = Math.max(longestRun, currentRun);
        }
        expect(new Set(colorIds).size).toBeGreaterThanOrEqual(22);
        expect(longestRun).toBeLessThanOrEqual(2);
      }
    }
  });

  test('writes 30 daily messages from today to a JSON artifact', () => {
    const profile: UserProfile = {
      fullName: 'Daily Insight Audit User',
      birthDate: '1998-06-15',
      gender: 'female',
    };
    const startDate = atLocalNoon(new Date());
    const entries = Array.from({ length: DAY_COUNT }, (_, dayOffset) => {
      const insight = buildDailyInsight(profile, addLocalDays(startDate, dayOffset), 'vi');
      return {
        day: dayOffset + 1,
        dayOffset,
        date: insight.dateKey,
        message: insight.personality,
        luckyColor: insight.luckyColor,
        luckyTime: insight.luckyTime,
        directions: insight.directions,
        recommended: insight.recommended,
        avoid: insight.avoid,
        warning: insight.warning,
        astroMetrics: insight.astroMetrics,
        astroEvidence: insight.astroEvidence,
        canChiEvidence: insight.canChiEvidence,
        canChiDay: insight.canChiDay,
      };
    });

    expect(entries).toHaveLength(DAY_COUNT);
    expect(new Set(entries.map((entry) => entry.date)).size).toBe(DAY_COUNT);
    expect(entries.every((entry) => entry.message.trim().length > 0)).toBe(true);
    const luckyColors = entries.map((entry) => entry.luckyColor.id);
    let longestLuckyColorRun = 1;
    let currentLuckyColorRun = 1;
    for (let index = 1; index < luckyColors.length; index += 1) {
      currentLuckyColorRun = luckyColors[index] === luckyColors[index - 1]
        ? currentLuckyColorRun + 1
        : 1;
      longestLuckyColorRun = Math.max(longestLuckyColorRun, currentLuckyColorRun);
    }
    expect(new Set(luckyColors).size).toBeGreaterThanOrEqual(22);
    expect(longestLuckyColorRun).toBeLessThanOrEqual(2);

    const artifact = {
      generatedAt: new Date().toISOString(),
      purpose: 'Đánh giá chất lượng và độ đa dạng của thông điệp năng lượng trong 30 ngày liên tiếp.',
      profile,
      startDate: entries[0].date,
      endDate: entries[entries.length - 1].date,
      dayCount: entries.length,
      uniqueMessageCount: new Set(entries.map((entry) => entry.message)).size,
      uniqueLuckyColorCount: new Set(luckyColors).size,
      longestLuckyColorRun,
      metricRanges: Object.fromEntries(
        (['energy', 'emotion', 'focus', 'connection'] as const).map((metric) => {
          const scores = entries.map((entry) => entry.astroMetrics.metrics[metric].score);
          return [metric, { min: Math.min(...scores), max: Math.max(...scores) }];
        }),
      ),
      entries,
    };
    const artifactDir = path.resolve(__dirname, '../../../artifacts/daily-insight');
    const artifactPath = path.join(artifactDir, `daily-insight-30-days-${entries[0].date}.json`);

    mkdirSync(artifactDir, { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    console.log(`Daily insight audit written to ${artifactPath}`);
  });
});
