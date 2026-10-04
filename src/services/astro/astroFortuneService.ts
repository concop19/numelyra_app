/**
 * astroFortuneService.ts - Client Service gọi Backend DeepSeek API
 * để nhận "Lá Thăm Chiêm Tinh Dân Gian" (Thơ 4 câu - Gương soi - Kế sách).
 */
import { API_ENDPOINTS, authenticatedFetch } from '../apiConfig';
import { getDailyCaDao, getRandomCaDao, CaDaoItem } from '../../db/cadaoService';
import type { PureAstroFeatureMetadata } from './astroVectorEngine';

export interface AstroFortuneSlip {
  title?: string;
  verse: string;
  mirror: string;
  advice: string;
  anchorCaDao: {
    content: string;
    category?: string;
  };
  astroMetadata?: PureAstroFeatureMetadata;
}

export interface RequestFortuneSlipOptions {
  astroMetadata?: PureAstroFeatureMetadata;
  userContext?: string;
  caDaoMode?: 'daily' | 'random';
  customCaDao?: CaDaoItem;
}

/**
 * Tạo bản tóm tắt tình thế chiêm tinh dễ hiểu cho Prompt AI
 */
function buildAstroSummary(meta?: PureAstroFeatureMetadata): {
  summary: string;
  tensionScore: number;
  harmonyScore: number;
  conjunctionScore: number;
  dominantElements: string[];
  highlights: string[];
} {
  if (!meta) {
    return {
      summary: 'Trạng thái chuyển dịch chiêm tinh cân bằng trong ngày.',
      tensionScore: 0.5,
      harmonyScore: 0.5,
      conjunctionScore: 0.2,
      dominantElements: ['Đất', 'Nước'],
      highlights: ['Các hành tinh duy trì quỹ đạo thông thường.'],
    };
  }

  const tensionPercent = (meta.scores.tension * 100).toFixed(0);
  const harmonyPercent = (meta.scores.harmony * 100).toFixed(0);

  const highlights: string[] = [];
  if (meta.topAspect) {
    highlights.push(
      `${meta.topAspect.natalPlanet} ${meta.topAspect.nameVi} ${meta.topAspect.transitPlanet} (${meta.topAspect.actualAngle.toFixed(0)}°, orb ${meta.topAspect.orb.toFixed(1)}°)`
    );
  }
  highlights.push(`Mặt Trời bản mệnh: ${meta.natalSunSign}, Mặt Trăng quá cảnh: ${meta.transitMoonSign}`);

  const dominantElements = [meta.temperament.dominantElement, meta.temperament.dominantModality];

  let tone = meta.vibeSummary || 'Cân bằng và hài hòa vừa phải.';
  if (meta.scores.tension > 0.6) {
    tone = `Nội tâm căng thẳng cao (${tensionPercent}%), áp lực góc chiếu thôi thúc chuyển hóa hoặc gây bức bối.`;
  } else if (meta.scores.harmony > 0.6) {
    tone = `Thuận buồm xuôi gió (${harmonyPercent}%), góc chiếu hỗ trợ tâm trí thông suốt, nhẹ nhõm.`;
  }

  return {
    summary: `${tone} Vibe: ${meta.vibeSummary}.`,
    tensionScore: meta.scores.tension,
    harmonyScore: meta.scores.harmony,
    conjunctionScore: meta.scores.conjunction,
    dominantElements,
    highlights,
  };
}

/**
 * Gửi yêu cầu lên Backend để bốc Lá Thăm Chiêm Tinh Dân Gian
 */
export async function requestAstroFortuneSlip(
  options: RequestFortuneSlipOptions = {}
): Promise<AstroFortuneSlip> {
  // 1. Lấy câu ca dao làm mẫu nhịp điệu (ưu tiên custom, nếu không lấy theo ngày hoặc ngẫu nhiên)
  let caDao: CaDaoItem | null = options.customCaDao ?? null;
  if (!caDao) {
    if (options.caDaoMode === 'random') {
      caDao = await getRandomCaDao();
    } else {
      caDao = await getDailyCaDao(new Date());
    }
  }

  const sampleText =
    caDao?.content ||
    'Cái cò cái vạc cái nông\nBa con cùng béo vặt lông con nào\nVặt lông con cốc cho tao\nTao nấu tao nướng tao xào tao ăn';
  const sampleCategory = caDao?.category || 'Dân gian';

  // 2. Chuẩn bị dữ liệu chiêm tinh
  const astroData = buildAstroSummary(options.astroMetadata);

  // 3. Gọi Backend API
  const response = await authenticatedFetch(API_ENDPOINTS.ASTRO_FORTUNE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      caDaoSample: sampleText,
      caDaoCategory: sampleCategory,
      astroSummary: astroData.summary,
      metadata: {
        tensionScore: astroData.tensionScore,
        harmonyScore: astroData.harmonyScore,
        conjunctionScore: astroData.conjunctionScore,
        dominantElements: astroData.dominantElements,
        highlights: astroData.highlights,
      },
      userContext: options.userContext,
    }),
  });

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
      content: sampleText,
      category: sampleCategory,
    },
    astroMetadata: options.astroMetadata,
  };
}
