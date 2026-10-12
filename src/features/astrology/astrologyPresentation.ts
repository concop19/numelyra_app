import type { DetectedAspect } from '../../services/astro/aspectCalculator';
import type {
  AstroDominantSignal,
  PureAstroFeatureMetadata,
} from '../../services/astro/astroVectorEngine';

export const PLANET_IDS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const;

export const ZODIAC_IDS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

export type PlanetId = (typeof PLANET_IDS)[number];
export type ZodiacId = (typeof ZODIAC_IDS)[number];

export type AstrologyDetailTarget =
  | { kind: 'planet'; id: PlanetId }
  | { kind: 'sign'; id: ZodiacId };

export function isPlanetId(value: string): value is PlanetId {
  return (PLANET_IDS as readonly string[]).includes(value);
}

export function isZodiacId(value: string): value is ZodiacId {
  return (ZODIAC_IDS as readonly string[]).includes(value);
}

export function resolveDetailConstellation(
  target: AstrologyDetailTarget,
  metadata?: PureAstroFeatureMetadata
): ZodiacId {
  if (target.kind === 'sign') return target.id;

  const natalSign = metadata?.natalPlanets.find((planet) => planet.name === target.id)?.sign;
  if (natalSign && isZodiacId(natalSign)) return natalSign;

  const transitSign = metadata?.transitPlanets.find((planet) => planet.name === target.id)?.sign;
  if (transitSign && isZodiacId(transitSign)) return transitSign;

  return metadata?.natalSunSign && isZodiacId(metadata.natalSunSign)
    ? metadata.natalSunSign
    : 'Pisces';
}

export interface CelestialInfo {
  id: string;
  nameVi: string;
  symbol: string;
  description: string;
  themes: string[];
}

export interface TodaySummaryCard {
  id: 'energy' | 'emotion' | 'relationships' | 'actions';
  title: string;
  value: string;
  detail: string;
  icon: string;
  color: string;
  target?: AstrologyDetailTarget;
}

export interface EnergyFocusItem {
  id: string;
  label: string;
  value: number;
  color: string;
}

export interface PlanetGuidanceItem {
  id: PlanetId;
  sign: ZodiacId | null;
  degreeInSign: number | null;
  aspect: DetectedAspect | null;
  aspectText: string;
  natureLabel: string;
}

export const ZODIAC_INFO: Record<ZodiacId, CelestialInfo> = {
  Aries: { id: 'Aries', nameVi: 'Bạch Dương', symbol: '♈', description: 'Nguồn lực khởi đầu, trực diện và sẵn sàng hành động.', themes: ['Tiên phong', 'Can đảm', 'Chủ động'] },
  Taurus: { id: 'Taurus', nameVi: 'Kim Ngưu', symbol: '♉', description: 'Năng lượng bền bỉ, cảm nhận giá trị và xây nền ổn định.', themes: ['Ổn định', 'Giá trị', 'Bền bỉ'] },
  Gemini: { id: 'Gemini', nameVi: 'Song Tử', symbol: '♊', description: 'Sự linh hoạt của tư duy, ngôn ngữ và trao đổi thông tin.', themes: ['Giao tiếp', 'Hiếu kỳ', 'Linh hoạt'] },
  Cancer: { id: 'Cancer', nameVi: 'Cự Giải', symbol: '♋', description: 'Chiều sâu cảm xúc, bản năng chăm sóc và nhu cầu thuộc về.', themes: ['Nuôi dưỡng', 'Trực giác', 'Bảo vệ'] },
  Leo: { id: 'Leo', nameVi: 'Sư Tử', symbol: '♌', description: 'Ánh sáng sáng tạo, biểu đạt bản thân và lòng tự trọng.', themes: ['Sáng tạo', 'Tự tin', 'Tỏa sáng'] },
  Virgo: { id: 'Virgo', nameVi: 'Xử Nữ', symbol: '♍', description: 'Khả năng quan sát, cải thiện và chăm chút điều thiết thực.', themes: ['Phân tích', 'Phục vụ', 'Tinh chỉnh'] },
  Libra: { id: 'Libra', nameVi: 'Thiên Bình', symbol: '♎', description: 'Nhu cầu cân bằng, hợp tác và tạo nên sự hài hòa.', themes: ['Cân bằng', 'Quan hệ', 'Thẩm mỹ'] },
  Scorpio: { id: 'Scorpio', nameVi: 'Bọ Cạp', symbol: '♏', description: 'Năng lực đi sâu, chuyển hóa và bảo vệ điều cốt lõi.', themes: ['Chuyển hóa', 'Chiều sâu', 'Ý chí'] },
  Sagittarius: { id: 'Sagittarius', nameVi: 'Nhân Mã', symbol: '♐', description: 'Động lực mở rộng trải nghiệm, niềm tin và tầm nhìn.', themes: ['Khám phá', 'Niềm tin', 'Tầm nhìn'] },
  Capricorn: { id: 'Capricorn', nameVi: 'Ma Kết', symbol: '♑', description: 'Tính kỷ luật, trách nhiệm và định hướng thành tựu.', themes: ['Kỷ luật', 'Cấu trúc', 'Thành tựu'] },
  Aquarius: { id: 'Aquarius', nameVi: 'Bảo Bình', symbol: '♒', description: 'Tư duy độc lập, cải tiến và kết nối với cộng đồng.', themes: ['Đổi mới', 'Độc lập', 'Cộng đồng'] },
  Pisces: { id: 'Pisces', nameVi: 'Song Ngư', symbol: '♓', description: 'Độ nhạy cảm, tưởng tượng và khả năng đồng cảm sâu.', themes: ['Đồng cảm', 'Trực giác', 'Tưởng tượng'] },
};

