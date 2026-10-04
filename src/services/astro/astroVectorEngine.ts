/**
 * astroVectorEngine.ts
 * Bộ trích xuất và mã hóa Vector Đặc Trưng Chiêm Tinh Học Thuần Túy (Pure Astro Feature Vector).
 * 100% Dữ liệu Thiên văn & Chiêm tinh (không lẫn Tarot, không lẫn Thần số học).
 * Xuất ra Vector 32 chiều chuẩn hóa [0.0, 1.0] và Semantic Context Object.
 */
import {
  computeNatalChart,
  computeTransitChart,
  calculateTemperamentBalance,
  PlanetaryChart,
  TemperamentBalance,
} from './astroEngine';
import {
  analyzeTransitToNatalAspects,
  AspectAnalysisResult,
  DetectedAspect,
} from './aspectCalculator';

export interface UserBirthInput {
  birthDate: string;        // 'YYYY-MM-DD' hoặc 'DD/MM/YYYY'
  birthTime?: string;       // 'HH:mm' (tùy chọn)
  fullName?: string;        // Họ tên (tùy chọn)
}

export interface PureAstroFeatureMetadata {
  birthDate: string;
  birthTime: string | null;
  hasExactTime: boolean;
  confidenceScore: number;  // 1.0 = có giờ sinh, 0.7 = ước lượng Noon chart
  currentDateIso: string;

  // Dấu hiệu cung chủ đạo
  natalSunSign: string;
  natalMoonSign: string;
  transitMoonSign: string;

  // Phân bổ Khí chất Bản mệnh (Natal Temperament)
  temperament: {
    balance: TemperamentBalance;
    dominantElement: string;  // 'Lửa' | 'Đất' | 'Khí' | 'Nước'
    dominantModality: string; // 'Tiên phong' | 'Kiên định' | 'Linh hoạt'
  };

  // Góc chiếu và Động lực học hôm nay
  topAspect: DetectedAspect | null;
  totalAspectsCount: number;
  scores: {
    tension: number;           // 0.0 - 1.0 (Áp lực từ Vuông góc / Đối đỉnh)
    harmony: number;           // 0.0 - 1.0 (Thuận lợi từ Tam hợp / Lục hợp)
    conjunction: number;       // 0.0 - 1.0 (Hội tụ năng lượng từ Trùng tụ)
    fastPlanetActivity: number; // 0.0 - 1.0 (Mức độ kích hoạt từ các hành tinh nhanh)
  };
  vibeSummary: string;
}

export interface PureAstroVectorResult {
  /**
   * Mảng 32 số thực thuần chiêm tinh trong đoạn [0.0, 1.0]
   */
  vector: number[];
  /**
   * Typed Float32Array tối ưu cho việc tính toán khoảng cách / search vector
   */
  float32Array: Float32Array;
  /**
   * Dữ liệu ngữ nghĩa thuần chiêm tinh phục vụ kiểm tra và truyền context cho AI
   */
  metadata: PureAstroFeatureMetadata;
}

const PLANET_ORDER = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
];

/**
 * Trích xuất bộ vector 32 chiều thuần túy Chiêm Tinh Học (Pure Astrology)
 */
