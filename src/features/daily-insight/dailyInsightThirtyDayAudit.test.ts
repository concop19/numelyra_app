import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import type { UserProfile } from '../../store/userProfile';
import { buildDailyInsight } from './dailyInsight';

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
    const luckyColors = entries.map((entry) => entry.luckyColor.hex);
    let longestLuckyColorRun = 1;
    let currentLuckyColorRun = 1;
    for (let index = 1; index < luckyColors.length; index += 1) {
      currentLuckyColorRun = luckyColors[index] === luckyColors[index - 1]
        ? currentLuckyColorRun + 1
        : 1;
      longestLuckyColorRun = Math.max(longestLuckyColorRun, currentLuckyColorRun);
    }
    expect(new Set(luckyColors).size).toBeGreaterThanOrEqual(10);
    expect(longestLuckyColorRun).toBeLessThanOrEqual(3);

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
