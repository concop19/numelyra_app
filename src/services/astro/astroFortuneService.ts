/**
 * astroFortuneService.ts - Client Service gọi Backend DeepSeek API
 * để nhận "Lá Thăm Chiêm Tinh Dân Gian" (Thơ 4 câu - Gương soi - Kế sách).
 */
import { API_ENDPOINTS, authenticatedFetch } from '../apiConfig';
import {
  getContextualDailyCaDao,
  getDailyCaDao,
  getRandomCaDao,
  CaDaoItem,
} from '../../db/cadaoService';
import type {
  ActivatedHouseScore,
  PureAstroFeatureMetadata,
} from './astroVectorEngine';
import type {
  AstrologyRuleEvaluation,
  AstrologyRuleTopic,
} from './astrologyRuleEvaluator';
import { longitudeToZodiac } from './astroEngine';
import { buildAstrologyCaDaoMatchPlan } from './astrologyCaDaoMatcher';
import type { AppLocale } from '../../i18n/translations';

export interface AstroFortuneSlip {
  title?: string;
  verse: string;
  mirror: string;
  advice: string;
  anchorCaDao: {
    id?: number;
    content: string;
    category?: string;
    matchReason?: string;
  };
  astroMetadata?: PureAstroFeatureMetadata;
}

export interface RequestFortuneSlipOptions {
  locale?: AppLocale;
  astroMetadata?: PureAstroFeatureMetadata;
  userContext?: string;
  recentAdvice?: string[];
  recentCaDao?: Array<{ id?: number; content: string }>;
  caDaoMode?: 'daily' | 'random';
  customCaDao?: CaDaoItem;
}

export interface AstrologyRuleRequestContext {
  catalogId: string;
  schemaVersion: number;
  topics: AstrologyRuleTopic[];
  matchedRuleIds: string[];
}

export interface AstroFortuneRequestMetadata {
  tensionScore: number;
  harmonyScore: number;
  conjunctionScore: number;
  dominantSignal: PureAstroFeatureMetadata['dominantSignal'];
  dominantElements: string[];
  highlights: string[];
  birthDataPrecision?: PureAstroFeatureMetadata['birthDataPrecision'];
  houseSystem?: 'porphyry';
  ascendantSign?: string;
  midheavenSign?: string;
  planetHouses?: Record<string, number>;
  activatedHouses?: ActivatedHouseScore[];
  angleHighlights?: string[];
}

export interface AstroFortuneRequestPayload {
  locale: AppLocale;
  caDaoSample: string;
  caDaoCategory: string;
  astroSummary: string;
  metadata: AstroFortuneRequestMetadata;
  recentAdvice?: string[];
  userContext?: string;
  ruleContext?: AstrologyRuleRequestContext;
}

type RuleContextCapability = 'unknown' | 'supported' | 'legacy';
let ruleContextCapability: RuleContextCapability = 'unknown';

/**
 * Tạo bản tóm tắt tình thế chiêm tinh dễ hiểu cho Prompt AI
 */
function buildAstroSummary(meta?: PureAstroFeatureMetadata): {
  summary: string;
  tensionScore: number;
  harmonyScore: number;
  conjunctionScore: number;
  dominantSignal: PureAstroFeatureMetadata['dominantSignal'];
  dominantElements: string[];
  highlights: string[];
  birthDataPrecision?: PureAstroFeatureMetadata['birthDataPrecision'];
  houseSystem?: 'porphyry';
  ascendantSign?: string;
  midheavenSign?: string;
  planetHouses?: Record<string, number>;
  activatedHouses?: ActivatedHouseScore[];
  angleHighlights?: string[];
} {
  if (!meta) {
    return {
      summary: 'Trạng thái chuyển dịch chiêm tinh cân bằng trong ngày.',
      tensionScore: 0.5,
      harmonyScore: 0.5,
      conjunctionScore: 0.2,
      dominantSignal: 'balanced',
      dominantElements: ['Đất', 'Nước'],
      highlights: ['Các hành tinh duy trì quỹ đạo thông thường.'],
    };
  }

  const highlights: string[] = [];
  if (meta.topAspect) {
    highlights.push(
      `${meta.topAspect.natalPlanet} ${meta.topAspect.nameVi} ${meta.topAspect.transitPlanet} (${meta.topAspect.actualAngle.toFixed(0)}°, orb ${meta.topAspect.orb.toFixed(1)}°)`
    );
  }
  highlights.push(`Mặt Trời bản mệnh: ${meta.natalSunSign}, Mặt Trăng quá cảnh: ${meta.transitMoonSign}`);
  const activatedHouse = meta.dailyContext?.activatedHouses[0];
  if (activatedHouse) {
    highlights.push(`Nhà ${activatedHouse.house} – ${activatedHouse.topicVi} đang được kích hoạt`);
  }

  const dominantElements = [meta.temperament.dominantElement, meta.temperament.dominantModality];

  return {
    summary: meta.vibeSummary,
    tensionScore: meta.scores.tension,
    harmonyScore: meta.scores.harmony,
    conjunctionScore: meta.scores.conjunction,
    dominantSignal: meta.dominantSignal,
    dominantElements,
    highlights,
    birthDataPrecision: meta.birthDataPrecision,
    houseSystem: meta.natalContext?.houseSystem,
    ascendantSign: meta.natalContext
      ? longitudeToZodiac(meta.natalContext.angles.ascendant).sign
      : undefined,
    midheavenSign: meta.natalContext
      ? longitudeToZodiac(meta.natalContext.angles.midheaven).sign
      : undefined,
    planetHouses: meta.natalContext?.planetHouses,
    activatedHouses: meta.dailyContext?.activatedHouses,
    angleHighlights: meta.dailyContext?.angleAspects.slice(0, 3).map(
      (aspect) => `${aspect.transitPlanet} ${aspect.nameVi} ${aspect.angle}, orb ${aspect.orb}°`
    ),
  };
}

