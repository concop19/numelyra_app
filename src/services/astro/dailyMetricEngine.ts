import type { AppLocale } from '../../i18n/translations';
import type { UserProfile } from '../../store/userProfile';
import {
  computeTransitChart,
  makeNatalSnapshot,
  type PlanetPosition,
} from './astroEngine';
import {
  getShortestAngleDiff,
  MAJOR_ASPECTS,
  type AspectType,
} from './aspectCalculator';
import type { PureAstroFeatureMetadata } from './astroVectorEngine';

export const DAILY_ASTRO_METRICS_VERSION = 'daily-astro-metrics-v1';
export const DAILY_METRIC_MAX_ORB = 1;

export type DailyAstroMetricId = 'energy' | 'emotion' | 'focus' | 'connection';
export type DailyAstroMetricLevel = 'low' | 'balanced' | 'high';
export type DailyAstroMetricDirection = 'support' | 'challenge' | 'neutral';

export interface DailyAstroMetricEvidence {
  transitPlanet: string;
  natalPlanet: string;
  aspectType: AspectType;
  aspectName: string;
  symbol: string;
  orb: number;
  peakTimeIso: string;
  direction: DailyAstroMetricDirection;
  strength: number;
  contribution: number;
}

export interface DailyAstroMetric {
  id: DailyAstroMetricId;
  score: number;
  level: DailyAstroMetricLevel;
  summary: string;
  evidence: DailyAstroMetricEvidence[];
}

export interface DailyAstroMetrics {
  version: string;
  dateKey: string;
  timeZone: string;
  confidence: 'full' | 'estimated';
  metrics: Record<DailyAstroMetricId, DailyAstroMetric>;
}

interface DailyAspectPeak {
  transitPlanet: string;
  natalPlanet: string;
  aspectType: AspectType;
  aspectNameVi: string;
  symbol: string;
  orb: number;
  peakTime: Date;
  baseWeight: number;
}

export interface DailyMetricAssignment {
  metric: DailyAstroMetricId;
  weight: number;
}

const METRIC_IDS: DailyAstroMetricId[] = ['energy', 'emotion', 'focus', 'connection'];

const PLANET_METRIC: Partial<Record<string, DailyAstroMetricId>> = {
  Sun: 'energy',
  Mars: 'energy',
  Moon: 'emotion',
  Mercury: 'focus',
  Venus: 'connection',
};

const TRANSIT_WEIGHTS: Record<string, number> = {
  Moon: 1,
  Sun: 0.85,
  Mercury: 0.85,
  Venus: 0.85,
  Mars: 0.85,
  Jupiter: 0.65,
  Saturn: 0.55,
  Uranus: 0.4,
  Neptune: 0.4,
  Pluto: 0.4,
};

const ASPECT_POLARITY: Record<AspectType, number> = {
  conjunction: 0,
  sextile: 0.7,
  square: -0.8,
  trine: 1,
  opposition: -1,
};

const ASPECT_NAMES_EN: Record<AspectType, string> = {
  conjunction: 'conjunction',
  sextile: 'sextile',
  square: 'square',
  trine: 'trine',
  opposition: 'opposition',
};

const PLANET_NAMES_VI: Record<string, string> = {
  Sun: 'Mặt Trời',
  Moon: 'Mặt Trăng',
  Mercury: 'Sao Thủy',
  Venus: 'Sao Kim',
  Mars: 'Sao Hỏa',
  Jupiter: 'Sao Mộc',
  Saturn: 'Sao Thổ',
  Uranus: 'Thiên Vương',
  Neptune: 'Hải Vương',
  Pluto: 'Diêm Vương',
};

const METRIC_ADVICE: Record<DailyAstroMetricId, { vi: string; en: string }> = {
  energy: {
    vi: 'điều chỉnh nhịp hành động và sức bền',
    en: 'pace your actions and physical energy',
  },
  emotion: {
    vi: 'quan sát cảm xúc trước khi phản ứng',
    en: 'notice your feelings before reacting',
  },
  focus: {
    vi: 'ưu tiên việc cần sự rõ ràng và tập trung',
    en: 'prioritize work that needs clarity and focus',
  },
  connection: {
    vi: 'chú ý cách bạn trao đổi và đón nhận người khác',
    en: 'be mindful of how you connect and receive others',
  },
};

function round(value: number, places = 4): number {
  return Number(value.toFixed(places));
}

function localDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function makeDailySamples(date: Date): Date[] {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const samples = Array.from({ length: 24 }, (_, hour) => {
    const sample = new Date(start);
    sample.setHours(hour, 0, 0, 0);
    return sample;
  });
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  samples.push(end);
  return samples;
}

