/**
 * Detailed readings from the bundled, reviewed bilingual knowledge catalog.
 * Computed chart overviews and unavailable readings have explicit provenance.
 */

import {
  fetchNumerologyKnowledgeRows,
  type NumerologyKnowledgeDbRow,
} from '../db/numerologyKnowledgeService';
import {
  getArrowKnowledgeValue,
  getKnowledgeAtoms,
  getMatrixKnowledgeValue,
  getRequiredValues,
} from './numerologyKnowledgeContract';
import { getFrequencyBand, type MatrixReading } from './numerologyMatrixInterpretations';
import type { CalculatedIndicator } from './numerologyEngine';
import { translate, type AppLocale } from '../i18n/translations';

export type FallbackReason = 'db-error' | 'missing-row' | 'unsupported-value';

export interface KnowledgeReadingResult {
  title: string;
  source: 'local-sqlite' | 'computed-overview' | 'fallback';
  fallbackReason?: FallbackReason;
  overview: string;
  strengths: string[];
  challenges: string[];
  advice: string;
  fullContent?: string;
}

export interface MatrixKnowledgeReading extends MatrixReading {
  source: 'local-sqlite' | 'fallback';
  fallbackReason?: FallbackReason;
}

export type MatrixKnowledgeBundle = Record<string, MatrixKnowledgeReading>;

interface MarkdownSection {
  heading: string;
  body: string;
}

function stripMarkdown(value: string): string {
  return value
    .replace(/\r/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractMarkdownSections(content: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  let heading = '';
  let bodyLines: string[] = [];

  const flush = () => {
    const body = bodyLines.join('\n').trim();
    if (body) sections.push({ heading, body });
  };

  for (const rawLine of content.replace(/\r/g, '').split('\n')) {
    const headingMatch = rawLine.trim().match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
      flush();
      heading = headingMatch[1].trim();
      bodyLines = [];
    } else {
      bodyLines.push(rawLine);
    }
  }
  flush();

  return sections;
}

function headingContains(heading: string, keywords: string[]): boolean {
  const normalized = heading.toLocaleUpperCase('vi-VN');
  return keywords.some((keyword) => normalized.includes(keyword));
}

function sectionItems(section: MarkdownSection): string[] {
  const listItems = section.body
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^(?:[-*•]|\d+\.)\s+/.test(line))
    .map((line) => stripMarkdown(line.replace(/^(?:[-*•]|\d+\.)\s+/, '')))
    .filter(Boolean);

  return listItems.length > 0 ? listItems : [stripMarkdown(section.body)].filter(Boolean);
}

