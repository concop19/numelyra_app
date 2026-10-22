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
        luckyTime: insight.luckyTime,
        directions: insight.directions,
        recommended: insight.recommended,
        avoid: insight.avoid,
        warning: insight.warning,
        astroEvidence: insight.astroEvidence,
        canChiEvidence: insight.canChiEvidence,
        canChiDay: insight.canChiDay,
      };
    });

    expect(entries).toHaveLength(DAY_COUNT);
    expect(new Set(entries.map((entry) => entry.date)).size).toBe(DAY_COUNT);
    expect(entries.every((entry) => entry.message.trim().length > 0)).toBe(true);

    const artifact = {
      generatedAt: new Date().toISOString(),
      purpose: 'Đánh giá chất lượng và độ đa dạng của thông điệp năng lượng trong 30 ngày liên tiếp.',
      profile,
      startDate: entries[0].date,
      endDate: entries[entries.length - 1].date,
      dayCount: entries.length,
      uniqueMessageCount: new Set(entries.map((entry) => entry.message)).size,
      entries,
    };
    const artifactDir = path.resolve(__dirname, '../../../artifacts/daily-insight');
    const artifactPath = path.join(artifactDir, `daily-insight-30-days-${entries[0].date}.json`);

    mkdirSync(artifactDir, { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    console.log(`Daily insight audit written to ${artifactPath}`);
  });
});