function findDailyAspectPeaks(
  natalPlanets: Array<Pick<PlanetPosition, 'name' | 'longitude'>>,
  date: Date,
): DailyAspectPeak[] {
  const peaks = new Map<string, DailyAspectPeak>();

  for (const sample of makeDailySamples(date)) {
    const transitChart = computeTransitChart(sample);
    for (const transit of transitChart.planetList) {
      for (const natal of natalPlanets) {
        const angle = getShortestAngleDiff(transit.longitude, natal.longitude);
        for (const aspect of MAJOR_ASPECTS) {
          const orb = Math.abs(angle - aspect.targetAngle);
          if (orb > DAILY_METRIC_MAX_ORB) continue;
          const key = `${transit.name}|${natal.name}|${aspect.type}`;
          const previous = peaks.get(key);
          if (previous && previous.orb <= orb) continue;
          peaks.set(key, {
            transitPlanet: transit.name,
            natalPlanet: natal.name,
            aspectType: aspect.type,
            aspectNameVi: aspect.nameVi,
            symbol: aspect.symbol,
            orb,
            peakTime: sample,
            baseWeight: aspect.baseWeight,
          });
        }
      }
    }
  }

  return [...peaks.values()];
}

/**
 * Assign one aspect to at most two human-facing metrics. When both ends carry
 * different personal-planet meanings, the moving planet gets 60% and the
 * natal target gets 40%. Unknown birth time only reduces the natal-Moon part.
 */
export function getDailyMetricAssignments(
  transitPlanet: string,
  natalPlanet: string,
  isNatalTimeEstimated = false,
): DailyMetricAssignment[] {
  const transitMetric = PLANET_METRIC[transitPlanet];
  const natalMetric = PLANET_METRIC[natalPlanet];
  const natalReliability = isNatalTimeEstimated && natalPlanet === 'Moon' ? 0.65 : 1;

  if (!transitMetric && !natalMetric) return [];
  if (transitMetric && !natalMetric) return [{ metric: transitMetric, weight: 1 }];
  if (!transitMetric && natalMetric) return [{ metric: natalMetric, weight: natalReliability }];
  if (transitMetric === natalMetric) {
    return [{ metric: transitMetric!, weight: 0.6 + 0.4 * natalReliability }];
  }
  return [
    { metric: transitMetric!, weight: 0.6 },
    { metric: natalMetric!, weight: 0.4 * natalReliability },
  ];
}

export function calculateDailyMetricScore(contributions: number[]): number {
  const net = contributions.slice(0, 3).reduce((sum, value) => sum + value, 0);
  return Math.round(Math.max(15, Math.min(85, 50 + 35 * Math.tanh(net / 1.5))));
}

function directionFor(type: AspectType): DailyAstroMetricDirection {
  const polarity = ASPECT_POLARITY[type];
  if (polarity > 0) return 'support';
  if (polarity < 0) return 'challenge';
  return 'neutral';
}

function levelFor(score: number): DailyAstroMetricLevel {
  if (score < 40) return 'low';
  if (score >= 60) return 'high';
  return 'balanced';
}

function planetName(name: string, locale: AppLocale): string {
  return locale === 'vi' ? PLANET_NAMES_VI[name] ?? name : name;
}

function evidenceLabel(evidence: DailyAstroMetricEvidence, locale: AppLocale): string {
  const aspectName = locale === 'vi'
    ? evidence.aspectName
    : ASPECT_NAMES_EN[evidence.aspectType];
  return `${planetName(evidence.transitPlanet, locale)} ${aspectName} ${planetName(evidence.natalPlanet, locale)}`;
}

function makeSummary(
  metric: DailyAstroMetricId,
  score: number,
  evidence: DailyAstroMetricEvidence[],
  locale: AppLocale,
): string {
  const leading = score >= 60
    ? evidence.find((item) => item.direction === 'support') ?? evidence[0]
    : score < 40
      ? evidence.find((item) => item.direction === 'challenge') ?? evidence[0]
      : evidence[0];
  if (!leading) {
    return locale === 'vi'
      ? 'Không có góc chiếu sát nào nổi bật; nhịp hôm nay tương đối cân bằng.'
      : 'No close aspect stands out; today has a relatively balanced rhythm.';
  }
  const label = evidenceLabel(leading, locale);
  const advice = METRIC_ADVICE[metric][locale];
  if (score >= 60) {
    return locale === 'vi'
      ? `${label} tạo nhịp hỗ trợ; thuận để ${advice}.`
      : `${label} offers support; this is a good time to ${advice}.`;
  }
  if (score < 40) {
    return locale === 'vi'
      ? `${label} tạo lực cản; nên chậm lại để ${advice}.`
      : `${label} creates friction; slow down and ${advice}.`;
  }
  if (leading.direction === 'neutral') {
    return locale === 'vi'
      ? `${label} đang hội tụ; hãy ${advice} thay vì vội kết luận tốt hay xấu.`
      : `${label} is concentrating energy; ${advice} before judging it as positive or negative.`;
  }
  return locale === 'vi'
    ? `${label} là tín hiệu rõ nhất nhưng chưa đủ mạnh để lệch khỏi trạng thái cân bằng.`
    : `${label} is the clearest signal, but not strong enough to move the day out of balance.`;
}

