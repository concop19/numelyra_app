import type { PureAstroFeatureMetadata } from './astroVectorEngine';
import type { AstrologyRuleTopic } from './astrologyRuleEvaluator';

export interface AstrologyCaDaoMatchPlan {
  categories: string[];
  keywords: string[];
  reason: string;
  seed: string;
}

export interface AstrologyCaDaoContext {
  dominantSignal?: PureAstroFeatureMetadata['dominantSignal'];
  temperament?: Pick<PureAstroFeatureMetadata['temperament'], 'dominantElement'>;
  transitMoonSign?: string;
  topAspect?: Pick<NonNullable<PureAstroFeatureMetadata['topAspect']>, 'transitPlanet' | 'natalPlanet' | 'type'> | null;
  dailyContext?: {
    activatedHouses: Array<{ house: number }>;
  } | null;
  ruleEvaluation?: {
    topTopics: Array<Pick<AstrologyRuleTopic, 'topicId' | 'title' | 'supportingThemes'>>;
  } | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  'Tình yêu đôi lứa': 'tình cảm và kết nối',
  'Tình cảm gia đình, bạn bè': 'gia đình và sự gần gũi',
  'Lao động sản xuất': 'công việc và sự bền bỉ',
  'Trào phúng, phê phán đả kích': 'góc nhìn tự trào',
  'Đấu tranh, phản kháng': 'ranh giới và nghị lực',
  'Than thân trách phận': 'những điều đang nặng lòng',
  'Quan hệ thiên nhiên': 'nhịp sống và thiên nhiên',
  'Quê hương đất nước': 'hành trình và nơi chốn',
  'Vũ trụ, con người và xã hội': 'thế sự và cách ứng xử',
};

function addScore(scores: Map<string, number>, key: string, weight: number): void {
  scores.set(key, (scores.get(key) ?? 0) + weight);
}

function addKeywords(scores: Map<string, number>, words: string[], weight = 1): void {
  for (const word of words) addScore(scores, word, weight);
}

function includesAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}