export function makeAstrologyRuleRequestContext(
  evaluation?: AstrologyRuleEvaluation | null
): AstrologyRuleRequestContext | undefined {
  const topics = evaluation?.topTopics.slice(0, 3) ?? [];
  if (!evaluation || topics.length === 0) return undefined;
  return {
    catalogId: evaluation.catalogId,
    schemaVersion: evaluation.schemaVersion,
    topics,
    matchedRuleIds: [...new Set(topics.flatMap((topic) => topic.matchedRuleIds))].sort(),
  };
}

export function buildAstroFortuneRequestPayload(
  sampleText: string,
  sampleCategory: string,
  options: RequestFortuneSlipOptions,
  includeRuleContext = true
): AstroFortuneRequestPayload {
  const astroData = buildAstroSummary(options.astroMetadata);
  const ruleContext = includeRuleContext
    ? makeAstrologyRuleRequestContext(options.astroMetadata?.ruleEvaluation)
    : undefined;
  return {
    locale: options.locale ?? 'vi',
    caDaoSample: sampleText,
    caDaoCategory: sampleCategory,
    astroSummary: astroData.summary,
    metadata: {
      tensionScore: astroData.tensionScore,
      harmonyScore: astroData.harmonyScore,
      conjunctionScore: astroData.conjunctionScore,
      dominantSignal: astroData.dominantSignal,
      dominantElements: astroData.dominantElements,
      highlights: astroData.highlights,
      birthDataPrecision: astroData.birthDataPrecision,
      houseSystem: astroData.houseSystem,
      ascendantSign: astroData.ascendantSign,
      midheavenSign: astroData.midheavenSign,
      planetHouses: astroData.planetHouses,
      activatedHouses: astroData.activatedHouses,
      angleHighlights: astroData.angleHighlights,
    },
    recentAdvice: options.recentAdvice?.slice(0, 7),
    userContext: options.userContext,
    ruleContext,
  };
}

async function sendFortuneRequest(payload: AstroFortuneRequestPayload): Promise<Response> {
  return authenticatedFetch(API_ENDPOINTS.ASTRO_FORTUNE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export function resetAstroFortuneRuleContextCapabilityForTests(): void {
  ruleContextCapability = 'unknown';
}

/**
 * Gửi yêu cầu lên Backend để bốc Lá Thăm Chiêm Tinh Dân Gian
 */
export async function requestAstroFortuneSlip(
  options: RequestFortuneSlipOptions = {}
): Promise<AstroFortuneSlip> {
  // 1. Lấy câu ca dao làm mẫu nhịp điệu (ưu tiên custom, nếu không lấy theo ngày hoặc ngẫu nhiên)
  let caDao: CaDaoItem | null = options.customCaDao ?? null;
  let caDaoMatchReason: string | undefined;
  if (!caDao) {
    if (options.caDaoMode === 'random') {
      caDao = await getRandomCaDao();
    } else {
      const today = new Date();
      const matchPlan = buildAstrologyCaDaoMatchPlan(options.astroMetadata);
      caDao = await getContextualDailyCaDao(today, {
        ...matchPlan,
        excludeIds: options.recentCaDao
          ?.map((item) => item.id)
          .filter((id): id is number => typeof id === 'number'),
        excludeContents: options.recentCaDao?.map((item) => item.content),
      });
      if (caDao) caDaoMatchReason = matchPlan.reason;
      else caDao = await getDailyCaDao(today);
    }
  }

  const sampleText =
    caDao?.content ||
    'Cái cò cái vạc cái nông\nBa con cùng béo vặt lông con nào\nVặt lông con cốc cho tao\nTao nấu tao nướng tao xào tao ăn';
  const sampleCategory = caDao?.category || 'Dân gian';

  // 2. Gửi rule context khi server hỗ trợ. Server cũ được phát hiện một lần mỗi phiên.
  const shouldIncludeRuleContext = ruleContextCapability !== 'legacy';
  const payload = buildAstroFortuneRequestPayload(
    sampleText,
    sampleCategory,
    options,
    shouldIncludeRuleContext
  );
  let response = await sendFortuneRequest(payload);
  if (payload.ruleContext && (response.status === 400 || response.status === 422)) {
    const legacyPayload = { ...payload };
    delete legacyPayload.ruleContext;
    response = await sendFortuneRequest(legacyPayload);
    if (response.ok) ruleContextCapability = 'legacy';
  } else if (payload.ruleContext && response.ok) {
    ruleContextCapability = 'supported';
  }

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(
      errorJson.error || `Gọi API Lá Thăm Chiêm Tinh thất bại (${response.status})`
    );
  }

  const result = (await response.json()) as {
    success: boolean;
    fortune: {
      title?: string;
      verse: string;
      mirror: string;
      advice: string;
    };
  };

  if (!result.success || !result.fortune) {
    throw new Error('Dữ liệu lá thăm từ máy chủ không hợp lệ.');
  }

  return {
    title: result.fortune.title,
    verse: result.fortune.verse,
    mirror: result.fortune.mirror,
    advice: result.fortune.advice,
    anchorCaDao: {
      id: caDao?.id,
      content: sampleText,
      category: sampleCategory,
      matchReason: caDaoMatchReason,
    },
    astroMetadata: options.astroMetadata,
  };
}