export const PLANET_INFO: Record<PlanetId, CelestialInfo> = {
  Sun: { id: 'Sun', nameVi: 'Mặt Trời', symbol: '☉', description: 'Trung tâm bản sắc, sức sống và ý thức về hướng đi.', themes: ['Bản sắc', 'Sức sống', 'Mục tiêu'] },
  Moon: { id: 'Moon', nameVi: 'Mặt Trăng', symbol: '☽', description: 'Thế giới cảm xúc, phản xạ và nhu cầu an toàn bên trong.', themes: ['Cảm xúc', 'Bản năng', 'An toàn'] },
  Mercury: { id: 'Mercury', nameVi: 'Sao Thủy', symbol: '☿', description: 'Cách tiếp nhận, xử lý và truyền đạt thông tin.', themes: ['Tư duy', 'Ngôn ngữ', 'Học hỏi'] },
  Venus: { id: 'Venus', nameVi: 'Sao Kim', symbol: '♀', description: 'Cách kết nối, cảm nhận giá trị và tìm kiếm sự hài hòa.', themes: ['Quan hệ', 'Giá trị', 'Hấp dẫn'] },
  Mars: { id: 'Mars', nameVi: 'Sao Hỏa', symbol: '♂', description: 'Động lực hành động, khẳng định ý chí và phản ứng trực tiếp.', themes: ['Hành động', 'Ý chí', 'Can đảm'] },
  Jupiter: { id: 'Jupiter', nameVi: 'Sao Mộc', symbol: '♃', description: 'Xu hướng mở rộng, phát triển niềm tin và tìm ý nghĩa.', themes: ['Mở rộng', 'Cơ hội', 'Niềm tin'] },
  Saturn: { id: 'Saturn', nameVi: 'Sao Thổ', symbol: '♄', description: 'Bài học về giới hạn, trách nhiệm và cấu trúc bền vững.', themes: ['Kỷ luật', 'Trách nhiệm', 'Trưởng thành'] },
  Uranus: { id: 'Uranus', nameVi: 'Thiên Vương', symbol: '♅', description: 'Nhu cầu đổi mới, tự do và phá vỡ khuôn mẫu cũ.', themes: ['Đổi mới', 'Tự do', 'Thức tỉnh'] },
  Neptune: { id: 'Neptune', nameVi: 'Hải Vương', symbol: '♆', description: 'Trực giác, lý tưởng và ranh giới tinh tế của cảm nhận.', themes: ['Trực giác', 'Lý tưởng', 'Cảm hứng'] },
  Pluto: { id: 'Pluto', nameVi: 'Diêm Vương', symbol: '♇', description: 'Quá trình chuyển hóa sâu và tái cấu trúc quyền lực.', themes: ['Chuyển hóa', 'Tái sinh', 'Chiều sâu'] },
};

const SIGNAL_LABELS: Record<AstroDominantSignal, string> = {
  tension: 'Cần điều chỉnh',
  harmony: 'Thuận dòng',
  conjunction: 'Đang hội tụ',
  balanced: 'Cân bằng',
};

