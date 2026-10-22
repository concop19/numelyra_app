/// <reference types="node" />

import { spawnSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import { buildContextualCaDaoSqlQuery } from '../../../db/cadaoQuery';
import type { CaDaoItem } from '../../../db/cadaoService';
import { authenticatedFetch } from '../../apiConfig';
import { buildAstrologyCaDaoMatchPlan } from '../astrologyCaDaoMatcher';
import {
  requestAstroFortuneSlip,
  resetAstroFortuneRuleContextCapabilityForTests,
  type AstroFortuneRequestPayload,
} from '../astroFortuneService';
import { generatePureAstroVector } from '../astroVectorEngine';

jest.mock('../../apiConfig', () => ({
  API_ENDPOINTS: { ASTRO_FORTUNE: '/api/astro/fortune' },
  authenticatedFetch: jest.fn(),
}));

jest.mock('../../../db/cadaoService', () => ({
  getContextualDailyCaDao: jest.fn(),
  getDailyCaDao: jest.fn(),
  getRandomCaDao: jest.fn(),
}));

const fetchMock = authenticatedFetch as jest.MockedFunction<typeof authenticatedFetch>;
const projectRoot = path.resolve(__dirname, '../../../..');
const databasePath = path.join(projectRoot, 'assets', 'cadao.db');
const pythonHelperPath = path.join(__dirname, 'read_cadao_query.py');
const artifactPath = path.join(
  projectRoot,
  'artifacts',
  'astrology',
  'astro-fortune-requests-2026-10-22-to-2026-11-20.json'
);

interface QuerySpec {
  sql: string;
  parameters: Array<string | number>;
}

interface AuditRequest {
  sequence: number;
  localDate: string;
  transitInstant: string;
  selectedCaDao: CaDaoItem;
  caDaoMatchPlan: {
    categories: string[];
    keywords: string[];
    reason: string;
    seed: string;
  };
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: AstroFortuneRequestPayload;
  };
}

function response(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn(async () => body),
  } as unknown as Response;
}

function runReadOnlyCaDaoQueries(querySpecs: QuerySpec[]): Array<CaDaoItem | null> {
  const commands = [process.env.PYTHON, 'python', 'python3']
    .filter((value): value is string => !!value);
  const failures: string[] = [];

  for (const command of [...new Set(commands)]) {
    const result = spawnSync(command, [pythonHelperPath, databasePath], {
      input: JSON.stringify(querySpecs),
      encoding: 'utf8',
      windowsHide: true,
    });
    if (!result.error && result.status === 0) {
      return JSON.parse(result.stdout) as Array<CaDaoItem | null>;
    }
    failures.push(`${command}: ${result.error?.message ?? result.stderr.trim()}`);
  }

  throw new Error(`Không thể đọc ca dao.db bằng Python ở chế độ read-only. ${failures.join(' | ')}`);
}

function makeDateFixture(offset: number) {
  const transitInstant = new Date(Date.UTC(2026, 9, 22 + offset, 5, 0, 0));
  const localDate = transitInstant.toISOString().slice(0, 10);
  const calendarDate = new Date(
    transitInstant.getUTCFullYear(),
    transitInstant.getUTCMonth(),
    transitInstant.getUTCDate(),
    12,
    0,
    0
  );
  return { transitInstant, localDate, calendarDate };
}

const profile = {
  fullName: 'Hồ sơ kiểm thử Hà Nội',
  birthDate: '1998-10-20',
  birthTime: '14:30',
  birthTimeAccuracy: 'exact' as const,
  resolvedBirthLocation: {
    placeId: 'dry-run-hanoi',
    userLabel: 'Hà Nội, Việt Nam',
    latitude: 21.0278,
    longitude: 105.8342,
    timeZoneIdentifier: 'Asia/Ho_Chi_Minh',
    resolvedAt: '2026-10-22T00:00:00.000Z',
  },
};

