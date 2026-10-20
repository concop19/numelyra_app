import { authenticatedFetch } from '../../apiConfig';
import { getContextualDailyCaDao } from '../../../db/cadaoService';
import {
  buildAstroFortuneRequestPayload,
  requestAstroFortuneSlip,
  resetAstroFortuneRuleContextCapabilityForTests,
} from '../astroFortuneService';
import { generatePureAstroVector } from '../astroVectorEngine';

jest.mock('../../apiConfig', () => ({
  API_ENDPOINTS: { ASTRO_FORTUNE: 'https://example.test/api/astro/fortune' },
  authenticatedFetch: jest.fn(),
}));

jest.mock('../../../db/cadaoService', () => ({
  getContextualDailyCaDao: jest.fn(),
  getDailyCaDao: jest.fn(),
  getRandomCaDao: jest.fn(),
}));

const fetchMock = authenticatedFetch as jest.MockedFunction<typeof authenticatedFetch>;
const contextualCaDaoMock = getContextualDailyCaDao as jest.MockedFunction<typeof getContextualDailyCaDao>;

function response(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn(async () => body),
  } as unknown as Response;
}

function metadata() {
  return generatePureAstroVector({
    birthDate: '1998-10-20',
    birthTime: '14:30',
    birthTimeAccuracy: 'exact',
    resolvedBirthLocation: {
      placeId: 'private-place-id',
      userLabel: 'Hà Nội, Việt Nam',
      latitude: 21.0278,
      longitude: 105.8342,
      timeZoneIdentifier: 'Asia/Ho_Chi_Minh',
      resolvedAt: '2026-10-19T00:00:00.000Z',
    },
  }, new Date('2026-10-19T12:00:00.000Z')).metadata;
}

const fortuneResponse = {
  success: true,
  fortune: {
    title: 'Quẻ thử',
    verse: 'Một câu thơ',
    mirror: 'Một tấm gương',
    advice: 'Một kế sách',
  },
};

const customCaDao = {
  id: 1,
  title: 'Ca dao thử',
  content: 'Ca dao',
  category: 'Dân gian',
  url: '',
};

describe('astro fortune rule-aware request', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    contextualCaDaoMock.mockReset();
    resetAstroFortuneRuleContextCapabilityForTests();
  });

  it('builds a compact ruleContext without private birth location data', () => {
    const payload = buildAstroFortuneRequestPayload('Ca dao', 'Dân gian', {
      astroMetadata: metadata(),
      recentAdvice: Array.from({ length: 10 }, (_, index) => `Lời khuyên ${index}`),
    });
    expect(payload.ruleContext?.catalogId).toBe('astrology_rule_v1');
    expect(payload.ruleContext?.topics.length).toBeLessThanOrEqual(3);
    expect(payload.ruleContext?.matchedRuleIds).toEqual(
      [...new Set(payload.ruleContext?.topics.flatMap((topic) => topic.matchedRuleIds))].sort()
    );
    expect(payload.recentAdvice).toHaveLength(7);
    const json = JSON.stringify(payload);
    for (const forbidden of ['private-place-id', 'placeId', 'latitude', 'longitude', 'timeZoneIdentifier']) {
      expect(json).not.toContain(forbidden);
    }
  });

  it.each([400, 422])('retries status %s once without ruleContext and remembers legacy mode', async (status) => {
    fetchMock
      .mockResolvedValueOnce(response(status, { error: 'unknown field' }))
      .mockResolvedValueOnce(response(200, fortuneResponse))
      .mockResolvedValueOnce(response(200, fortuneResponse));

    const options = {
      astroMetadata: metadata(),
      customCaDao,
    };
    await requestAstroFortuneSlip(options);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).ruleContext).toBeDefined();
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body)).ruleContext).toBeUndefined();

    await requestAstroFortuneSlip(options);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body)).ruleContext).toBeUndefined();
  });

  it.each([401, 403, 429, 500])('does not retry status %s', async (status) => {
    fetchMock.mockResolvedValueOnce(response(status, { error: 'server error' }));
    await expect(requestAstroFortuneSlip({
      astroMetadata: metadata(),
      customCaDao,
    })).rejects.toThrow('server error');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('selects daily ca dao from rule topics and exposes a non-technical match reason', async () => {
    contextualCaDaoMock.mockResolvedValueOnce({
      id: 2,
      title: 'Câu hợp chủ đề',
      content: 'Có công mài sắt, có ngày nên kim',
      category: 'Lao động sản xuất',
      url: '',
    });
    fetchMock.mockResolvedValueOnce(response(200, fortuneResponse));

    const result = await requestAstroFortuneSlip({ astroMetadata: metadata() });

    expect(contextualCaDaoMock).toHaveBeenCalledTimes(1);
    expect(contextualCaDaoMock.mock.calls[0][1].categories.length).toBeGreaterThan(0);
    expect(result.anchorCaDao.content).toContain('Có công mài sắt');
    expect(result.anchorCaDao.matchReason).toMatch(/^Chọn theo /);
    expect(result.anchorCaDao.matchReason).not.toMatch(/rule|aspect\.|house_/i);
  });
});