export function generatePureAstroVector(
  userInput: UserBirthInput,
  currentDate: Date = new Date()
): PureAstroVectorResult {
  // 1. Tính toán Natal Chart & Transit Chart
  const natalChart: PlanetaryChart = computeNatalChart(userInput.birthDate, userInput.birthTime);
  const transitChart: PlanetaryChart = computeTransitChart(currentDate);

  // 2. Phân tích góc hợp Transit-to-Natal
  const aspectResult: AspectAnalysisResult = analyzeTransitToNatalAspects(transitChart, natalChart);

  // 3. Phân bổ Khí chất Bản mệnh (Elements & Modalities)
  const temperament: TemperamentBalance = calculateTemperamentBalance(natalChart.planetList);

  // 4. Khởi tạo mảng Vector 32 chiều
  const vec: number[] = new Array(32).fill(0);

  // [0]: Độ tin cậy dữ liệu (1.0 nếu có giờ sinh chính xác, 0.7 nếu Noon chart)
  vec[0] = natalChart.isTimeEstimated ? 0.7 : 1.0;

  // [1..10]: Tọa độ 10 hành tinh Natal (Sun -> Pluto, normalized 0.0 - 1.0)
  PLANET_ORDER.forEach((name, i) => {
    const planet = natalChart.planets[name];
    vec[1 + i] = planet ? planet.normalized : 0;
  });

  // [11..20]: Tọa độ 10 hành tinh Transit hôm nay (Sun -> Pluto, normalized 0.0 - 1.0)
  PLANET_ORDER.forEach((name, i) => {
    const planet = transitChart.planets[name];
    vec[11 + i] = planet ? planet.normalized : 0;
  });

  // [21..24]: Cân bằng 4 Nguyên tố Natal [Fire, Earth, Air, Water] (0.0 - 1.0)
  vec[21] = temperament.fire;
  vec[22] = temperament.earth;
  vec[23] = temperament.air;
  vec[24] = temperament.water;

  // [25..27]: Cân bằng 3 Tính chất Natal [Cardinal, Fixed, Mutable] (0.0 - 1.0)
  vec[25] = temperament.cardinal;
  vec[26] = temperament.fixed;
  vec[27] = temperament.mutable;

  // [28..31]: Động lực học góc chiếu Transit hôm nay (4 chiều)
  vec[28] = aspectResult.tensionScore;
  vec[29] = aspectResult.harmonyScore;
  vec[30] = aspectResult.conjunctionIntensity;
  vec[31] = aspectResult.fastPlanetActivity;

  // Làm sạch mảng đảm bảo mọi giá trị trong [0.0, 1.0]
  const cleanVector = vec.map((v) => {
    if (isNaN(v) || v === null || v === undefined) return 0;
    return Math.max(0, Math.min(1, Number(v.toFixed(4))));
  });

  // Xác định nguyên tố và tính chất chiếm ưu thế
  const elementMap: [string, number][] = [
    ['Lửa', temperament.fire],
    ['Đất', temperament.earth],
    ['Khí', temperament.air],
    ['Nước', temperament.water],
  ];
  elementMap.sort((a, b) => b[1] - a[1]);
  const dominantElement = elementMap[0][0];

  const modalityMap: [string, number][] = [
    ['Tiên phong', temperament.cardinal],
    ['Kiên định', temperament.fixed],
    ['Linh hoạt', temperament.mutable],
  ];
  modalityMap.sort((a, b) => b[1] - a[1]);
  const dominantModality = modalityMap[0][0];

  // Tóm tắt ngữ nghĩa (Semantic Metadata)
  let vibeSummary = 'Bầu trời êm ả, các dòng năng lượng chuyển động ổn định.';
  if (aspectResult.tensionScore > 0.6) {
    vibeSummary = 'Áp lực góc chiếu cao (Vuông góc / Đối đỉnh), thử thách sự kiên định và bình tĩnh.';
  } else if (aspectResult.harmonyScore > 0.6) {
    vibeSummary = 'Dòng năng lượng thuận lợi (Tam hợp / Lục hợp), hỗ trợ hanh thông và phát triển.';
  }

  const metadata: PureAstroFeatureMetadata = {
    birthDate: userInput.birthDate,
    birthTime: userInput.birthTime || null,
    hasExactTime: !natalChart.isTimeEstimated,
    confidenceScore: vec[0],
    currentDateIso: currentDate.toISOString(),
    natalSunSign: natalChart.planets['Sun']?.sign || 'Unknown',
    natalMoonSign: natalChart.planets['Moon']?.sign || 'Unknown',
    transitMoonSign: transitChart.planets['Moon']?.sign || 'Unknown',
    temperament: {
      balance: temperament,
      dominantElement,
      dominantModality,
    },
    topAspect: aspectResult.topAspect,
    totalAspectsCount: aspectResult.aspects.length,
    scores: {
      tension: aspectResult.tensionScore,
      harmony: aspectResult.harmonyScore,
      conjunction: aspectResult.conjunctionIntensity,
      fastPlanetActivity: aspectResult.fastPlanetActivity,
    },
    vibeSummary,
  };

  return {
    vector: cleanVector,
    float32Array: new Float32Array(cleanVector),
    metadata,
  };
}

// Giữ alias tương thích nếu cần
export const generateAstroNumerologyVector = generatePureAstroVector;
export const generateAstroVector = generatePureAstroVector;

/**
 * Tính toán độ tương đồng Cosine (Cosine Similarity) giữa 2 vector đặc trưng
 * Kết quả: 1.0 = Trùng khớp hoàn toàn, 0.0 = Trực giao (không liên quan)
 */
export function calculateVectorCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return Number((dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))).toFixed(4));
}