describe('30-day astrology request dry-run audit', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.useRealTimers();
    fetchMock.mockReset();
    resetAstroFortuneRuleContextCapabilityForTests();
    global.fetch = originalFetch;
  });

  it('captures 30 consecutive full requests without network or database writes', async () => {
    const networkFetch = jest.fn(async () => {
      throw new Error('Network access is forbidden in the astrology request audit.');
    });
    global.fetch = networkFetch as typeof fetch;
    jest.useFakeTimers();
    resetAstroFortuneRuleContextCapabilityForTests();

    const days = Array.from({ length: 30 }, (_, index) => {
      const date = makeDateFixture(index);
      const metadata = generatePureAstroVector(profile, date.transitInstant).metadata;
      const matchPlan = buildAstrologyCaDaoMatchPlan(metadata);
      return { ...date, metadata, matchPlan };
    });

    const requests: AuditRequest[] = [];
    let recentAdvice: string[] = [];
    let recentCaDao: Array<{ id?: number; content: string }> = [];

    for (let index = 0; index < days.length; index += 1) {
      const day = days[index];
      const querySpec = buildContextualCaDaoSqlQuery(day.calendarDate, {
        ...day.matchPlan,
        excludeIds: recentCaDao
          .map((item) => item.id)
          .filter((id): id is number => typeof id === 'number'),
        excludeContents: recentCaDao.map((item) => item.content),
      });
      if (!querySpec) throw new Error(`Không dựng được query ca dao cho ${day.localDate}.`);
      const caDaoRow = runReadOnlyCaDaoQueries([querySpec])[0];
      if (!caDaoRow) throw new Error(`Không tìm thấy ca dao cho ${day.localDate}.`);
      const caDao: CaDaoItem = { ...caDaoRow, url: caDaoRow.url ?? '' };
      const mockAdvice = `[DRY-RUN ${day.localDate}] Hoàn thành một việc nhỏ và ghi lại điều đã học.`;
      fetchMock.mockResolvedValueOnce(response(200, {
        success: true,
        fortune: {
          title: `Quẻ kiểm thử ${day.localDate}`,
          verse: `Ca dao kiểm thử cho ngày ${day.localDate}`,
          mirror: `Dữ liệu phản chiếu giả lập cho ngày ${day.localDate}.`,
          advice: mockAdvice,
        },
      }));
      jest.setSystemTime(day.transitInstant);

      const result = await requestAstroFortuneSlip({
        locale: 'vi',
        astroMetadata: day.metadata,
        customCaDao: caDao,
        recentAdvice,
        recentCaDao,
      });
      const call = fetchMock.mock.calls[index];
      const url = String(call[0]);
      const init = call[1] ?? {};
      const body = JSON.parse(String(init.body)) as AstroFortuneRequestPayload;
      const headers = { ...((init.headers ?? {}) as Record<string, string>) };

      expect(url).toBe('/api/astro/fortune');
      expect(init.method).toBe('POST');
      expect(headers).toEqual({ 'Content-Type': 'application/json' });
      expect(body.caDaoSample).toBe(caDao.content);
      expect(body.caDaoCategory).toBe(caDao.category);
      expect(caDao.category).toBe(day.matchPlan.categories[0]);
      expect(body.locale).toBe('vi');
      expect(body.astroSummary).toEqual(expect.any(String));
      expect(body.metadata).toEqual(expect.any(Object));
      expect(body.ruleContext).toMatchObject({
        catalogId: 'astrology_rule_v1',
        schemaVersion: 1,
      });
      for (const topic of body.ruleContext?.topics ?? []) {
        expect(String(topic.score).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(4);
        for (const text of Object.values(topic.payload)) {
          expect(text[0]).toBe(text[0].toLocaleUpperCase('vi-VN'));
          expect(text).not.toContain('có thể có thể');
          expect(text).not.toContain('lĩnh vực cách');
        }
      }
      expect(body.recentAdvice).toEqual(recentAdvice);
      expect(body.recentAdvice).toHaveLength(Math.min(index, 7));

      requests.push({
        sequence: index + 1,
        localDate: day.localDate,
        transitInstant: day.transitInstant.toISOString(),
        selectedCaDao: caDao,
        caDaoMatchPlan: day.matchPlan,
        request: {
          url,
          method: String(init.method),
          headers,
          body,
        },
      });
      recentAdvice = [result.advice, ...recentAdvice].slice(0, 7);
      recentCaDao = [{ id: caDao.id, content: caDao.content }, ...recentCaDao].slice(0, 14);
    }

    const artifact = {
      schemaVersion: 1,
      dryRun: true,
      requestCount: requests.length,
      networkCalls: networkFetch.mock.calls.length,
      dateRange: {
        start: requests[0].localDate,
        end: requests[requests.length - 1].localDate,
        consecutiveDays: 30,
      },
      calendarTimeZone: 'Asia/Bangkok',
      transitSampleTime: '12:00:00+07:00',
      profileFixture: {
        id: 'hanoi-exact-1998-10-20-1430',
        birthDate: profile.birthDate,
        birthTime: profile.birthTime,
        birthTimeAccuracy: profile.birthTimeAccuracy,
        birthPlace: 'Hà Nội (test fixture)',
      },
      authentication: {
        included: false,
        reason: 'Dry-run không tạo Supabase session hoặc JWT.',
      },
      requests,
    };
    const serialized = `${JSON.stringify(artifact, null, 2)}\n`;

    expect(requests).toHaveLength(30);
    expect(new Set(requests.map((item) => item.localDate)).size).toBe(30);
    expect(requests[0].localDate).toBe('2026-10-22');
    expect(requests[29].localDate).toBe('2026-11-20');
    expect(fetchMock).toHaveBeenCalledTimes(30);
    expect(networkFetch).not.toHaveBeenCalled();
    for (let index = 0; index < requests.length; index += 1) {
      const previousWindow = requests
        .slice(Math.max(0, index - 14), index)
        .map((item) => item.selectedCaDao.id);
      expect(previousWindow).not.toContain(requests[index].selectedCaDao.id);
    }
    for (const forbidden of [
      'dry-run-hanoi',
      'placeId',
      'latitude',
      'longitude',
      'timeZoneIdentifier',
      'Asia/Ho_Chi_Minh',
      'access_token',
      'Bearer ',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }

    mkdirSync(path.dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, serialized, 'utf8');
  });
});