function parseKnowledgeMarkdown(
  content: string,
  titleFallback: string,
  locale: AppLocale = 'vi',
): KnowledgeReadingResult {
  const lines = content.split('\n');
  const strengths: string[] = [];
  const challenges: string[] = [];
  let currentSection = '';
  let overviewText = '';
  let adviceText = '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const upperLine = line.toLocaleUpperCase('vi-VN');
    const isSectionMarker = line.startsWith('#') || line.endsWith(':') || line === upperLine;

    if (isSectionMarker && (
      upperLine.includes('THÁCH THỨC') || upperLine.includes('BÓNG TỐI') || upperLine.includes('CẠM BẪY') || upperLine.includes('ĐIỂM YẾU') ||
      upperLine.includes('CHALLENGES') || upperLine.includes('CHALLENGE') || upperLine.includes('BLIND SPOT') || upperLine.includes('SHADOW') ||
      upperLine.includes('PITFALL') || upperLine.includes('WEAKNESS') || upperLine.includes('OBSTACLE') || upperLine.includes('RISK')
    )) {
      currentSection = 'challenges';
      continue;
    } else if (isSectionMarker && (
      upperLine.includes('ĐIỂM MẠNH') || upperLine.includes('ƯU ĐIỂM') || upperLine.includes('NĂNG LỰC') ||
      upperLine.includes('STRENGTHS') || upperLine.includes('STRENGTH') || upperLine.includes('TALENT') || upperLine.includes('GIFT') || upperLine.includes('ADVANTAGE')
    )) {
      currentSection = 'strengths';
      continue;
    } else if (isSectionMarker && (
      upperLine.includes('LỜI KHUYÊN') || upperLine.includes('HÀNH ĐỘNG') || upperLine.includes('BÀI HỌC') ||
      upperLine.includes('GUIDANCE') || upperLine.includes('ADVICE') || upperLine.includes('NEXT STEP') || upperLine.includes('ACTION') ||
      upperLine.includes('LESSON') || upperLine.includes('RECOMMENDATION')
    )) {
      currentSection = 'advice';
      continue;
    } else if (isSectionMarker && (
      upperLine.includes('BẢN CHẤT') || upperLine.includes('TỔNG QUAN') || upperLine.includes('Ý NGHĨA') ||
      upperLine.includes('OVERVIEW') || upperLine.includes('CORE NATURE') || upperLine.includes('ENERGY') ||
      upperLine.includes('SUMMARY') || upperLine.includes('ESSENCE')
    )) {
      currentSection = 'overview';
      continue;
    }

    if (currentSection === 'overview' && !overviewText) {
      if (!line.startsWith('#')) overviewText = line.replace(/^\*+\s*/, '');
    } else if (currentSection === 'strengths') {
      if (line.startsWith('-') || line.startsWith('*') || line.startsWith('•')) {
        strengths.push(line.replace(/^[-*•]\s*/, ''));
      }
    } else if (currentSection === 'challenges') {
      if (line.startsWith('-') || line.startsWith('*') || line.startsWith('•')) {
        challenges.push(line.replace(/^[-*•]\s*/, ''));
      }
    } else if (currentSection === 'advice' && !adviceText) {
      if (!line.startsWith('#')) adviceText = line.replace(/^\*+\s*/, '');
    }
  }

  // The bundled library contains long-form articles whose headings are tailored
  // to each indicator instead of using one fixed template. Recover their semantic
  // sections so the detailed UI does not discard content that is present in SQLite.
  const sections = extractMarkdownSections(content);
  const referenceKeywords = [
    'CÂU HỎI TRA CỨU', 'SEMANTIC Q&A', 'HỎI ĐÁP',
    'LOOKUP QUESTIONS', 'FAQS', 'FAQ', 'Q&A', 'REFERENCE',
  ];
  const challengeKeywords = [
    'THÁCH THỨC', 'BÓNG TỐI', 'CẠM BẪY', 'ĐIỂM YẾU', 'KHỦNG HOẢNG', 'TIÊU CỰC', 'CẦN TRÁNH', 'RỦI RO', 'TRỞ NGẠI', 'STRESS',
    'CHALLENGES', 'CHALLENGE', 'POTENTIAL BLIND SPOTS', 'BLIND SPOTS', 'BLIND SPOT', 'SHADOW', 'PITFALLS', 'PITFALL', 'WEAKNESSES', 'WEAKNESS', 'RISKS', 'OBSTACLES', 'GROWTH AREAS',
  ];
  const strengthKeywords = [
    'ĐIỂM MẠNH', 'ƯU ĐIỂM', 'NĂNG LỰC', 'SỨC MẠNH', 'TIỀM NĂNG', 'MỎ NEO', 'TẦM ẢNH HƯỞNG', 'CƠ HỘI',
    'STRENGTHS', 'STRENGTH', 'NATURAL STRENGTHS', 'TALENTS', 'TALENT', 'GIFTS', 'GIFT', 'ADVANTAGES', 'OPPORTUNITIES',
  ];
  const adviceKeywords = [
    'LỜI KHUYÊN', 'HÀNH ĐỘNG', 'BÀI HỌC', 'CHIẾN LƯỢC', 'KỸ THUẬT', 'GIẢI PHÁP', 'ĐỊNH TÂM', 'CHUẨN BỊ', 'PHÁT TRIỂN',
    'GUIDANCE', 'ADVICE', 'NEXT STEP', 'NEXT STEPS', 'ACTION', 'ACTIONS', 'ACTIONABLE', 'LESSON', 'LESSONS', 'STRATEGY', 'SOLUTION', 'SOLUTIONS', 'RECOMMENDATIONS', 'RECOMMENDATION', 'DEVELOPMENT',
  ];
  const semanticSections = sections.filter((section) => !headingContains(section.heading, referenceKeywords));

  // Long-form rows consistently lead with their primary interpretation, even
  // when that heading contains words such as "khủng hoảng" for context.
  const overviewSection = semanticSections[0];
  const sectionOverview = overviewSection ? stripMarkdown(overviewSection.body) : '';
  if (sectionOverview.length > stripMarkdown(overviewText).length) {
    overviewText = sectionOverview;
  }

  if (strengths.length === 0) {
    strengths.push(...semanticSections
      .filter((section) => headingContains(section.heading, strengthKeywords))
      .flatMap(sectionItems)
      .slice(0, 3));
  }

  if (challenges.length === 0) {
    challenges.push(...semanticSections
      .filter((section) => headingContains(section.heading, challengeKeywords))
      .flatMap(sectionItems)
      .slice(0, 2));
  }

  const adviceSections = semanticSections.filter((section) => headingContains(section.heading, adviceKeywords));
  const preferredAdvice = adviceSections.find((section) => headingContains(section.heading, ['LỜI KHUYÊN', 'GUIDANCE', 'ADVICE', 'RECOMMENDATION', 'NEXT STEP']))
    || adviceSections[adviceSections.length - 1];
  const sectionAdvice = preferredAdvice ? stripMarkdown(preferredAdvice.body) : '';
  if (sectionAdvice.length > stripMarkdown(adviceText).length) {
    adviceText = sectionAdvice;
  }

  return {
    title: titleFallback,
    source: 'local-sqlite',
    overview: stripMarkdown(overviewText) || `${stripMarkdown(content).slice(0, 260)}...`,
    strengths: strengths.map(stripMarkdown).filter(Boolean).slice(0, 3),
    challenges: challenges.map(stripMarkdown).filter(Boolean).slice(0, 2),
    advice: stripMarkdown(adviceText),
    fullContent: content
  };
}