export function zodiacLabel(sign: string): string {
  const info = isZodiacId(sign) ? ZODIAC_INFO[sign] : undefined;
  return info ? `${info.nameVi} ${info.symbol}` : sign;
}

export function planetLabel(planet: string): string {
  return isPlanetId(planet) ? PLANET_INFO[planet].nameVi : planet;
}

function scoreLevel(value: number): string {
  if (value >= 0.67) return 'Mạnh';
  if (value >= 0.34) return 'Vừa';
  return 'Nhẹ';
}

function findAspect(metadata: PureAstroFeatureMetadata, planet: string): DetectedAspect | undefined {
  return metadata.notableTransitAspects.find(
    (aspect) => aspect.transitPlanet === planet || aspect.natalPlanet === planet
  );
}

function aspectLine(aspect: DetectedAspect): string {
  return `${planetLabel(aspect.transitPlanet)} ${aspect.nameVi.toLocaleLowerCase('vi-VN')} ${planetLabel(aspect.natalPlanet)} · orb ${aspect.orb.toFixed(1)}°`;
}

export function getPlanetGuidanceItems(metadata: PureAstroFeatureMetadata): PlanetGuidanceItem[] {
  return PLANET_IDS.map((id) => {
    const transit = metadata.transitPlanets.find((planet) => planet.name === id);
    const aspect = metadata.notableTransitAspects.find(
      (item) => item.transitPlanet === id || item.natalPlanet === id
    ) ?? null;
    const sign = transit && isZodiacId(transit.sign) ? transit.sign : null;
    return {
      id,
      sign,
      degreeInSign: transit?.degreeInSign ?? null,
      aspect,
      aspectText: aspect
        ? aspectLine(aspect)
        : sign
          ? `${zodiacLabel(sign)} · ${transit!.degreeInSign.toFixed(1)}° hôm nay`
          : 'Đang đồng hành trong nhịp trời hôm nay',
      natureLabel: aspect
        ? aspect.nature === 'harmony'
          ? 'Góc hỗ trợ'
          : aspect.nature === 'tension'
            ? 'Góc thử thách'
            : 'Góc hội tụ'
        : 'Nhịp trung tính',
    };
  });
}

export function getTodaySummaryCards(metadata: PureAstroFeatureMetadata): TodaySummaryCard[] {
  const moonAspect = findAspect(metadata, 'Moon');
  const venusAspect = findAspect(metadata, 'Venus');
  const activeHouse = metadata.dailyContext?.activatedHouses[0];

  return [
    {
      id: 'energy',
      title: 'Năng lượng',
      value: scoreLevel(metadata.scores.fastPlanetActivity),
      detail: `Nhịp hành tinh nhanh ${Math.round(metadata.scores.fastPlanetActivity * 100)}%`,
      icon: 'sparkles',
      color: '#9B8CFF',
    },
    {
      id: 'emotion',
      title: 'Cảm xúc',
      value: zodiacLabel(metadata.transitMoonSign),
      detail: moonAspect ? aspectLine(moonAspect) : 'Không có góc Mặt Trăng chính nổi bật',
      icon: 'moon',
      color: '#73D7FF',
      target: { kind: 'planet', id: 'Moon' },
    },
    {
      id: 'relationships',
      title: 'Quan hệ',
      value: venusAspect ? SIGNAL_LABELS[metadata.dominantSignal] : 'Nhịp ổn định',
      detail: venusAspect ? aspectLine(venusAspect) : 'Không có góc Sao Kim chính nổi bật',
      icon: 'heart',
      color: '#FF7BB7',
      target: { kind: 'planet', id: 'Venus' },
    },
    {
      id: 'actions',
      title: 'Hành động',
      value: SIGNAL_LABELS[metadata.dominantSignal],
      detail: activeHouse
        ? `Nhà ${activeHouse.house} · ${activeHouse.topicVi}`
        : metadata.vibeSummary,
      icon: 'navigate',
      color: '#FFD166',
      target: metadata.topAspect && isPlanetId(metadata.topAspect.transitPlanet)
        ? { kind: 'planet', id: metadata.topAspect.transitPlanet }
        : undefined,
    },
  ];
}

