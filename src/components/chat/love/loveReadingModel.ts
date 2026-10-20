import {
  computePersonTuViBazi,
  evaluateTuViBaziLove,
  type TuViBaziSynastryResult,
} from '../../../services/tuViBaziService';

export type LoveReadingProfile = {
  id?: string;
  fullName: string;
  birthDate?: string;
  gender?: 'male' | 'female';
};

export type LoveReadingViewModel = {
  profileA: LoveReadingProfile;
  profileB: LoveReadingProfile;
  compatibilityScore?: number;
  question?: string;
  summary?: string;
  advice?: string;
  answer: string;
  thoughtProcess?: string;
  tuViBazi?: TuViBaziSynastryResult;
};

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const asNonEmptyString = (value: unknown): string | undefined => (
  typeof value === 'string' && value.trim() ? value.trim() : undefined
);

const asProfile = (value: unknown): LoveReadingProfile | undefined => {
  if (!isRecord(value)) return undefined;
  const fullName = asNonEmptyString(value.fullName);
  if (!fullName) return undefined;

  return {
    id: asNonEmptyString(value.id),
    fullName,
    birthDate: asNonEmptyString(value.birthDate),
    gender: value.gender === 'male' || value.gender === 'female' ? value.gender : undefined,
  };
};

const asScore = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(100, Math.round(value)));
};

export function getLoveReadingViewModel(
  card: unknown,
  answer: string,
  fallbackQuestion?: string,
): LoveReadingViewModel | null {
  if (!isRecord(card)) return null;

  const decision = isRecord(card.decision) ? card.decision : undefined;
  const profiles = Array.isArray(card.profiles)
    ? card.profiles.map(asProfile).filter((profile): profile is LoveReadingProfile => !!profile)
    : [];
  const rawTuViBazi = isRecord(card.tuViBazi)
    ? card.tuViBazi
    : isRecord(card.baziResult)
      ? card.baziResult
      : undefined;

  const rawPersonA = asProfile(rawTuViBazi?.personA);
  const rawPersonB = asProfile(rawTuViBazi?.personB);
  const personA = rawPersonA
    ? { ...rawPersonA, ...(profiles[0] ? { ...profiles[0], fullName: rawPersonA.fullName } : {}) }
    : profiles[0];
  const personB = rawPersonB
    ? { ...rawPersonB, ...(profiles[1] ? { ...profiles[1], fullName: rawPersonB.fullName } : {}) }
    : profiles[1];
  const isCompatibility = decision?.mode === 'compatibility'
    || (profiles.length >= 2 && !!rawTuViBazi)
    || (!!personA && !!personB && typeof rawTuViBazi?.compatibilityScore === 'number');

  if (!isCompatibility || !personA || !personB) return null;

  let resolvedTuViBazi: TuViBaziSynastryResult | undefined;
  if (rawTuViBazi && isRecord(rawTuViBazi.spousalInteraction) && isRecord(rawTuViBazi.cungPhiBatTrach)) {
    resolvedTuViBazi = rawTuViBazi as unknown as TuViBaziSynastryResult;
  } else if (personA.birthDate && personB.birthDate) {
    try {
      const chartA = computePersonTuViBazi(personA.fullName, personA.birthDate, personA.gender || 'female');
      const chartB = computePersonTuViBazi(personB.fullName, personB.birthDate, personB.gender || 'male');
      resolvedTuViBazi = evaluateTuViBaziLove(chartA, chartB);
    } catch {
      // Gracefully continue without recomputed chart
    }
  }

  const score = asScore(resolvedTuViBazi?.compatibilityScore)
    ?? asScore(rawTuViBazi?.compatibilityScore)
    ?? asScore(card.compatibilityScore);

  return {
    profileA: personA,
    profileB: personB,
    compatibilityScore: score,
    question: asNonEmptyString(card.questionText) || asNonEmptyString(fallbackQuestion),
    summary: asNonEmptyString(resolvedTuViBazi?.summaryVi) || asNonEmptyString(rawTuViBazi?.summaryVi),
    advice: asNonEmptyString(resolvedTuViBazi?.adviceVi) || asNonEmptyString(rawTuViBazi?.adviceVi),
    answer: answer.trim(),
    thoughtProcess: asNonEmptyString(decision?.thoughtProcess),
    tuViBazi: resolvedTuViBazi,
  };
}