function combineKnowledgeReadings(
  cardName: string,
  orderedValues: string[],
  rows: NumerologyKnowledgeDbRow[],
  locale: AppLocale = 'vi',
): KnowledgeReadingResult | null {
  const rowsByValue = new Map<string, NumerologyKnowledgeDbRow>();
  for (const row of rows) {
    if (!rowsByValue.has(row.number_value)) rowsByValue.set(row.number_value, row);
  }
  if (!orderedValues.every((value) => rowsByValue.get(value)?.content)) return null;

  const readings = orderedValues.map((value) => {
    const row = rowsByValue.get(value)!;
    return {
      value,
      reading: parseKnowledgeMarkdown(row.content, row.title || `${cardName} ${value}`, locale),
    };
  });

  if (readings.length === 1) return readings[0].reading;

  return {
    title: `${cardName}: ${orderedValues.join(', ')}`,
    source: 'local-sqlite',
    overview: readings.map(({ value, reading }) => `${value} · ${reading.overview}`).join('\n\n'),
    strengths: readings.flatMap(({ value, reading }) =>
      reading.strengths.map((item) => `${value} · ${item}`)
    ),
    challenges: readings.flatMap(({ value, reading }) =>
      reading.challenges.map((item) => `${value} · ${item}`)
    ),
    advice: readings.map(({ value, reading }) => `${value}: ${reading.advice}`).join(' '),
    fullContent: readings
      .map(({ value, reading }) => `## ${value}\n\n${reading.fullContent || reading.overview}`)
      .join('\n\n'),
  };
}

function unavailableReading(
  indicatorKey: string,
  value: string | number,
  cardName: string,
  locale: AppLocale,
  reason: FallbackReason,
): KnowledgeReadingResult {
  console.warn('[numerologyKnowledge]', {
    event: 'reading-fallback', locale, indicator: indicatorKey, value: String(value), reason,
  });
  return {
    title: `${cardName} · ${value}`,
    source: 'fallback',
    fallbackReason: reason,
    overview: translate(locale, 'reading.unavailable'),
    strengths: [],
    challenges: [],
    advice: translate(locale, 'reading.retry'),
  };
}

function toMatrixReading(reading: KnowledgeReadingResult): MatrixKnowledgeReading {
  return {
    source: reading.source === 'local-sqlite' ? 'local-sqlite' : 'fallback',
    ...(reading.fallbackReason ? { fallbackReason: reading.fallbackReason } : {}),
    summary: reading.overview,
    strength: reading.strengths.join(' '),
    challenge: reading.challenges.join(' '),
    advice: reading.advice,
  };
}

