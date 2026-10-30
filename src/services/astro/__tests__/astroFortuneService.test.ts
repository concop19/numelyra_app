import { authenticatedFetch } from '../../apiConfig';
import { getContextualDailyCaDao } from '../../../db/cadaoService';
import {
  buildAstroFortuneRequestPayload,
  getAstroFortuneQuota,
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

  it('loads the authoritative Daily Fortune profile quota for a local date', async () => {
    fetchMock.mockResolvedValueOnce(response(200, {
      quota: { limit: 3, used: 1, remaining: 2, localDate: '2026-10-30' },
    }));

    await expect(getAstroFortuneQuota('2026-10-30')).resolves.toEqual({
      limit: 3,
      used: 1,
      remaining: 2,
      localDate: '2026-10-30',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/api/astro/fortune?localDate=2026-10-30',
      { method: 'GET', cache: 'no-store' },
    );
  });

  it('rejects malformed Daily Fortune quota responses', async () => {
    fetchMock.mockResolvedValueOnce(response(200, {
      quota: { limit: 3, used: 1 },
    }));
    await expect(getAstroFortuneQuota('2026-10-30')).rejects.toThrow('không hợp lệ');
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

  it('times out a stalled fortune request instead of loading forever', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementationOnce(() => new Promise<Response>(() => {}));

    const pending = requestAstroFortuneSlip({
      locale: 'vi',
      customCaDao,
    });
    const rejection = expect(pending).rejects.toThrow('phản hồi quá lâu');
    await jest.advanceTimersByTimeAsync(20_000);

    await rejection;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.signal).toBeDefined();
    jest.useRealTimers();
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

    const result = await requestAstroFortuneSlip({
      astroMetadata: metadata(),
      recentCaDao: [
        { id: 91, content: 'Câu đã dùng gần đây' },
        { content: 'Câu cache cũ không có ID' },
      ],
    });

    expect(contextualCaDaoMock).toHaveBeenCalledTimes(1);
    expect(contextualCaDaoMock.mock.calls[0][1].categories.length).toBeGreaterThan(0);
    expect(contextualCaDaoMock.mock.calls[0][1].excludeIds).toEqual([91]);
    expect(contextualCaDaoMock.mock.calls[0][1].excludeContents).toEqual([
      'Câu đã dùng gần đây',
      'Câu cache cũ không có ID',
    ]);
    expect(result.anchorCaDao.content).toContain('Có công mài sắt');
    expect(result.anchorCaDao.id).toBe(2);
    expect(result.anchorCaDao.matchReason).toMatch(/^Chọn theo /);
    expect(result.anchorCaDao.matchReason).not.toMatch(/rule|aspect\.|house_/i);
  });

  it('uses the server anchor when a cached profile/day record is returned', async () => {
    fetchMock.mockResolvedValueOnce(response(200, {
      ...fortuneResponse,
      cached: true,
      sampleAnchor: {
        caDaoSample: 'Câu neo đã lưu từ lần tạo đầu tiên',
        caDaoCategory: 'Gia đình',
      },
    }));

    const result = await requestAstroFortuneSlip({ customCaDao });

    expect(result.anchorCaDao).toMatchObject({
      content: 'Câu neo đã lưu từ lần tạo đầu tiên',
      category: 'Gia đình',
    });
    expect(result.anchorCaDao.id).toBeUndefined();
    expect(result.anchorCaDao.matchReason).toBeUndefined();
  });
});