export function buildAstrologyCaDaoMatchPlan(
  metadata?: AstrologyCaDaoContext
): AstrologyCaDaoMatchPlan {
  const categoryScores = new Map<string, number>([
    ['Vũ trụ, con người và xã hội', 2],
    ['Quan hệ thiên nhiên', 1],
  ]);
  const keywordScores = new Map<string, number>();
  const conceptScores = new Map<string, number>();
  const topics = metadata?.ruleEvaluation?.topTopics.slice(0, 3) ?? [];
  const dailySignals = [
    metadata?.topAspect?.transitPlanet,
    metadata?.topAspect?.natalPlanet,
    metadata?.topAspect ? `aspect_${metadata.topAspect.type}` : '',
    metadata?.transitMoonSign ? `sign_${metadata.transitMoonSign.toLowerCase()}` : '',
    ...(metadata?.dailyContext?.activatedHouses.map((item) => `house_${item.house}`) ?? []),
  ];
  const topicText = [...topics.map((topic) => [
    topic.topicId,
    topic.title,
    ...topic.supportingThemes,
  ].join(' ')), ...dailySignals].join(' ').toLocaleLowerCase('vi-VN');

  const addConcept = (category: string, weight: number, keywords: string[]) => {
    addScore(categoryScores, category, weight);
    addKeywords(keywordScores, keywords, weight);
    addScore(conceptScores, CATEGORY_LABELS[category], weight);
  };

  if (metadata?.dominantSignal === 'harmony') {
    addConcept('Tình cảm gia đình, bạn bè', 2, ['thương', 'lòng', 'nhà', 'bạn']);
    addConcept('Tình yêu đôi lứa', 1, ['duyên', 'tình', 'nhớ']);
  } else if (metadata?.dominantSignal === 'tension') {
    addConcept('Trào phúng, phê phán đả kích', 2, ['cười', 'lo', 'lời']);
    addConcept('Đấu tranh, phản kháng', 1, ['khó', 'sức', 'đường']);
  } else if (metadata?.dominantSignal === 'conjunction') {
    addConcept('Vũ trụ, con người và xã hội', 2, ['gặp', 'cùng', 'đời']);
  } else {
    addConcept('Quan hệ thiên nhiên', 2, ['trăng', 'gió', 'nước', 'mây']);
  }

  if (includesAny(topicText, ['venus', 'house_5', 'house_7', 'libra', 'taurus'])) {
    addConcept('Tình yêu đôi lứa', 5, ['tình', 'duyên', 'thương', 'nhớ', 'lòng']);
  }
  if (includesAny(topicText, ['moon', 'house_4', 'cancer'])) {
    addConcept('Tình cảm gia đình, bạn bè', 5, ['mẹ', 'cha', 'con', 'nhà', 'ru']);
  }
  if (includesAny(topicText, ['mercury', 'house_3', 'gemini', 'virgo'])) {
    addConcept('Vũ trụ, con người và xã hội', 4, ['lời', 'nói', 'học', 'khôn', 'người']);
  }
  if (includesAny(topicText, ['mars', 'saturn', 'house_6', 'house_10', 'aries', 'capricorn'])) {
    addConcept('Lao động sản xuất', 4, ['công', 'việc', 'làm', 'khó', 'bền']);
  }
  if (includesAny(topicText, ['jupiter', 'house_9', 'sagittarius'])) {
    addConcept('Quê hương đất nước', 3, ['đi', 'đường', 'học', 'quê', 'trời']);
  }
  if (includesAny(topicText, ['uranus', 'house_11', 'aquarius'])) {
    addConcept('Vũ trụ, con người và xã hội', 3, ['bạn', 'người', 'đời', 'mới']);
  }
  if (includesAny(topicText, ['neptune', 'pisces', 'house_12'])) {
    addConcept('Quan hệ thiên nhiên', 4, ['trăng', 'nước', 'mây', 'mơ', 'đêm']);
  }
  if (includesAny(topicText, ['pluto', 'scorpio', 'house_8'])) {
    addConcept('Đấu tranh, phản kháng', 3, ['lòng', 'sâu', 'khó', 'đổi']);
  }
  if (includesAny(topicText, ['element_', 'temperament.', 'earth', 'air', 'fire', 'water'])) {
    addConcept('Quan hệ thiên nhiên', 3, ['đất', 'nước', 'gió', 'lửa', 'trời']);
  }
  if (includesAny(topicText, ['aspect_square', 'aspect_opposition'])) {
    addConcept('Trào phúng, phê phán đả kích', 3, ['cười', 'lo', 'khó', 'đời']);
  }
  if (includesAny(topicText, ['aspect_trine', 'aspect_sextile'])) {
    addConcept('Tình cảm gia đình, bạn bè', 2, ['thương', 'bạn', 'lòng', 'vui']);
  }

  const categories = Array.from(categoryScores.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'vi'))
    .slice(0, 3)
    .map(([category]) => category);
  const keywords = Array.from(keywordScores.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'vi'))
    .slice(0, 10)
    .map(([keyword]) => keyword);
  const concepts = Array.from(conceptScores.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'vi'))
    .slice(0, 2)
    .map(([concept]) => concept);
  const seedParts = [
    metadata?.dominantSignal ?? 'balanced',
    metadata?.temperament?.dominantElement ?? 'unknown-element',
    metadata?.transitMoonSign ?? 'unknown-transit-moon',
    metadata?.topAspect
      ? `${metadata.topAspect.transitPlanet}.${metadata.topAspect.type}.${metadata.topAspect.natalPlanet}`
      : 'no-top-aspect',
    ...(metadata?.dailyContext?.activatedHouses.map((item) => `house-${item.house}`) ?? []),
    ...topics.map((topic) => topic.topicId),
  ];

  return {
    categories,
    keywords,
    reason: `Chọn theo ${concepts.join(' và ')} trong luận giải hôm nay.`,
    seed: seedParts.join('|'),
  };
}