export async function getMatrixKnowledgeBundle(
  indicator: CalculatedIndicator,
  locale: AppLocale,
): Promise<MatrixKnowledgeBundle> {
  if (!indicator.chartData) return {};
  const requestedValues = indicator.key === 'arrows'
    ? (indicator.chartData.arrows || []).map((arrow) => getArrowKnowledgeValue(arrow.label, arrow.status))
    : Object.entries(indicator.chartData.counts).map(([digit, count]) =>
      getMatrixKnowledgeValue(Number(digit), getFrequencyBand(count))
    );
  // Arrow cards also show the individual cells of the birth matrix.
  // Those are resolved through a separate birthChart bundle by the component.
  const allowed = new Set(getRequiredValues(indicator.key));
  let rows: NumerologyKnowledgeDbRow[] = [];
  let dbFailed = false;
  const supportedValues = requestedValues.filter((value) => allowed.has(value));
  if (supportedValues.length) {
    try {
      rows = await fetchNumerologyKnowledgeRows(indicator.key, supportedValues, locale);
    } catch {
      dbFailed = true;
    }
  }
  const byValue = new Map(rows.filter((row) =>
    row.locale === locale && row.indicator_key === indicator.key && row.review_status === 'approved' && row.content.trim()
  ).map((row) => [row.number_value, row]));
  const bundle: MatrixKnowledgeBundle = {};
  for (const value of requestedValues) {
    const row = byValue.get(value);
    const name = locale === 'en' ? indicator.nameEn : indicator.nameVi;
    const reason: FallbackReason = !allowed.has(value) ? 'unsupported-value' : dbFailed ? 'db-error' : 'missing-row';
    bundle[value] = toMatrixReading(row
      ? parseKnowledgeMarkdown(row.content, row.title || `${name} ${value}`, locale)
      : unavailableReading(indicator.key, value, name, locale, reason));
  }
  return bundle;
}

export async function getIndicatorReading(
  indicatorKey: string,
  indicatorValue: string | number,
  cardName: string,
  locale: AppLocale,
): Promise<KnowledgeReadingResult> {
  const valStr = String(indicatorValue).trim();

  // Matrix cell/state readings are loaded separately in one batch. The overview remains local.
  if (indicatorKey === 'nameChart' || indicatorKey === 'birthChart' || indicatorKey === 'arrows') {
    const chartTitle = locale === 'en'
      ? indicatorKey === 'nameChart' ? 'Name chart' : indicatorKey === 'birthChart' ? 'Birth chart' : 'Arrows of Individuality'
      : indicatorKey === 'nameChart' ? 'Biểu đồ tên' : indicatorKey === 'birthChart' ? 'Biểu đồ ngày sinh' : '8 mũi tên cá tính';
    const chartOverview = locale === 'en'
      ? indicatorKey === 'nameChart'
        ? 'This matrix shows the frequency of numbers converted from letters in the full name. Every profile may have a different distribution.'
        : indicatorKey === 'birthChart'
          ? 'This matrix shows how often each non-zero digit appears in the date of birth.'
          : 'These states come from the birth chart: complete when all three numbers appear, empty when none appear, and partial when one or two appear.'
      : indicatorKey === 'nameChart'
        ? 'Ma trận cho biết tần suất các con số được quy đổi từ từng chữ cái trong họ tên. Mỗi hồ sơ có thể có phân bố khác nhau.'
        : indicatorKey === 'birthChart'
          ? 'Ma trận cho biết số lần xuất hiện của từng chữ số khác 0 trong ngày, tháng và năm sinh.'
          : 'Các trạng thái bên dưới được tính từ ma trận ngày sinh: đủ bộ khi có cả ba số, trống khi không có số nào, và có một phần khi chỉ có một hoặc hai số.';

    return {
      title: `${cardName}: ${chartTitle}`,
      source: 'computed-overview',
      overview: `${chartOverview} ${locale === 'en' ? 'Profile data' : 'Dữ liệu riêng của hồ sơ'}: ${valStr}.`,
      strengths: [],
      challenges: [],
      advice: locale === 'en'
        ? 'Read the matrix and each number frequency above to interpret this profile’s actual data.'
        : 'Đọc ma trận và tần suất từng số ở phần trên để xem dữ liệu riêng của hồ sơ này.',
    };
  }

  const orderedValues = getKnowledgeAtoms(indicatorKey, indicatorValue).map((atom) => atom.numberValue);
  const allowed = new Set(getRequiredValues(indicatorKey));
  if (!orderedValues.length || orderedValues.some((value) => !allowed.has(value))) {
    return unavailableReading(indicatorKey, indicatorValue, cardName, locale, 'unsupported-value');
  }
  try {
    const rows = await fetchNumerologyKnowledgeRows(indicatorKey, orderedValues, locale);
    const approvedRows = rows.filter((row) =>
      row.locale === locale && row.indicator_key === indicatorKey && row.review_status === 'approved'
    );
    const combined = combineKnowledgeReadings(cardName, orderedValues, approvedRows, locale);
    if (combined) return combined;
  } catch {
    return unavailableReading(indicatorKey, indicatorValue, cardName, locale, 'db-error');
  }
  return unavailableReading(indicatorKey, indicatorValue, cardName, locale, 'missing-row');
}