function emptyEvidenceMap(): Record<DailyAstroMetricId, DailyAstroMetricEvidence[]> {
  return {
    energy: [],
    emotion: [],
    focus: [],
    connection: [],
  };
}

function buildMetricsFromNatalPlanets(
  natalPlanets: Array<Pick<PlanetPosition, 'name' | 'longitude'>>,
  isNatalTimeEstimated: boolean,
  date = new Date(),
  locale: AppLocale = 'vi',
): DailyAstroMetrics {
  const evidenceByMetric = emptyEvidenceMap();
  const peaks = findDailyAspectPeaks(natalPlanets, date);

  for (const peak of peaks) {
    const proximity = Math.max(0, 1 - peak.orb / DAILY_METRIC_MAX_ORB);
    const transitWeight = TRANSIT_WEIGHTS[peak.transitPlanet] ?? 0.4;
    const strength = peak.baseWeight * proximity * transitWeight;
    const polarity = ASPECT_POLARITY[peak.aspectType];
    const assignments = getDailyMetricAssignments(
      peak.transitPlanet,
      peak.natalPlanet,
      isNatalTimeEstimated,
    );

    for (const assignment of assignments) {
      const assignedStrength = strength * assignment.weight;
      evidenceByMetric[assignment.metric].push({
        transitPlanet: peak.transitPlanet,
        natalPlanet: peak.natalPlanet,
        aspectType: peak.aspectType,
        aspectName: locale === 'vi' ? peak.aspectNameVi : ASPECT_NAMES_EN[peak.aspectType],
        symbol: peak.symbol,
        orb: round(peak.orb, 2),
        peakTimeIso: peak.peakTime.toISOString(),
        direction: directionFor(peak.aspectType),
        strength: round(assignedStrength),
        contribution: round(assignedStrength * polarity),
      });
    }
  }

  const metrics = Object.fromEntries(METRIC_IDS.map((id) => {
    const rankedEvidence = evidenceByMetric[id]
      .sort((left, right) => right.strength - left.strength || left.orb - right.orb);
    const evidence = rankedEvidence.slice(0, 3);
    const scoreContributions = rankedEvidence
      .filter((item) => item.direction !== 'neutral')
      .sort((left, right) => Math.abs(right.contribution) - Math.abs(left.contribution))
      .slice(0, 3)
      .map((item) => item.contribution);
    const score = calculateDailyMetricScore(scoreContributions);
    const metric: DailyAstroMetric = {
      id,
      score,
      level: levelFor(score),
      summary: makeSummary(id, score, evidence, locale),
      evidence,
    };
    return [id, metric];
  })) as Record<DailyAstroMetricId, DailyAstroMetric>;

  return {
    version: DAILY_ASTRO_METRICS_VERSION,
    dateKey: localDateKey(date),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Bangkok',
    confidence: isNatalTimeEstimated ? 'estimated' : 'full',
    metrics,
  };
}

export function buildDailyAstroMetricsFromMetadata(
  metadata: PureAstroFeatureMetadata,
  date = new Date(),
  locale: AppLocale = 'vi',
): DailyAstroMetrics {
  return buildMetricsFromNatalPlanets(
    metadata.natalPlanets,
    metadata.birthDataPrecision !== 'complete',
    date,
    locale,
  );
}

export function buildDailyAstroMetrics(
  profile: UserProfile,
  date = new Date(),
  locale: AppLocale = 'vi',
): DailyAstroMetrics {
  const natalSnapshot = makeNatalSnapshot({
    birthDate: profile.birthDate,
    birthTime: profile.birthTime,
    birthTimeAccuracy: profile.birthTimeAccuracy,
    resolvedBirthLocation: profile.birthLocation,
  });
  return buildMetricsFromNatalPlanets(
    natalSnapshot.chart.planetList,
    natalSnapshot.context?.precision !== 'complete',
    date,
    locale,
  );
}