export function getEnergyFocus(metadata: PureAstroFeatureMetadata): EnergyFocusItem[] {
  return [
    { id: 'harmony', label: 'Hài hòa', value: metadata.scores.harmony, color: '#5EEAD4' },
    { id: 'tension', label: 'Thử thách', value: metadata.scores.tension, color: '#FB7185' },
    { id: 'conjunction', label: 'Hội tụ', value: metadata.scores.conjunction, color: '#FBBF24' },
    { id: 'activity', label: 'Nhịp nhanh', value: metadata.scores.fastPlanetActivity, color: '#818CF8' },
  ];
}

export function getPrecisionMessage(metadata: PureAstroFeatureMetadata): string {
  if (metadata.birthDataPrecision === 'complete') {
    if (metadata.natalContext?.isLocalTimeAmbiguous) {
      return 'Đã có giờ và nơi sinh. Thời điểm này nằm trong khoảng giờ lặp do chuyển giờ mùa hè; hệ thống dùng lần xuất hiện đầu tiên.';
    }
    return 'Đã có giờ, nơi sinh và múi giờ. ASC, MC và 12 nhà dùng hệ Porphyry.';
  }
  if (metadata.birthDataPrecision === 'timeWithoutLocation') {
    return 'Đã có giờ sinh nhưng chưa có nơi sinh/múi giờ. Vị trí hiện tạm quy chiếu UTC; ASC, MC và 12 nhà chưa được hiển thị.';
  }
  return 'Chưa có giờ sinh chính xác. Lá số đang dùng mốc 12:00 tạm tính; ASC, MC và 12 nhà chưa được hiển thị.';
}

export function getActiveInfluences(
  metadata: PureAstroFeatureMetadata,
  target?: AstrologyDetailTarget
): DetectedAspect[] {
  if (!target) return metadata.notableTransitAspects.slice(0, 4);
  if (target.kind === 'planet') {
    return metadata.notableTransitAspects.filter(
      (aspect) => aspect.transitPlanet === target.id || aspect.natalPlanet === target.id
    ).slice(0, 4);
  }
  const planetsInSign = new Set(
    metadata.natalPlanets.filter((planet) => planet.sign === target.id).map((planet) => planet.name)
  );
  return metadata.notableTransitAspects.filter(
    (aspect) => planetsInSign.has(aspect.transitPlanet) || planetsInSign.has(aspect.natalPlanet)
  ).slice(0, 4);
}

export function buildTodayInterpretation(
  metadata: PureAstroFeatureMetadata,
  target?: AstrologyDetailTarget
): string {
  const sentences = [metadata.vibeSummary];
  if (target?.kind === 'planet') {
    const natal = metadata.natalPlanets.find((planet) => planet.name === target.id);
    const transit = metadata.transitPlanets.find((planet) => planet.name === target.id);
    if (natal) {
      sentences.push(`${planetLabel(target.id)} bản mệnh ở ${zodiacLabel(natal.sign)} ${natal.degreeInSign.toFixed(1)}°.`);
    } else if (transit) {
      sentences.push(`${planetLabel(target.id)} hôm nay ở ${zodiacLabel(transit.sign)} ${transit.degreeInSign.toFixed(1)}°.`);
    }
  } else if (target?.kind === 'sign') {
    const placements = metadata.natalPlanets.filter((planet) => planet.sign === target.id);
    if (placements.length > 0) {
      sentences.push(`${zodiacLabel(target.id)} chứa ${placements.map((planet) => planetLabel(planet.name)).join(', ')} trong lá số bản mệnh.`);
    }
  }
  if (metadata.topAspect) {
    sentences.push(`Góc nổi bật: ${aspectLine(metadata.topAspect)}.`);
  }
  const house = metadata.dailyContext?.activatedHouses[0];
  if (house) sentences.push(`Trọng tâm đang nghiêng về Nhà ${house.house} — ${house.topicVi}.`);
  return sentences.join(' ');
}

export function getCelestialInfo(target: AstrologyDetailTarget): CelestialInfo {
  const fallback: CelestialInfo = {
    id: target.id,
    nameVi: target.id,
    symbol: '✦',
    description: 'Dữ liệu chi tiết đang được tổng hợp từ lá số hiện tại.',
    themes: [],
  };
  return target.kind === 'planet'
    ? PLANET_INFO[target.id] ?? fallback
    : ZODIAC_INFO[target.id] ?? fallback;
}

export function formatAspect(aspect: DetectedAspect): string {
  return aspectLine(aspect);
}
